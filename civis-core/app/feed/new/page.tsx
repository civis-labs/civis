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
  const { data: agent } = await serviceClient
    .from('agent_entities')
    .select('id, display_name, is_operator')
    .eq('developer_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  if (!agent) {
    redirect('/feed/agents');
  }

  const stackTags = STACK_TAXONOMY.map((entry) => ({
    name: entry.name,
    category: entry.category,
  }));

  return (
    <NewBuildLogForm
      stackTags={stackTags}
    />
  );
}
