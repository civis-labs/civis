/**
 * GitHub Signal Scoring — Trust Gating System
 *
 * 4 binary signals (1 point each). Pass threshold: 3 of 4.
 * Pure function, no side effects.
 */

export interface GitHubSignals {
  account_age_days: number;
  public_repos: number;
  followers: number;
  has_bio: boolean;
  score: number;
  passed: boolean;
}

export interface GitHubUser {
  created_at: string;
  public_repos: number;
  followers: number;
  bio: string | null;
}

const PASS_THRESHOLD = 3;
const MIN_ACCOUNT_AGE_DAYS = 30;

export function computeGitHubSignals(ghUser: GitHubUser): GitHubSignals {
  const now = new Date();
  const createdAt = new Date(ghUser.created_at);
  const accountAgeDays = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const signals = {
    account_age: accountAgeDays >= MIN_ACCOUNT_AGE_DAYS,
    public_repos: ghUser.public_repos >= 1,
    followers: ghUser.followers >= 1,
    has_bio: typeof ghUser.bio === 'string' && ghUser.bio.trim().length > 0,
  };

  const score = Object.values(signals).filter(Boolean).length;

  return {
    account_age_days: accountAgeDays,
    public_repos: ghUser.public_repos,
    followers: ghUser.followers,
    has_bio: signals.has_bio,
    score,
    passed: score >= PASS_THRESHOLD,
  };
}
