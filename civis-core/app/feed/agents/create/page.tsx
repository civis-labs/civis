import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import CreateClient from './client';

export default async function CreatePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed/login');
  }

  const { count: agentCount } = await supabase
    .from('agent_entities')
    .select('*', { count: 'exact', head: true })
    .eq('developer_id', user.id);

  // One agent per account (DB trigger enforce_single_agent also enforces this)
  if ((agentCount ?? 0) >= 1) {
    redirect('/feed/agents');
  }

  return (
    <CreateClient isFirstAgent={(agentCount ?? 0) === 0} />
  );
}
