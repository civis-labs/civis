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

// =============================================
// Types
// =============================================

export type CreateAgentResult = {
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

export type UpdateBioResult = {
  error?: string;
};

export type UpdateDisplayNameResult = {
  error?: string;
};

export type UpdateUsernameResult = {
  error?: string;
};

const USERNAME_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function validateUsername(username: string): { clean: string; error?: string } {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return { clean: '', error: 'Username is required' };
  if (trimmed.length < 2) return { clean: trimmed, error: 'Username must be at least 2 characters' };
  if (trimmed.length > 30) return { clean: trimmed, error: 'Username must be 30 characters or less' };
  if (!USERNAME_RE.test(trimmed)) return { clean: trimmed, error: 'Username can only contain lowercase letters, numbers, and hyphens (no leading or trailing hyphens)' };
  return { clean: trimmed };
}

// =============================================
// CREATE AGENT
// Creates agent_entity + generates first API key
// =============================================

export async function createAgent(
  username: string,
  displayName: string,
  bio: string | null
): Promise<CreateAgentResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // One agent per account unless operator (DB trigger enforce_single_agent also
  // enforces this; this app-level check provides a clean error message instead of a DB error)
  const { data: existingAgents } = await supabase
    .from('agent_entities')
    .select('is_operator')
    .eq('developer_id', user.id);

  const agentCount = existingAgents?.length ?? 0;
  const isOperator = existingAgents?.some((a) => a.is_operator) ?? false;

  if (agentCount >= 1 && !isOperator) {
    return { error: 'Each account is limited to one agent.' };
  }

  // Validate username
  const { clean: cleanUsername, error: usernameError } = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (profanityMatcher.hasMatch(cleanUsername)) {
    return { error: 'Username contains inappropriate language.' };
  }

  // Validate display name
  const trimmedDisplayName = displayName.trim();
  if (!trimmedDisplayName) return { error: 'Display name is required' };
  if (trimmedDisplayName.length > 100) return { error: 'Display name must be 100 characters or less' };
  const cleanDisplayName = sanitizeString(trimmedDisplayName);
  if (!cleanDisplayName) return { error: 'Display name is required' };
  if (profanityMatcher.hasMatch(cleanDisplayName)) {
    return { error: 'Display name contains inappropriate language.' };
  }

  // Validate bio
  const cleanBio = bio ? sanitizeString(bio.trim()) : null;
  if (cleanBio && cleanBio.length > 500) {
    return { error: 'Bio must be 500 characters or less' };
  }
  if (cleanBio && profanityMatcher.hasMatch(cleanBio)) {
    return { error: 'Bio contains inappropriate language.' };
  }

  // Check username availability (service client to bypass RLS — username is globally unique)
  const serviceClientCheck = createSupabaseServiceClient();
  const { data: existingUsername } = await serviceClientCheck
    .from('agent_entities')
    .select('id')
    .eq('username', cleanUsername)
    .limit(1);

  if (existingUsername && existingUsername.length > 0) {
    return { error: 'Username is already taken.' };
  }

  // Insert agent entity
  // Uses authenticated client — RLS allows INSERT when developer_id = auth.uid()
  const { data: agent, error: agentError } = await supabase
    .from('agent_entities')
    .insert({
      developer_id: user.id,
      username: cleanUsername,
      display_name: cleanDisplayName,
      name: cleanDisplayName,
      bio: cleanBio || null,
    })
    .select('id, display_name')
    .single();

  if (agentError) {
    if (agentError.code === '23505' && agentError.message?.includes('username')) {
      return { error: 'Username is already taken.' };
    }
    console.error('Failed to create agent:', agentError);
    return { error: 'Failed to create agent. Please try again.' };
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

  revalidatePath('/agents');
  revalidatePath('/agent/[id]', 'page');
  return { apiKey: rawKey, agentName: agent.display_name };
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
  revalidatePath('/agent/[id]', 'page');
  return {};
}

// =============================================
// GENERATE NEW KEY
// Creates a replacement credential for an existing agent
// Older active keys are revoked after the new key is stored.
// =============================================

export async function generateNewKey(
  agentId: string
): Promise<GenerateKeyResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // Verify the agent belongs to this developer via RLS
  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id, display_name')
    .eq('id', agentId)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Agent not found or unauthorized' };

  const serviceClient = createSupabaseServiceClient();
  const { data: activeCredentials } = await serviceClient
    .from('agent_credentials')
    .select('id')
    .eq('agent_id', agentId)
    .eq('is_revoked', false);

  if ((activeCredentials?.length ?? 0) >= 3) {
    return { error: 'Maximum 3 active API keys per agent. Revoke an existing key first.' };
  }

  // Generate new API key
  const rawKey = crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  const { data: credential, error: credError } = await serviceClient
    .from('agent_credentials')
    .insert({ agent_id: agent.id, hashed_key: hashedKey })
    .select('id')
    .single();

  if (credError || !credential) {
    if (credError?.code === '23514') {
      return { error: 'Maximum 3 active API keys per agent. Revoke an existing key first.' };
    }
    console.error('Failed to generate key:', credError);
    return { error: 'Failed to generate key. Please try again.' };
  }

  if (activeCredentials && activeCredentials.length > 0) {
    const { error: revokeError } = await serviceClient
      .from('agent_credentials')
      .update({ is_revoked: true })
      .in('id', activeCredentials.map((row) => row.id))
      .eq('is_revoked', false)
      .neq('id', credential.id);

    if (revokeError) {
      console.error('Failed to revoke superseded keys:', revokeError);
    }
  }

  revalidatePath('/agents');
  revalidatePath('/agent/[id]', 'page');
  return { apiKey: rawKey, agentName: agent.display_name };
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
  revalidatePath('/agent/[id]', 'page');
  return {};
}

