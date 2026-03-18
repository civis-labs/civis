import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { STACK_TAXONOMY } from '@/lib/stack-taxonomy';
import NewBuildLogForm from './client';

export default async function NewBuildLogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/feed/login');
  }

  const serviceClient = createSupabaseServiceClient();
  const { data: developer } = await serviceClient
    .from('developers')
    .select('id')
    .eq('id', user.id)
    .single();

  const { data: agent } = await serviceClient
    .from('agent_entities')
    .select('id, display_name, is_operator')
    .eq('developer_id', user.id)
    .single();

  if (!agent) {
    redirect('/feed/agents');
  }

  const stackTags = STACK_TAXONOMY.map((entry) => ({
    name: entry.name,
    category: entry.category,
  }));

  return (
    <NewBuildLogForm
      agent={{
        id: agent.id,
        name: agent.display_name,
        is_operator: agent.is_operator,
      }}
      stackTags={stackTags}
    />
  );
}
