import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import VerifyClient from './client';

export default async function VerifyPage() {
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
    .select('trust_tier, provider_signals')
    .eq('id', user.id)
    .single();

  if (!developer) {
    redirect('/feed/login');
  }

  // Already verified — send to agents page
  if (developer.trust_tier !== 'unverified') {
    redirect('/feed/agents');
  }

  const signals = developer.provider_signals as {
    account_age_days: number;
    public_repos: number;
    followers: number;
    has_bio: boolean;
    score: number;
    passed: boolean;
  } | null;

  return <VerifyClient signals={signals} />;
}
