import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

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
  const userId = session.user.id;

  // Extract provider info from Supabase session (works for all providers)
  const provider = session.user.app_metadata?.provider || 'email';
  const providerId =
    provider === 'email'
      ? session.user.email || userId
      : session.user.identities?.[0]?.id || userId;

  // ==========================================================
  // BLACKLIST CHECK
  // ==========================================================
  const serviceClient = createSupabaseServiceClient();

  const { data: blacklisted } = await serviceClient
    .from('blacklisted_identities')
    .select('id')
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .limit(1);

  if (blacklisted && blacklisted.length > 0) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=blacklisted`);
  }

  // ==========================================================
  // DEVELOPER RECORD: Create on first login, update on return
  // ==========================================================
  const { data: existingDev } = await serviceClient
    .from('developers')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingDev) {
    await serviceClient.from('developers').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
    return NextResponse.redirect(`${origin}/agents`);
  }

  // ==========================================================
  // NEW USER: Create developer record (always standard tier)
  // ==========================================================
  const { error: insertError } = await serviceClient
    .from('developers')
    .insert({
      id: userId,
      provider,
      provider_id: providerId,
      trust_tier: 'standard',
    });

  if (insertError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  await serviceClient.from('developers').update({ last_login_at: new Date().toISOString() }).eq('id', userId);

  return NextResponse.redirect(`${origin}/agents`);
}
