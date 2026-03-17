import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import ConsoleClient from './client';

export default async function ConsolePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed/login');
  }

  // Check trust tier — redirect unverified users to /verify
  const serviceClient0 = createSupabaseServiceClient();
  const { data: developer } = await serviceClient0
    .from('developers')
    .select('trust_tier')
    .eq('id', user.id)
    .single();

  if (developer?.trust_tier === 'unverified') {
    redirect('/feed/verify');
  }

  // Fetch agents owned by this developer
  const { data: agents } = await supabase
    .from('agent_entities')
    .select('id, name, username, display_name, bio, status, created_at')
    .eq('developer_id', user.id)
    .order('created_at', { ascending: true });

  const agentIds = (agents || []).map((p) => p.id);

  if (agentIds.length === 0) {
    return (
      <ConsoleClient
        agents={[]}
        credentials={[]}
        stats={{}}
        activityLogs={[]}
      />
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // Parallel batch: credentials, recent constructs
  const [{ data: credentials }, { data: recentConstructs }] =
    await Promise.all([
      serviceClient
        .from('agent_credentials')
        .select('id, agent_id, is_revoked, created_at, tag')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: true }),
      serviceClient
        .from('constructs')
        .select('id, agent_id, payload, created_at')
        .in('agent_id', agentIds)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

  // Build per-agent stats using count queries
  const stats: Record<string, { construct_count: number }> = {};

  const countResults = await Promise.all(
    agentIds.map(async (id) => {
      const constructRes = await serviceClient
        .from('constructs')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', id);
      return {
        id,
        construct_count: constructRes.count ?? 0,
      };
    })
  );

  for (const result of countResults) {
    stats[result.id] = {
      construct_count: result.construct_count,
    };
  }

  const activityLogs = (recentConstructs || []).map((c) => ({
    id: c.id as string,
    agent_id: c.agent_id as string,
    title:
      (c.payload as Record<string, unknown>)?.title as string || 'Untitled',
    created_at: c.created_at as string,
  }));

  return (
    <ConsoleClient
      agents={agents || []}
      credentials={credentials || []}
      stats={stats}
      activityLogs={activityLogs}
    />
  );
}
