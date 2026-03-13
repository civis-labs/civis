'use server';

import crypto from 'crypto';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeString } from '@/lib/sanitize';
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

function validateTag(tag: string | null): { cleanTag: string | null; error?: string } {
  if (!tag) return { cleanTag: null };
  const trimmed = sanitizeString(tag.trim());
  if (!trimmed) return { cleanTag: null };
  if (trimmed.length > 15) return { cleanTag: null, error: 'Tag must be 15 characters or less' };
  if (profanityMatcher.hasMatch(trimmed)) return { cleanTag: null, error: 'Tag contains inappropriate language.' };
  return { cleanTag: trimmed };
}

// =============================================
// Types
// =============================================

export type MintResult = {
  apiKey?: string;
  agentName?: string;
  tag?: string;
  error?: string;
};

export type GenerateKeyResult = {
  apiKey?: string;
  agentName?: string;
  tag?: string;
  error?: string;
};

export type RevokeResult = {
  error?: string;
};

export type RejectCitationResult = {
  error?: string;
};

export type UpdateBioResult = {
  error?: string;
};

// =============================================
// MINT PASSPORT
// Creates agent_entity + generates first API key
// =============================================

export async function mintPassport(
  name: string,
  bio: string | null,
  tag: string | null = null
): Promise<MintResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Citation-based passport limit check
  const serviceClientForCount = createSupabaseServiceClient();
  const { count: agentCount } = await supabase
    .from('agent_entities')
    .select('*', { count: 'exact', head: true })
    .eq('developer_id', user.id);

  const { data: citationCount } = await serviceClientForCount.rpc(
    'get_developer_inbound_citation_count',
    { p_developer_id: user.id }
  );
  const maxAllowed = (citationCount ?? 0) >= 1 ? 5 : 3;
  if ((agentCount ?? 0) >= maxAllowed) {
    return { error: 'Earn citations from other developers to unlock additional passport slots.' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Agent name is required' };
  if (trimmedName.length > 100)
    return { error: 'Agent name must be 100 characters or less' };

  // Sanitize name and bio to strip HTML
  const cleanName = sanitizeString(trimmedName);
  if (!cleanName) return { error: 'Agent name is required' };
  const cleanBio = bio ? sanitizeString(bio.trim()) : null;

  if (profanityMatcher.hasMatch(cleanName)) {
    return { error: 'Agent name contains inappropriate language.' };
  }

  if (cleanBio && cleanBio.length > 500) {
    return { error: 'Bio must be 500 characters or less' };
  }

  if (cleanBio && profanityMatcher.hasMatch(cleanBio)) {
    return { error: 'Agent bio contains inappropriate language.' };
  }

  // Validate optional tag early (before creating agent entity)
  const { cleanTag, error: tagError } = validateTag(tag);
  if (tagError) return { error: tagError };

  // Check for duplicate name under the same developer
  const { data: existing } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('developer_id', user.id)
    .eq('name', cleanName)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: 'You already have an agent with that name.' };
  }

  // Insert agent entity
  // Uses authenticated client — RLS allows INSERT when developer_id = auth.uid()
  const { data: agent, error: agentError } = await supabase
    .from('agent_entities')
    .insert({
      developer_id: user.id,
      name: cleanName,
      bio: cleanBio || null,
    })
    .select('id, name')
    .single();

  if (agentError) {
    console.error('Failed to create passport:', agentError);
    return { error: 'Failed to create passport. Please try again.' };
  }

  // Generate cryptographically random API key (server-side only)
  const rawKey = crypto.randomBytes(32).toString('hex');
  // Hash with SHA-256 (appropriate for high-entropy API keys, NOT bcrypt)
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  // Store hashed key via service role (agent_credentials has no RLS for authenticated users)
  const serviceClient = createSupabaseServiceClient();
  const { error: credError } = await serviceClient
    .from('agent_credentials')
    .insert({ agent_id: agent.id, hashed_key: hashedKey, tag: cleanTag });

  if (credError) {
    if (credError.code === '23505' && credError.message?.includes('tag')) {
      return { error: 'A key with that tag already exists for this agent.' };
    }
    console.error('Failed to generate API key:', credError);
    return { error: 'Failed to generate API key. Please try again.' };
  }

  revalidatePath('/agents');
  return { apiKey: rawKey, agentName: agent.name, tag: cleanTag || undefined };
}

// =============================================
// REVOKE CREDENTIAL
// Sets is_revoked = true on a credential row
// =============================================

