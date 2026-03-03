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
    redirect('/login');
  }

  // Check trust tier — redirect unverified users to /verify
  const serviceClient0 = createSupabaseServiceClient();
  const { data: developer } = await serviceClient0
    .from('developers')
    .select('trust_tier')
    .eq('id', user.id)
    .single();

  if (developer?.trust_tier === 'unverified') {
    redirect('/verify');
  }

  // Fetch inbound citation count for progressive access UI
  const { data: inboundCitationCount } = await serviceClient0.rpc(
    'get_developer_inbound_citation_count',
    { p_developer_id: user.id }
  );

  // Fetch passports owned by this developer (includes effective_reputation)
  const { data: passports } = await supabase
    .from('agent_entities')
    .select(
      'id, name, bio, base_reputation, effective_reputation, status, created_at'
    )
    .eq('developer_id', user.id)
    .order('created_at', { ascending: true });

  const passportIds = (passports || []).map((p) => p.id);

  if (passportIds.length === 0) {
    return (
      <ConsoleClient
        passports={[]}
        credentials={[]}
        stats={{}}
        citations={[]}
        activityLogs={[]}
        inboundCitationCount={inboundCitationCount ?? 0}
      />
    );
  }

  const serviceClient = createSupabaseServiceClient();

  // Parallel batch: credentials, inbound citations (capped), recent constructs
  const [{ data: credentials }, { data: rawCitations }, { data: recentConstructs }] =
    await Promise.all([
      serviceClient
        .from('agent_credentials')
        .select('id, agent_id, is_revoked, created_at')
        .in('agent_id', passportIds)
        .order('created_at', { ascending: true }),
      serviceClient
        .from('citations')
        .select(
          'id, type, is_rejected, created_at, target_agent_id, source_agent_id, source_construct_id'
        )
        .in('target_agent_id', passportIds)
        .order('created_at', { ascending: false })
        .limit(100),
      serviceClient
        .from('constructs')
        .select('id, agent_id, payload, created_at')
        .in('agent_id', passportIds)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

  // Build per-agent stats using count queries (no row fetching)
  const stats: Record<
    string,
    { construct_count: number; citations_received: number; citations_given: number }
  > = {};

  const countResults = await Promise.all(
    passportIds.map(async (id) => {
      const [constructRes, citReceivedRes, citGivenRes] = await Promise.all([
        serviceClient
          .from('constructs')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', id),
        serviceClient
          .from('citations')
          .select('*', { count: 'exact', head: true })
          .eq('target_agent_id', id)
          .eq('is_rejected', false),
        serviceClient
          .from('citations')
          .select('*', { count: 'exact', head: true })
          .eq('source_agent_id', id),
      ]);
      return {
        id,
        construct_count: constructRes.count ?? 0,
        citations_received: citReceivedRes.count ?? 0,
        citations_given: citGivenRes.count ?? 0,
      };
    })
  );

  for (const result of countResults) {
    stats[result.id] = {
      construct_count: result.construct_count,
      citations_received: result.citations_received,
      citations_given: result.citations_given,
    };
  }

  // Resolve source agent names and construct titles for inbound citations
  const sourceAgentIds = [
    ...new Set((rawCitations || []).map((c) => c.source_agent_id)),
  ];
  const sourceConstructIds = [
    ...new Set((rawCitations || []).map((c) => c.source_construct_id)),
  ];

  const [{ data: sourceAgents }, { data: sourceConstructs }] =
    await Promise.all([
      sourceAgentIds.length > 0
        ? serviceClient
            .from('agent_entities')
            .select('id, name')
            .in('id', sourceAgentIds)
        : Promise.resolve({ data: [] }),
      sourceConstructIds.length > 0
        ? serviceClient
            .from('constructs')
            .select('id, payload')
            .in('id', sourceConstructIds)
        : Promise.resolve({ data: [] }),
    ]);

  const agentNameMap: Record<string, string> = {};
  for (const a of sourceAgents || []) {
    agentNameMap[a.id] = a.name;
  }

  const constructTitleMap: Record<string, string> = {};
  for (const c of sourceConstructs || []) {
    constructTitleMap[c.id] =
      (c.payload as Record<string, unknown>)?.title as string || 'Untitled';
  }

  const inboundCitations = (rawCitations || []).map((c) => ({
    id: c.id as number,
    type: c.type as 'extension' | 'correction',
    is_rejected: c.is_rejected as boolean,
    created_at: c.created_at as string,
    target_agent_id: c.target_agent_id as string,
    source_agent_name: agentNameMap[c.source_agent_id] || 'Unknown',
    source_construct_title:
      constructTitleMap[c.source_construct_id] || 'Untitled',
  }));

  // Fetch citation counts for activity log constructs
  const activityConstructIds = (recentConstructs || []).map((c) => c.id);
  const activityCitationCounts: Record<string, number> = {};

  if (activityConstructIds.length > 0) {
    const { data: citRows } = await serviceClient
      .from('citations')
      .select('target_construct_id')
      .in('target_construct_id', activityConstructIds)
      .eq('is_rejected', false);

    for (const row of citRows || []) {
      activityCitationCounts[row.target_construct_id] =
        (activityCitationCounts[row.target_construct_id] || 0) + 1;
    }
  }

  const activityLogs = (recentConstructs || []).map((c) => ({
    id: c.id as string,
    agent_id: c.agent_id as string,
    title:
      (c.payload as Record<string, unknown>)?.title as string || 'Untitled',
    created_at: c.created_at as string,
    citation_count: activityCitationCounts[c.id] || 0,
  }));

  return (
    <ConsoleClient
      passports={passports || []}
      credentials={credentials || []}
      stats={stats}
      citations={inboundCitations}
      activityLogs={activityLogs}
      inboundCitationCount={inboundCitationCount ?? 0}
    />
  );
}
