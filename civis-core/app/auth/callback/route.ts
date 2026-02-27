import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

const MINIMUM_ACCOUNT_AGE_DAYS = 180;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  // Create Supabase client with cookie handling for the callback
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange the auth code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const session = data.session;
  const providerToken = session.provider_token;

  if (!providerToken) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=no_provider_token`);
  }

  // ==========================================================
  // SYBIL FILTER #1: Check GitHub account age via GitHub API
  // CRITICAL: Uses the GitHub API response, NOT Supabase metadata
  // ==========================================================
  const ghResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${providerToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!ghResponse.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=github_api_failed`);
  }

  const ghUser = await ghResponse.json();
  const ghCreatedAt = new Date(ghUser.created_at);
  const now = new Date();
  const accountAgeDays = Math.floor(
    (now.getTime() - ghCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (accountAgeDays < MINIMUM_ACCOUNT_AGE_DAYS) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=account_too_new`);
  }

  // ==========================================================
  // SYBIL FILTER #2: Check blacklisted identities
  // ==========================================================
  const serviceClient = createSupabaseServiceClient();
  const githubId = String(ghUser.id);

  const { data: blacklisted } = await serviceClient
    .from('blacklisted_identities')
    .select('id')
    .eq('github_id', githubId)
    .limit(1);

  if (blacklisted && blacklisted.length > 0) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=blacklisted`);
  }

  // ==========================================================
  // DEVELOPER RECORD: Create on first login, skip on subsequent
  // Uses service role to bootstrap (RLS INSERT requires auth.uid() = id,
  // but service role bypasses RLS for the initial insert)
  // ==========================================================
  const userId = session.user.id;

  const { data: existingDev } = await serviceClient
    .from('developers')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingDev) {
    const { error: insertError } = await serviceClient
      .from('developers')
      .insert({ id: userId, github_id: githubId });

    if (insertError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/console`);
}
