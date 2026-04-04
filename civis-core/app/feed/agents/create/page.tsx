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

  const { data: existingAgents } = await supabase
    .from('agent_entities')
    .select('is_operator')
    .eq('developer_id', user.id);

  const agentCount = existingAgents?.length ?? 0;
  const isOperator = existingAgents?.some((a) => a.is_operator) ?? false;

  // One agent per account unless operator (DB trigger enforce_single_agent also enforces this)
  if (agentCount >= 1 && !isOperator) {
    redirect('/feed/agents');
  }

  return <CreateClient />;
}
