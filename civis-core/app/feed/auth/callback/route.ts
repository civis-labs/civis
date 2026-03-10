import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { computeGitHubSignals } from '@/lib/github-signals';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Use the forwarded host (preserves app.localhost / app.civis.run after middleware rewrite)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const origin = `${protocol}://${host}`;

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
  // SYBIL FILTER #1: Fetch GitHub profile for signal scoring
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
  // ==========================================================
  const userId = session.user.id;

  const { data: existingDev } = await serviceClient
    .from('developers')
    .select('id, trust_tier')
    .eq('id', userId)
    .single();

  if (existingDev) {
    // Update last_login_at for returning user
    await serviceClient.from('developers').update({ last_login_at: new Date().toISOString() }).eq('id', userId);

    // Returning user — route based on trust tier
    if (existingDev.trust_tier === 'unverified') {
      return NextResponse.redirect(`${origin}/verify`);
    }
    return NextResponse.redirect(`${origin}/agents`);
  }

  // ==========================================================
  // NEW USER: Compute signal score and create developer record
  // ==========================================================
  const signals = computeGitHubSignals(ghUser);
  const trustTier = signals.passed ? 'standard' : 'unverified';

  const { error: insertError } = await serviceClient
    .from('developers')
    .insert({
      id: userId,
      github_id: githubId,
      trust_tier: trustTier,
      github_signals: signals,
    });

  if (insertError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Update last_login_at for new user
  await serviceClient.from('developers').update({ last_login_at: new Date().toISOString() }).eq('id', userId);

  // Route based on signal score — DO NOT sign out on failure
  // (session must stay alive for /verify page + Stripe checkout)
  if (!signals.passed) {
    return NextResponse.redirect(`${origin}/verify`);
  }

  return NextResponse.redirect(`${origin}/agents`);
}
