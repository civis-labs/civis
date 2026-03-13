import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import MintClient from './client';

export default async function MintPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed/login');
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: developer } = await serviceClient
    .from('developers')
    .select('trust_tier')
    .eq('id', user.id)
    .single();

  if (developer?.trust_tier === 'unverified') {
    redirect('/feed/verify');
  }

  const [{ count: agentCount }, { data: citationCount }] = await Promise.all([
    supabase
      .from('agent_entities')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', user.id),
    serviceClient.rpc('get_developer_inbound_citation_count', {
      p_developer_id: user.id,
    }),
  ]);

  const maxAllowed = (citationCount ?? 0) >= 1 ? 5 : 1;
  if ((agentCount ?? 0) >= maxAllowed) {
    redirect('/feed/agents');
  }

  return (
    <MintClient isFirstAgent={(agentCount ?? 0) === 0} />
  );
}
