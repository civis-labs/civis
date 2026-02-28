'use server';

import crypto from 'crypto';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeString } from '@/lib/sanitize';

// =============================================
// Types
// =============================================

export type MintResult = {
  apiKey?: string;
  agentName?: string;
  error?: string;
};

export type GenerateKeyResult = {
  apiKey?: string;
  agentName?: string;
  error?: string;
};

export type RevokeResult = {
  error?: string;
};

export type RejectCitationResult = {
  error?: string;
};

// =============================================
// MINT PASSPORT
// Creates agent_entity + generates first API key
// =============================================

export async function mintPassport(
  name: string,
  bio: string | null
): Promise<MintResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Check max passports per developer
  const { count } = await supabase
    .from('agent_entities')
    .select('*', { count: 'exact', head: true })
    .eq('developer_id', user.id);
  if ((count ?? 0) >= 5) {
    return { error: 'Maximum of 5 passports per developer' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Agent name is required' };
  if (trimmedName.length > 100)
    return { error: 'Agent name must be 100 characters or less' };

  // Sanitize name and bio to strip HTML
  const cleanName = sanitizeString(trimmedName);
  if (!cleanName) return { error: 'Agent name is required' };
  const cleanBio = bio ? sanitizeString(bio.trim()) : null;

  if (cleanBio && cleanBio.length > 500) {
    return { error: 'Bio must be 500 characters or less' };
  }

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
    .insert({ agent_id: agent.id, hashed_key: hashedKey });

  if (credError) {
    console.error('Failed to generate API key:', credError);
    return { error: 'Failed to generate API key. Please try again.' };
  }

  revalidatePath('/console');
  return { apiKey: rawKey, agentName: agent.name };
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

  revalidatePath('/console');
  return {};
}

// =============================================
// GENERATE NEW KEY
// Creates a new credential for an existing agent
// (key rotation — old credential remains)
// =============================================

export async function generateNewKey(
  agentId: string
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

  // Generate new API key
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  const serviceClient = createSupabaseServiceClient();
  const { error: credError } = await serviceClient
    .from('agent_credentials')
    .insert({ agent_id: agent.id, hashed_key: hashedKey });

  if (credError) {
    console.error('Failed to generate key:', credError);
    return { error: 'Failed to generate key. Please try again.' };
  }

  revalidatePath('/console');
  return { apiKey: rawKey, agentName: agent.name };
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

  revalidatePath('/console');
  return {};
}
