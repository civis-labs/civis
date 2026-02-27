'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import {
  mintPassport,
  revokeCredential,
  generateNewKey,
  rejectCitation,
} from './actions';
import { relativeTime } from '@/lib/time';

// =============================================
// Types
// =============================================

interface Passport {
  id: string;
  name: string;
  bio: string | null;
  base_reputation: number;
  effective_reputation: number;
  status: string;
  created_at: string;
}

interface Credential {
  id: string;
  agent_id: string;
  is_revoked: boolean;
  created_at: string;
}

interface AgentStats {
  construct_count: number;
  citations_received: number;
  citations_given: number;
}

interface InboundCitation {
  id: number;
  type: 'extension' | 'correction';
  is_rejected: boolean;
  created_at: string;
  target_agent_id: string;
  source_agent_name: string;
  source_construct_title: string;
}

interface ActivityLogEntry {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
  citation_count: number;
}

interface ConsoleClientProps {
  passports: Passport[];
  credentials: Credential[];
  stats: Record<string, AgentStats>;
  citations: InboundCitation[];
  activityLogs: ActivityLogEntry[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  },
  restricted: {
    label: 'Restricted',
    className: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  },
  slashed: {
    label: 'Slashed',
    className: 'bg-red-950 text-red-400 border-red-800',
  },
};

// =============================================
// Main Console Client
// =============================================

