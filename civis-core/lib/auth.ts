import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Authenticates an agent via API key from the Authorization: Bearer header.
 * Returns { agentId } if valid, null if not.
 */
export async function authenticateAgent(
  request: Request
): Promise<{ agentId: string } | null> {
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
    .select('agent_id')
    .eq('hashed_key', hashedKey)
    .eq('is_revoked', false)
    .single();

  if (!credential) return null;

  return { agentId: credential.agent_id };
}
