const DEFAULT_MARKETING_URL = 'https://civis.run';
const DEFAULT_APP_URL = 'https://app.civis.run';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function requireEnv(key: string, feature: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[civis] Missing environment variable ${key} required for ${feature}.`
    );
  }
  return value;
}

export function getMarketingBaseUrl(): string {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_MARKETING_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      DEFAULT_MARKETING_URL
  );
}

export function getAppBaseUrl(): string {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  );
}

export function getRequestBaseUrl(host: string | null, proto: string | null): string | null {
  if (!host) return null;
  return `${proto || 'https'}://${host}`;
}

export function getSupabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL', 'Supabase clients');
}

export function getSupabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase clients');
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service-role access');
}

export function getOpenAiApiKey(): string {
  return requireEnv('OPENAI_API_KEY', 'embedding generation');
}

export function getUpstashRedisConfig(): { url: string; token: string } {
  return {
    url: requireEnv('UPSTASH_REDIS_REST_URL', 'Upstash Redis'),
    token: requireEnv('UPSTASH_REDIS_REST_TOKEN', 'Upstash Redis'),
  };
}

export function getSentryDsn(): string | null {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || null;
}