export async function revokeCredential(
  credentialId: string
): Promise<RevokeResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const serviceClient = createSupabaseServiceClient();

  // Get credential to find its agent_id
  const { data: credential } = await serviceClient
    .from('agent_credentials')
    .select('id, agent_id')
    .eq('id', credentialId)
    .single();

  if (!credential) return { error: 'Credential not found' };

  // Verify the agent belongs to this developer via RLS
  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('id', credential.agent_id)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Unauthorized' };

  // Revoke via service role
  const { error: revokeError } = await serviceClient
    .from('agent_credentials')
    .update({ is_revoked: true })
    .eq('id', credentialId);

  if (revokeError) {
    console.error('Failed to revoke credential:', revokeError);
    return { error: 'Failed to revoke credential. Please try again.' };
  }

  revalidatePath('/agents');
  return {};
}

// =============================================
// GENERATE NEW KEY
// Creates a new credential for an existing agent
// (key rotation — old credential remains)
// =============================================

export async function generateNewKey(
  agentId: string,
  tag: string | null = null
): Promise<GenerateKeyResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify the passport belongs to this developer via RLS
  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id, name')
    .eq('id', agentId)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Passport not found or unauthorized' };

  // Enforce max 3 active keys per agent
  const serviceClientCount = createSupabaseServiceClient();
  const { count: activeKeyCount } = await serviceClientCount
    .from('agent_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('is_revoked', false);

  if ((activeKeyCount ?? 0) >= 3) {
    return { error: 'Maximum 3 active API keys per agent. Revoke an existing key first.' };
  }

  // Validate optional tag
  const { cleanTag, error: tagError } = validateTag(tag);
  if (tagError) return { error: tagError };

  // Generate new API key
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  const serviceClient = createSupabaseServiceClient();
  const { error: credError } = await serviceClient
    .from('agent_credentials')
    .insert({ agent_id: agent.id, hashed_key: hashedKey, tag: cleanTag });

  if (credError) {
    if (credError.code === '23505' && credError.message?.includes('tag')) {
      return { error: 'A key with that tag already exists for this agent.' };
    }
    if (credError.message?.includes('Maximum 3 active API keys')) {
      return { error: 'Maximum 3 active API keys per agent. Revoke an existing key first.' };
    }
    console.error('Failed to generate key:', credError);
    return { error: 'Failed to generate key. Please try again.' };
  }

  revalidatePath('/agents');
  return { apiKey: rawKey, agentName: agent.name, tag: cleanTag || undefined };
}

// =============================================
// UPDATE BIO
// Inline bio editing from the developer console
// =============================================

export async function updateBio(
  agentId: string,
  bio: string | null
): Promise<UpdateBioResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify the agent belongs to this developer via RLS
  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('id', agentId)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Agent not found or unauthorized' };

  // Sanitize and validate
  const cleanBio = bio ? sanitizeString(bio.trim()) : null;

  if (cleanBio && cleanBio.length > 500) {
    return { error: 'Bio must be 500 characters or less' };
  }

  if (cleanBio && profanityMatcher.hasMatch(cleanBio)) {
    return { error: 'Bio contains inappropriate language.' };
  }

  // Update via authenticated client (RLS allows UPDATE when developer_id = auth.uid())
  const { error: updateError } = await supabase
    .from('agent_entities')
    .update({ bio: cleanBio || null })
    .eq('id', agentId)
    .eq('developer_id', user.id);

  if (updateError) {
    console.error('Failed to update bio:', updateError);
    return { error: 'Failed to update bio. Please try again.' };
  }

  revalidatePath('/agents');
  return {};
}

// =============================================
// REJECT CITATION
// Session-based auth (not API key) — verifies
// ownership via developer_id on the target agent
// =============================================

export async function rejectCitation(
  citationId: number
): Promise<RejectCitationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const serviceClient = createSupabaseServiceClient();

  // 1. Fetch citation (to get target_agent_id for ownership check)
  const { data: citation } = await serviceClient
    .from('citations')
    .select('id, target_agent_id, type, is_rejected')
    .eq('id', citationId)
    .single();

  if (!citation) return { error: 'Citation not found' };
  if (citation.type !== 'extension')
    return { error: 'Only extension citations can be rejected' };

  // Verify the target agent belongs to this developer via RLS
  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('id', citation.target_agent_id)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Unauthorized' };

  // 2. Atomic conditional update (prevents double-rejection race)
  const { data: updated, error: updateError } = await serviceClient
    .from('citations')
    .update({ is_rejected: true })
    .eq('id', citationId)
    .eq('is_rejected', false)
    .select('id')
    .maybeSingle();

  if (updateError) return { error: 'Failed to reject citation' };
  if (!updated) return { error: 'Citation is already rejected' };

  // 3. Insert audit row (only runs if update succeeded)
  await serviceClient.from('citation_rejections').insert({
    citation_id: citationId,
    agent_id: citation.target_agent_id,
    reason: 'Rejected via developer console',
  });

  revalidatePath('/agents');
  return {};
}
