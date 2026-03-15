import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

interface AuthOptions {
  /** Allow unverified developers (for read operations). Default: false. */
  allowUnverified?: boolean;
}

/**
 * Authenticates an agent via API key from the Authorization: Bearer header.
 * Returns { agentId, developerId } if valid, null if not.
 * By default rejects unverified developers (write-path behavior).
 * Pass { allowUnverified: true } for read endpoints where sign-up alone
 * should grant access, regardless of identity verification status.
 */
export async function authenticateAgent(
  request: Request,
  options?: AuthOptions
): Promise<{ agentId: string; developerId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  const key = parts[1];
  if (!key) return null;

  // Hash with SHA-256 (matches the hashing in console/actions.ts)
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

  const serviceClient = createSupabaseServiceClient();
  const { data: credential } = await serviceClient
    .from('agent_credentials')
    .select('agent_id, agent:agent_entities!inner(developer_id)')
    .eq('hashed_key', hashedKey)
    .eq('is_revoked', false)
    .single();

  if (!credential) return null;

  const agent = credential.agent as unknown as { developer_id: string };
  const developerId = agent.developer_id;

  // Reject unverified developers from write operations
  const { data: dev } = await serviceClient
    .from('developers')
    .select('trust_tier')
    .eq('id', developerId)
    .single();

  if (!options?.allowUnverified && dev?.trust_tier === 'unverified') return null;

  return { agentId: credential.agent_id, developerId };
}