// =============================================
// UPDATE DISPLAY NAME
// Inline display name editing from the developer console
// =============================================

export async function updateDisplayName(
  agentId: string,
  displayName: string | null
): Promise<UpdateDisplayNameResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('id', agentId)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Agent not found or unauthorized' };

  const trimmed = displayName ? displayName.trim() : null;
  if (!trimmed) return { error: 'Display name is required' };

  const cleanDisplayName = sanitizeString(trimmed);
  if (!cleanDisplayName) return { error: 'Display name is required' };
  if (cleanDisplayName.length > 100) return { error: 'Display name must be 100 characters or less' };
  if (profanityMatcher.hasMatch(cleanDisplayName)) {
    return { error: 'Display name contains inappropriate language.' };
  }

  const { error: updateError } = await supabase
    .from('agent_entities')
    .update({ display_name: cleanDisplayName, name: cleanDisplayName })
    .eq('id', agentId)
    .eq('developer_id', user.id);

  if (updateError) {
    console.error('Failed to update display name:', updateError);
    return { error: 'Failed to update display name. Please try again.' };
  }

  revalidatePath('/agents');
  revalidatePath('/agent/[id]', 'page');
  return {};
}

// =============================================
// UPDATE USERNAME
// Inline username editing from the developer console
// =============================================

export async function updateUsername(
  agentId: string,
  username: string
): Promise<UpdateUsernameResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: agent } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('id', agentId)
    .eq('developer_id', user.id)
    .single();

  if (!agent) return { error: 'Agent not found or unauthorized' };

  const { clean: cleanUsername, error: usernameError } = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (profanityMatcher.hasMatch(cleanUsername)) {
    return { error: 'Username contains inappropriate language.' };
  }

  const { error: updateError } = await supabase
    .from('agent_entities')
    .update({ username: cleanUsername })
    .eq('id', agentId)
    .eq('developer_id', user.id);

  if (updateError) {
    if (updateError.code === '23505') {
      return { error: 'Username is already taken.' };
    }
    console.error('Failed to update username:', updateError);
    return { error: 'Failed to update username. Please try again.' };
  }

  revalidatePath('/agents');
  revalidatePath('/agent/[id]', 'page');
  return {};
}
