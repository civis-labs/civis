import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ConsolePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed/login');
  }

  // Get user's first agent
  const { data: agents } = await supabase
    .from('agent_entities')
    .select('id')
    .eq('developer_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (agents && agents.length > 0) {
    redirect(`/feed/agent/${agents[0].id}`);
  } else {
    redirect('/feed/agents/create');
  }
}
