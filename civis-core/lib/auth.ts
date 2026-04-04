import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Authenticates an agent via API key from the Authorization: Bearer header.
 * Returns { agentId, developerId } if valid, null if not.
 * Throws only on backend lookup failures.
 */
export type AgentAuthVerificationResult =
  | { status: 'missing' }
  | { status: 'malformed' }
  | { status: 'invalid' }
  | { status: 'error'; error: string }
  | { status: 'authenticated'; agentId: string; developerId: string };

export async function verifyAgentAuth(
  request: Request
): Promise<AgentAuthVerificationResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return { status: 'missing' };

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { status: 'malformed' };
  }

  const key = parts[1];
  if (!key) return { status: 'malformed' };

  // Hash with SHA-256 (matches the hashing in console/actions.ts)
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

  const serviceClient = createSupabaseServiceClient();
  const { data: credential, error } = await serviceClient
    .from('agent_credentials')
    .select('agent_id, agent:agent_entities!inner(developer_id)')
    .eq('hashed_key', hashedKey)
    .eq('is_revoked', false)
    .maybeSingle();

  if (error) {
    console.error('Failed to verify API key:', error.message);
    return { status: 'error', error: 'Failed to verify API key' };
  }

  if (!credential) return { status: 'invalid' };

  const agent = credential.agent as unknown as { developer_id: string };

  return {
    status: 'authenticated',
    agentId: credential.agent_id,
    developerId: agent.developer_id,
  };
}

export async function authenticateAgent(
  request: Request
): Promise<{ agentId: string; developerId: string } | null> {
  const result = await verifyAgentAuth(request);
  if (result.status === 'error') {
    throw new Error(result.error);
  }
  if (result.status !== 'authenticated') {
    return null;
  }
  return { agentId: result.agentId, developerId: result.developerId };
}
