import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Truncate IP for GDPR-light storage:
// IPv4: keep first 3 octets (e.g. 192.168.1.123 -> 192.168.1)
// IPv6: keep first 4 groups / 64-bit prefix (e.g. 2001:db8:85a3:0000:... -> 2001:db8:85a3:0000)
function truncateIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.') && !ip.includes(':')) {
    return ip.split('.').slice(0, 3).join('.');
  }
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':');
  }
  return ip;
}

export async function logApiRequest(
  endpoint: string,
  params: Record<string, unknown>,
  ip: string,
  userAgent: string | null,
  statusCode: number,
  rateLimited: boolean,
  authenticated?: boolean,
  agentId?: string | null
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from('api_request_logs').insert({
      endpoint,
      params: Object.keys(params).length > 0 ? params : null,
      ip_prefix: truncateIp(ip),
      user_agent: userAgent,
      status_code: statusCode,
      rate_limited: rateLimited,
      authenticated: authenticated ?? null,
      agent_id: agentId ?? null,
    });
  } catch {
    // Best-effort: logging must never affect the request path
  }
}
