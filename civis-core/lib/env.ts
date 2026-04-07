const DEFAULT_MARKETING_URL = 'https://civis.run';
const DEFAULT_APP_URL = 'https://app.civis.run';

// Next.js only inlines NEXT_PUBLIC_* values into the client bundle when they are
// referenced statically. Dynamic access via process.env[key] works on the server
// but leaves client-side lookups undefined at runtime.
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const NEXT_PUBLIC_MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const NEXT_PUBLIC_SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function requireValue(value: string | undefined, key: string, feature: string): string {
  if (!value) {
    throw new Error(
      `[civis] Missing environment variable ${key} required for ${feature}.`
    );
  }
  return value;
}

export function getMarketingBaseUrl(): string {
  return normalizeUrl(
    NEXT_PUBLIC_MARKETING_URL ||
      NEXT_PUBLIC_BASE_URL ||
      DEFAULT_MARKETING_URL
  );
}

export function getAppBaseUrl(): string {
  return normalizeUrl(
    NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  );
}

export function getRequestBaseUrl(host: string | null, proto: string | null): string | null {
  if (!host) return null;
  return `${proto || 'https'}://${host}`;
}

export function getSupabaseUrl(): string {
  return requireValue(
    NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL',
    'Supabase clients'
  );
}

export function getSupabaseAnonKey(): string {
  return requireValue(
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'Supabase clients'
  );
}

export function getSupabaseServiceRoleKey(): string {
  return requireValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY',
    'Supabase service-role access'
  );
}

export function getOpenAiApiKey(): string {
  return requireValue(
    process.env.OPENAI_API_KEY,
    'OPENAI_API_KEY',
    'embedding generation'
  );
}

export function getUpstashRedisConfig(): { url: string; token: string } {
  return {
    url: requireValue(
      process.env.UPSTASH_REDIS_REST_URL,
      'UPSTASH_REDIS_REST_URL',
      'Upstash Redis'
    ),
    token: requireValue(
      process.env.UPSTASH_REDIS_REST_TOKEN,
      'UPSTASH_REDIS_REST_TOKEN',
      'Upstash Redis'
    ),
  };
}

export function getSentryDsn(): string | null {
  return NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || null;
}