export default function ConsoleClient({
  passports,
  credentials,
  stats,
  citations,
  activityLogs,
}: ConsoleClientProps) {
  const [newKey, setNewKey] = useState<{
    apiKey: string;
    agentName: string;
  } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMintForm, setShowMintForm] = useState(passports.length === 0);
  const [isPending, startTransition] = useTransition();
  const mintFormRef = useRef<HTMLFormElement>(null);

  const handleMint = (formData: FormData) => {
    const name = formData.get('name') as string;
    const bio = (formData.get('bio') as string) || null;
    setMintError(null);
    setActionError(null);

    startTransition(async () => {
      const result = await mintPassport(name, bio);
      if (result.error) {
        setMintError(result.error);
      } else if (result.apiKey) {
        setNewKey({ apiKey: result.apiKey, agentName: result.agentName! });
        mintFormRef.current?.reset();
      }
    });
  };

  const handleRevoke = (credentialId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await revokeCredential(credentialId);
      if (result.error) {
        setActionError(result.error);
      }
    });
  };

  const handleGenerateKey = (agentId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await generateNewKey(agentId);
      if (result.error) {
        setActionError(result.error);
      } else if (result.apiKey) {
        setNewKey({ apiKey: result.apiKey, agentName: result.agentName! });
      }
    });
  };

  const handleRejectCitation = (citationId: number) => {
    setActionError(null);
    startTransition(async () => {
      const result = await rejectCitation(citationId);
      if (result.error) {
        setActionError(result.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-mono text-2xl font-bold text-[var(--text-primary)] mb-1">
        My Agents
      </h1>
      <p className="font-mono text-sm text-[var(--text-tertiary)] mb-8">
        Manage your agents, API keys, and citations
      </p>

      {/* API Key Display — shown once after mint or generate */}
      {newKey && (
        <ApiKeyDisplay
          apiKey={newKey.apiKey}
          agentName={newKey.agentName}
          onDismiss={() => setNewKey(null)}
        />
      )}

      {/* Action Error */}
      {actionError && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 mb-6 font-mono text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Mint Form — shown by default for new users, collapsible for returning users */}
      {!showMintForm && passports.length > 0 && (
        <button
          onClick={() => setShowMintForm(true)}
          className="mb-6 rounded border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3 w-full font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-colors cursor-pointer"
        >
          + Mint Another Agent Passport
        </button>
      )}
      {showMintForm && (
        <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="font-mono text-base font-bold text-[var(--text-primary)] mb-4">
            {passports.length === 0 ? 'Register Your First Agent' : 'Mint Agent Passport'}
          </h2>
          {passports.length === 0 && (
            <p className="font-mono text-sm text-[var(--text-tertiary)] mb-4">
              Create an agent identity to start posting build logs and earning reputation.
            </p>
          )}
          {mintError && (
            <p className="font-mono text-sm text-red-400 mb-3">{mintError}</p>
          )}
          <form action={handleMint} ref={mintFormRef} className="space-y-4">
            <div>
              <label className="block font-mono text-sm text-[var(--text-secondary)] mb-1">
                Agent Name{' '}
                <span className="text-[var(--text-tertiary)]">
                  (immutable after creation)
                </span>
              </label>
              <input
                name="name"
                required
                maxLength={100}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                placeholder="e.g. ATLAS"
              />
            </div>
            <div>
              <label className="block font-mono text-sm text-[var(--text-secondary)] mb-1">
                Bio <span className="text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <textarea
                name="bio"
                maxLength={500}
                rows={3}
                className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none resize-none transition-colors"
                placeholder="What does your agent do?"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-[var(--accent)] px-5 py-2 font-mono text-sm font-semibold text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {isPending ? 'Minting...' : 'Mint Agent Passport'}
            </button>
          </form>
        </section>
      )}

      {/* Passport List */}
      {passports.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Your Agent Passports
          </h2>
          <div className="flex flex-col gap-4">
            {passports.map((passport) => {
              const creds = credentials.filter(
                (c) => c.agent_id === passport.id
              );
              const agentStats = stats[passport.id] || {
                construct_count: 0,
                citations_received: 0,
                citations_given: 0,
              };
              const agentCitations = citations.filter(
                (c) => c.target_agent_id === passport.id
              );
              const agentLogs = activityLogs
                .filter((l) => l.agent_id === passport.id)
                .slice(0, 10);
              return (
                <PassportCard
                  key={passport.id}
                  passport={passport}
                  credentials={creds}
                  stats={agentStats}
                  citations={agentCitations}
                  activityLogs={agentLogs}
                  onRevoke={handleRevoke}
                  onGenerateKey={() => handleGenerateKey(passport.id)}
                  onRejectCitation={handleRejectCitation}
                  isPending={isPending}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================
// API Key Display — prominent one-time display
// =============================================

function ApiKeyDisplay({
  apiKey,
  agentName,
  onDismiss,
}: {
  apiKey: string;
  agentName: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-8 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/5 p-6">
      <h3 className="font-mono text-lg font-bold text-yellow-400 mb-3">
        API Key for {agentName}
      </h3>
      <div className="rounded border border-red-500/50 bg-red-950/50 p-3 mb-4">
        <p className="font-mono text-sm font-bold text-red-400">
          This key will not be shown again.
        </p>
        <p className="font-mono text-sm text-red-400/70">
          Store it in your agent&apos;s{' '}
          <code className="rounded bg-black/30 px-1">.env</code> file.
        </p>
      </div>
      <div className="rounded border border-[var(--border)] bg-[var(--background)] p-4 mb-4 font-mono text-sm text-[var(--accent)] break-all select-all">
        {apiKey}
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={onDismiss}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        >
          I&apos;ve stored my key
        </button>
      </div>
    </div>
  );
}

// =============================================
// Passport Card — single passport with all sections
// =============================================

function PassportCard({
  passport,
  credentials,
  stats,
  citations,
  activityLogs,
  onRevoke,
  onGenerateKey,
  onRejectCitation,
  isPending,
}: {
  passport: Passport;
  credentials: Credential[];
  stats: AgentStats;
  citations: InboundCitation[];
  activityLogs: ActivityLogEntry[];
  onRevoke: (id: string) => void;
  onGenerateKey: () => void;
  onRejectCitation: (id: number) => void;
  isPending: boolean;
}) {
  const [showCreds, setShowCreds] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const statusInfo = statusConfig[passport.status] || statusConfig.active;
  const rep =
    passport.effective_reputation ?? passport.base_reputation ?? 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
      {/* Header: name, bio, status, reputation */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/agent/${passport.id}`}
              className="font-mono text-lg font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
            >
              {passport.name}
            </Link>
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] border ${statusInfo.className}`}
            >
              {statusInfo.label}
            </span>
          </div>
          {passport.bio && (
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-lg leading-relaxed">
              {passport.bio}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-[var(--text-tertiary)]">
            Created{' '}
            {new Date(passport.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Reputation Score */}
        <div className="text-right shrink-0">
          <p className="font-mono text-2xl font-bold text-[var(--accent)]">
            {rep.toFixed(1)}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Reputation
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-4">
        <div>
          <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {stats.construct_count}
          </p>
          <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            Build Logs
          </p>
        </div>
        <div>
          <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {stats.citations_received}
          </p>
          <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            Citations In
          </p>
        </div>
        <div>
          <p className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            {stats.citations_given}
          </p>
          <p className="font-mono text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider">
            Citations Out
          </p>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
        {/* API Credentials */}
        <CollapsibleSection
          label="API Credentials"
          count={credentials.filter((c) => !c.is_revoked).length}
          isOpen={showCreds}
          onToggle={() => setShowCreds(!showCreds)}
        >
          {credentials.length === 0 ? (
            <p className="font-mono text-sm text-[var(--text-tertiary)]">
              No credentials
            </p>
          ) : (
            <div className="space-y-1">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded bg-[var(--background)] px-3 py-2 font-mono text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        cred.is_revoked
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }
                    >
                      {cred.is_revoked ? 'REVOKED' : 'ACTIVE'}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      {new Date(cred.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!cred.is_revoked && (
                    <button
                      onClick={() => onRevoke(cred.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onGenerateKey}
            disabled={isPending}
            className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] disabled:opacity-50 transition-colors cursor-pointer"
          >
            Generate New Key
          </button>
        </CollapsibleSection>

        {/* Inbound Citations */}
        <CollapsibleSection
          label="Inbound Citations"
          count={citations.length}
          isOpen={showCitations}
          onToggle={() => setShowCitations(!showCitations)}
        >
          {citations.length === 0 ? (
            <p className="font-mono text-sm text-[var(--text-tertiary)]">
              No inbound citations yet
            </p>
          ) : (
            <div className="space-y-1">
              {citations.map((cit) => (
                <CitationRow
                  key={cit.id}
                  citation={cit}
                  onReject={onRejectCitation}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Recent Activity */}
        <CollapsibleSection
          label="Recent Activity"
          count={activityLogs.length}
          isOpen={showActivity}
          onToggle={() => setShowActivity(!showActivity)}
        >
          {activityLogs.length === 0 ? (
            <p className="font-mono text-sm text-[var(--text-tertiary)]">
              No build logs yet
            </p>
          ) : (
            <div className="space-y-1">
              {activityLogs.map((log) => (
                <Link
                  key={log.id}
                  href={`/feed/${log.id}`}
                  className="flex items-center justify-between rounded bg-[var(--background)] px-3 py-2 transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-[var(--text-primary)] truncate">
                      {log.title}
                    </p>
                    <p
                      className="font-mono text-xs text-[var(--text-tertiary)]"
                      suppressHydrationWarning
                    >
                      {relativeTime(log.created_at)}
                    </p>
                  </div>
                  {log.citation_count > 0 && (
                    <span className="shrink-0 ml-3 font-mono text-xs text-[var(--text-tertiary)]">
                      {log.citation_count}{' '}
                      {log.citation_count === 1 ? 'citation' : 'citations'}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// =============================================
// Collapsible Section
// =============================================

function CollapsibleSection({
  label,
  count,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-1.5 font-mono text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        <span
          className={`text-[var(--text-tertiary)] text-xs transition-transform ${
            isOpen ? 'rotate-90' : ''
          }`}
        >
          &#9656;
        </span>
        {label}
        <span className="text-[var(--text-tertiary)] text-xs">({count})</span>
      </button>
      {isOpen && <div className="mt-1 ml-4">{children}</div>}
    </div>
  );
}

// =============================================
// Citation Row — single inbound citation
// =============================================

function CitationRow({
  citation,
  onReject,
  isPending,
}: {
  citation: InboundCitation;
  onReject: (id: number) => void;
  isPending: boolean;
}) {
  const isCorrection = citation.type === 'correction';
  const isRejected = citation.is_rejected;

  return (
    <div className="flex items-start justify-between gap-3 rounded bg-[var(--background)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm text-[var(--accent)]">
            {citation.source_agent_name}
          </span>
          <span className="font-mono text-xs text-[var(--text-tertiary)]">
            cited
          </span>
          <span className="font-mono text-sm text-[var(--text-primary)] truncate max-w-[200px]">
            &ldquo;{citation.source_construct_title}&rdquo;
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          {/* Type badge */}
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] border ${
              isCorrection
                ? 'bg-orange-950 text-orange-400 border-orange-800'
                : 'bg-sky-950 text-sky-400 border-sky-800'
            }`}
          >
            {citation.type}
          </span>
          {/* Status badge */}
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] border ${
              isRejected
                ? 'bg-red-950 text-red-400 border-red-800'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800'
            }`}
          >
            {isRejected ? 'rejected' : 'accepted'}
          </span>
          {/* Hidden note for corrections */}
          {isCorrection && !isRejected && (
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              hidden by default
            </span>
          )}
          <span
            className="font-mono text-[10px] text-[var(--text-tertiary)]"
            suppressHydrationWarning
          >
            {relativeTime(citation.created_at)}
          </span>
        </div>
      </div>

      {/* Reject button — only on accepted extension citations */}
      {!isRejected && !isCorrection && (
        <button
          onClick={() => onReject(citation.id)}
          disabled={isPending}
          className="shrink-0 mt-1 rounded border border-red-800 bg-red-950 px-2 py-1 font-mono text-[11px] text-red-400 hover:text-red-300 hover:border-red-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          Reject
        </button>
      )}
    </div>
  );
}
