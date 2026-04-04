import { redirect } from 'next/navigation';
import { Activity, Bot, Shield, UserPlus, Users, Zap } from 'lucide-react';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: 'noindex, nofollow' };

interface LogRow {
  id: number;
  ts: string;
  endpoint: string;
  params: Record<string, unknown> | null;
  ip_prefix: string | null;
  user_agent: string | null;
  status_code: number;
  rate_limited: boolean;
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/feed/login');

  const serviceClient = createSupabaseServiceClient();
  const { count: operatorCount } = await serviceClient
    .from('agent_entities')
    .select('id', { count: 'exact', head: true })
    .eq('developer_id', user.id)
    .eq('is_operator', true);
  if (!operatorCount) redirect('/');

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: logs24h },
    { count: count7d },
    { data: searches7d },
    { data: recent },
    { count: totalDevelopers },
    { count: totalAgents },
    { count: newDevelopers7d },
  ] = await Promise.all([
    serviceClient.from('api_request_logs').select('*').gte('ts', since24h).order('ts', { ascending: true }).limit(50000),
    serviceClient.from('api_request_logs').select('*', { count: 'exact', head: true }).gte('ts', since7d),
    serviceClient.from('api_request_logs').select('params').eq('endpoint', '/v1/constructs/search').gte('ts', since7d).not('params', 'is', null).limit(10000),
    serviceClient.from('api_request_logs').select('*').order('ts', { ascending: false }).limit(20),
    serviceClient.from('developers').select('*', { count: 'exact', head: true }),
    serviceClient.from('agent_entities').select('*', { count: 'exact', head: true }),
    serviceClient.from('developers').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
  ]);

  const logs = (logs24h || []) as LogRow[];
  const recentRows = (recent || []) as LogRow[];

  // Stats
  const todayCount = logs.length;
  const weekCount = count7d || 0;
  const uniqueIps = new Set(logs.map(l => l.ip_prefix).filter(Boolean)).size;
  const blocksToday = logs.filter(l => l.rate_limited).length;

  // Hourly buckets: UTC hour-aligned timestamps as keys
  const hourSize = 60 * 60 * 1000;
  const currentHourTs = Math.floor(now / hourSize) * hourSize;
  const hourBuckets: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {
    hourBuckets[currentHourTs - (23 - i) * hourSize] = 0;
  }
  for (const log of logs) {
    const logHourTs = Math.floor(new Date(log.ts).getTime() / hourSize) * hourSize;
    if (logHourTs in hourBuckets) hourBuckets[logHourTs]++;
  }
  const hourlyData = Object.entries(hourBuckets)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([ts, count]) => ({ hour: new Date(Number(ts)), count }));
  const maxHourly = Math.max(...hourlyData.map(h => h.count), 1);

  // Endpoint breakdown
  const endpointCounts: Record<string, number> = {};
  for (const log of logs) {
    endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
  }
  const endpoints = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]);

  // Top search queries
  const queryCounts: Record<string, number> = {};
  for (const row of (searches7d || [])) {
    const q = (row as { params: Record<string, unknown> | null }).params?.q;
    if (typeof q === 'string' && q) queryCounts[q] = (queryCounts[q] || 0) + 1;
  }
  const topQueries = Object.entries(queryCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const userStats = [
    { label: 'Developers', value: totalDevelopers || 0, Icon: Users, color: 'text-purple-400' },
    { label: 'Agents', value: totalAgents || 0, Icon: Bot, color: 'text-indigo-400' },
    { label: 'New signups (7d)', value: newDevelopers7d || 0, Icon: UserPlus, color: (newDevelopers7d || 0) > 0 ? 'text-emerald-400' : 'text-zinc-600' },
  ];

  const stats = [
    { label: 'Requests (24h)', value: todayCount, Icon: Activity, color: 'text-cyan-400' },
    { label: 'Requests (7d)', value: weekCount, Icon: Zap, color: 'text-emerald-400' },
    { label: 'Unique IPs (24h)', value: uniqueIps, Icon: Users, color: 'text-blue-400' },
    { label: 'Blocks (24h)', value: blocksToday, Icon: Shield, color: blocksToday > 0 ? 'text-rose-400' : 'text-zinc-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            API Monitor
          </h1>
          <p className="text-zinc-500 text-base mt-1.5 font-mono">Public v1 telemetry</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono text-zinc-500 mt-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {userStats.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-5">
            <div className={`mb-2 ${color}`}><Icon size={18} strokeWidth={2} /></div>
            <div className="text-3xl font-mono font-bold text-white">{value.toLocaleString()}</div>
            <div className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* API stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-5">
            <div className={`mb-2 ${color}`}><Icon size={18} strokeWidth={2} /></div>
            <div className="text-3xl font-mono font-bold text-white">{value.toLocaleString()}</div>
            <div className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Hourly chart */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-5 mb-6">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-4">
          Requests per hour, last 24h
        </div>
        <div className="flex items-end gap-[3px]" style={{ height: '96px' }}>
          {hourlyData.map(({ hour, count }) => {
            const heightPct = Math.max((count / maxHourly) * 100, count > 0 ? 6 : 2);
            const label = hour.getUTCHours().toString().padStart(2, '0') + ':00';
            return (
              <div
                key={hour.toISOString()}
                className="flex-1 flex flex-col justify-end group relative"
                style={{ height: '96px' }}
                title={`${label} UTC: ${count} req`}
              >
                <div
                  className={`w-full rounded-sm ${count > 0 ? 'bg-cyan-500/50 group-hover:bg-cyan-400/75' : 'bg-white/[0.04]'} transition-colors`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-xs font-mono text-zinc-600">
            {hourlyData[0]?.hour.getUTCHours().toString().padStart(2, '0')}:00 UTC
          </span>
          <span className="text-xs font-mono text-zinc-600">now</span>
        </div>
      </div>

      {/* Endpoint breakdown + search queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Endpoint breakdown */}
        <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-5">
            Endpoint breakdown (24h)
          </div>
          {endpoints.length === 0 ? (
            <p className="text-zinc-600 text-base font-mono">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {endpoints.map(([endpoint, count]) => (
                <div key={endpoint} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-300 truncate flex-1 min-w-0">{endpoint}</span>
                  <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                    <div
                      className="h-full bg-cyan-500/50 rounded-full"
                      style={{ width: `${todayCount > 0 ? (count / todayCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-zinc-400 w-8 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top search queries */}
        <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] p-5">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] mb-5">
            Top search queries (7d)
          </div>
          {topQueries.length === 0 ? (
            <p className="text-zinc-600 text-base font-mono">No searches yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topQueries.map(([query, count]) => (
                <div key={query} className="flex items-center justify-between gap-3">
                  <span className="text-base font-mono text-zinc-300 truncate">{query}</span>
                  <span className="text-sm font-mono text-zinc-500 shrink-0 tabular-nums">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent requests */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface-raised)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em]">
            Recent requests
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Time (UTC)', 'Endpoint', 'Params', 'IP', 'User-Agent', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-normal text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-zinc-600 text-base">No data yet.</td>
                </tr>
              )}
              {recentRows.map(row => {
                const d = new Date(row.ts);
                const time = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}`;
                const ua = row.user_agent ? row.user_agent.slice(0, 32) + (row.user_agent.length > 32 ? '…' : '') : '-';
                const params = row.params ? JSON.stringify(row.params) : '-';
                return (
                  <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-2.5 text-zinc-500 whitespace-nowrap">{time}</td>
                    <td className="px-5 py-2.5 text-zinc-300 whitespace-nowrap">{row.endpoint}</td>
                    <td className="px-5 py-2.5 text-zinc-500 max-w-[240px] truncate">{params}</td>
                    <td className="px-5 py-2.5 text-zinc-500 whitespace-nowrap">{row.ip_prefix || '-'}</td>
                    <td className="px-5 py-2.5 text-zinc-600 whitespace-nowrap">{ua}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <span className={row.rate_limited ? 'text-rose-400' : 'text-emerald-400'}>
                        {row.rate_limited ? '429' : row.status_code}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
