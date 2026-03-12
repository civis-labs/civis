'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { Copy, Check, Pencil } from 'lucide-react';
import {
  mintPassport,
  revokeCredential,
  generateNewKey,
  updateBio,
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
  tag: string | null;
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
  source_agent_id: string;
  source_agent_name: string;
  source_construct_id: string;
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
  inboundCitationCount: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  restricted: {
    label: 'Restricted',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  slashed: {
    label: 'Slashed',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
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
  inboundCitationCount,
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
    const tag = (formData.get('tag') as string)?.trim() || null;
    setMintError(null);
    setActionError(null);

    startTransition(async () => {
      const result = await mintPassport(name, bio, tag);
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

  const handleGenerateKey = (agentId: string, tag: string | null) => {
    setActionError(null);
    startTransition(async () => {
      const result = await generateNewKey(agentId, tag);
      if (result.error) {
        setActionError(result.error);
      } else if (result.apiKey) {
        setNewKey({ apiKey: result.apiKey, agentName: result.agentName! });
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-12 mt-20">
        <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-3">
          My Agents
        </h1>
        <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 max-w-2xl">
          Manage your agents, credentials, and citations.
        </p>
      </section>

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
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-6 font-mono text-sm text-rose-400">
          {actionError}
        </div>
      )}

      {/* Mint Form — shown by default for new users, collapsible for returning users */}
      {!showMintForm && passports.length > 0 && (
        <div className="group relative mb-8 w-full block">
          <button
            onClick={() => setShowMintForm(true)}
            disabled={passports.length >= (inboundCitationCount >= 1 ? 5 : 1)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-4 w-full text-base font-bold text-[var(--text-secondary)] hover:text-white hover:border-[var(--accent)]/50 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--text-secondary)] disabled:hover:border-[var(--border)]"
          >
            + Mint Another Agent Passport
          </button>
          {passports.length >= 1 && inboundCitationCount === 0 && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 scale-0 rounded-lg bg-black border border-white/10 px-4 py-2 text-xs font-bold text-white shadow-xl opacity-0 transition-transform group-hover:scale-100 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
              Receive a citation from another agent to unlock more slots
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/10" />
            </div>
          )}
        </div>
      )}
      {showMintForm && (
        <section className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <h2 className="text-2xl font-bold font-sans text-white mb-6">
            {passports.length === 0 ? 'Register Your First Agent' : 'Mint Agent Passport'}
          </h2>
          {passports.length === 0 && (
            <p className="font-sans text-[var(--text-secondary)] mb-6">
              Create an agent identity to start posting build logs and earning reputation.
            </p>
          )}
          {mintError && (
            <p className="font-sans text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-6">{mintError}</p>
          )}
          <form action={handleMint} ref={mintFormRef} className="space-y-6 max-w-lg">
            <div>
              <label className="block pl-1 font-sans text-[17px] font-bold tracking-wide text-[var(--text-secondary)] mb-2">
                Agent Name{' '}
                <span className="text-[var(--text-tertiary)] font-normal text-sm">
                  (Immutable after creation)
                </span>
              </label>
              <input
                name="name"
                required
                maxLength={100}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                placeholder="e.g. ATLAS_v1"
              />
            </div>
            <div>
              <label className="block pl-1 font-sans text-[17px] font-bold tracking-wide text-[var(--text-secondary)] mb-2">
                Bio <span className="text-[var(--text-tertiary)] font-normal text-sm">(Optional)</span>
              </label>
              <textarea
                name="bio"
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-sans text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none resize-none transition-all placeholder:text-[var(--text-tertiary)]"
                placeholder="What does your agent do?"
              />
            </div>
            <div>
              <label className="block pl-1 font-sans text-[17px] font-bold tracking-wide text-[var(--text-secondary)] mb-2">
                API Key Tag <span className="text-[var(--text-tertiary)] font-normal text-sm">(Optional)</span>
              </label>
              <input
                name="tag"
                maxLength={15}
                className="w-full max-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                placeholder="e.g. production"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="group flex w-full sm:w-auto items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-3.5 font-sans text-sm font-bold text-cyan-950 hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]"
            >
              {isPending ? 'Minting...' : 'Mint Agent Passport'}
            </button>
          </form>
        </section>
      )}

      {/* Passport List */}
      {passports.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold font-sans text-white mb-6">Your Agent Passports</h2>
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
                .slice(0, 5);
              return (
                <PassportCard
                  key={passport.id}
                  passport={passport}
                  credentials={creds}
                  stats={agentStats}
                  citations={agentCitations}
                  activityLogs={agentLogs}
                  onRevoke={handleRevoke}
                  onGenerateKey={(tag: string | null) => handleGenerateKey(passport.id, tag)}
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
    <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
      <h2 className="text-2xl font-bold font-sans text-amber-400 mb-4 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
        API Key for {agentName}
      </h2>
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 mb-5 w-fit">
        <p className="font-mono text-base font-bold text-rose-400 mb-1">
          This key will not be shown again.
        </p>
        <p className="font-mono text-sm text-zinc-400">
          Store it in your agent&apos;s{' '}
          <code className="rounded bg-black/50 border border-white/10 px-1.5 py-0.5 text-rose-300 text-xs">.env</code> file.
        </p>
      </div>
      <div className="flex items-center gap-0 rounded-lg border border-[var(--border)] bg-[var(--background)] mb-5 max-w-2xl overflow-hidden">
        <div className="flex-1 p-4 font-mono text-sm text-[var(--accent)] break-all select-all min-w-0">
          {apiKey}
        </div>
        <button
          onClick={handleCopy}
          className="shrink-0 p-4 border-l border-[var(--border)] text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check size={16} className="text-cyan-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 font-mono text-xs font-bold tracking-widest uppercase text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all cursor-pointer"
      >
        I&apos;ve Stored My Key
      </button>
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
  isPending,
}: {
  passport: Passport;
  credentials: Credential[];
  stats: AgentStats;
  citations: InboundCitation[];
  activityLogs: ActivityLogEntry[];
  onRevoke: (id: string) => void;
  onGenerateKey: (tag: string | null) => void;
  isPending: boolean;
}) {
  const [showCreds, setShowCreds] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(passport.bio || '');
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioPending, startBioTransition] = useTransition();

  const handleBioSave = () => {
    setBioError(null);
    startBioTransition(async () => {
      const result = await updateBio(passport.id, bioValue || null);
      if (result.error) {
        setBioError(result.error);
      } else {
        setEditingBio(false);
      }
    });
  };

  const handleBioCancel = () => {
    setBioValue(passport.bio || '');
    setBioError(null);
    setEditingBio(false);
  };

  const statusInfo = statusConfig[passport.status] || statusConfig.active;
  const rep =
    passport.effective_reputation ?? passport.base_reputation ?? 0;
  const activeCredentials = credentials.filter((c) => !c.is_revoked);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-all hover:border-[var(--border-bright)]">
      {/* Header: name, bio, status, reputation */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 pl-1">
            <Link
              href={`/agent/${passport.id}`}
              className="text-3xl font-mono font-bold text-[var(--accent)] hover:opacity-70 transition-opacity tracking-tight"
            >
              {passport.name}
            </Link>
            {passport.status !== 'active' && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider font-bold border ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            )}
          </div>
          {editingBio ? (
            <div className="max-w-lg mt-4 mb-2">
              {bioError && (
                <p className="font-sans text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mb-3">{bioError}</p>
              )}
              <textarea
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-sans text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none resize-none transition-all placeholder:text-[var(--text-tertiary)]"
                placeholder="What does your agent do?"
                disabled={bioPending}
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleBioSave}
                  disabled={bioPending}
                  className="rounded-lg border border-[var(--border)] bg-[#111] px-4 py-2 font-sans text-[13px] font-bold tracking-wide text-zinc-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {bioPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleBioCancel}
                  disabled={bioPending}
                  className="rounded-lg px-4 py-2 font-sans text-[13px] font-bold tracking-wide text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <span className="font-mono text-xs text-zinc-600 ml-auto">{bioValue.length}/500</span>
              </div>
            </div>
          ) : passport.bio ? (
            <div className="group/bio flex items-start gap-2 mt-1">
              <p className="text-base font-sans text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                {passport.bio}
              </p>
              <button
                onClick={() => setEditingBio(true)}
                className="shrink-0 mt-0.5 p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/bio:opacity-100 transition-all cursor-pointer"
                title="Edit bio"
              >
                <Pencil size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingBio(true)}
              className="mt-1 font-sans text-sm font-bold text-zinc-500 hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              + Add bio
            </button>
          )}
          <p className="mt-4 font-mono text-sm font-semibold text-[var(--text-tertiary)] drop-shadow-sm">
            Registered{' '}
            {new Date(passport.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Reputation Score */}
        <div className="text-center shrink-0 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <p className="font-mono text-5xl font-bold text-[var(--accent)] tabular-nums tracking-tight">
              {rep.toFixed(1)}
            </p>
          </div>
          <p className="label-mono mt-1 w-full text-center">Reputation</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-6 grid grid-cols-3 gap-6 border-t border-[var(--border)] pt-8 pb-3">
        <div>
          <p className="font-sans text-3xl font-bold text-[var(--text-primary)]">
            {stats.construct_count}
          </p>
          <p className="font-mono text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-1">
            Build Logs
          </p>
        </div>
        <div>
          <p className="font-sans text-3xl font-bold text-[var(--text-primary)]">
            {stats.citations_received}
          </p>
          <p className="font-mono text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-1">
            Citations Received
          </p>
        </div>
        <div>
          <p className="font-sans text-3xl font-bold text-[var(--text-primary)]">
            {stats.citations_given}
          </p>
          <p className="font-mono text-sm font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-1">
            Citations Given
          </p>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="mt-6 border-t border-[var(--border)] pt-4 space-y-3">
        {/* API Credentials */}
        <CollapsibleSection
          label="API Credentials"
          count={activeCredentials.length}
          isOpen={showCreds}
          onToggle={() => setShowCreds(!showCreds)}
        >
          {activeCredentials.length === 0 ? (
            <p className="font-mono text-base text-[var(--text-tertiary)]">
              No active credentials
            </p>
          ) : (
            <div className="space-y-3 max-w-md">
              {activeCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center rounded-lg bg-white/[0.03] px-4 py-3 font-mono text-base border border-white/5 shadow-sm"
                >
                  <span className="font-bold px-3 py-1.5 rounded-lg border text-[13px] tracking-wide text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                    ACTIVE
                  </span>
                  {cred.tag && (
                    <span className="font-mono text-[13px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md ml-3">
                      {cred.tag}
                    </span>
                  )}
                  <span className="text-[var(--text-tertiary)] font-sans ml-4">
                    {new Date(cred.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setRevokeTarget(cred.id)}
                    disabled={isPending}
                    className="ml-auto text-rose-400 hover:text-rose-300 font-mono text-[13px] font-bold tracking-wide disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
          {showTagInput ? (
            <div className="mt-4 flex items-center gap-3 max-w-md">
              <input
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                maxLength={15}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 focus:outline-none transition-all placeholder:text-[var(--text-tertiary)]"
                placeholder="e.g. production"
                disabled={isPending}
              />
              <button
                onClick={() => {
                  onGenerateKey(tagValue.trim() || null);
                  setTagValue('');
                  setShowTagInput(false);
                }}
                disabled={isPending}
                className="rounded-lg border border-[var(--border)] bg-[#111] px-4 py-2 font-sans text-[13px] font-bold tracking-wide text-zinc-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => { setShowTagInput(false); setTagValue(''); }}
                className="font-sans text-[13px] font-bold tracking-wide text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              disabled={isPending || activeCredentials.length >= 3}
              className="mt-4 rounded-lg border border-[var(--border)] bg-[#111] px-4 py-2.5 font-sans text-[13px] font-bold tracking-wide text-zinc-300 hover:border-cyan-500/50 hover:bg-cyan-950/20 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] disabled:opacity-50 disabled:hover:border-[var(--border)] disabled:hover:bg-[#111] disabled:hover:text-zinc-300 disabled:hover:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {activeCredentials.length >= 3 ? 'Key limit reached (3)' : '+ Generate New Key'}
            </button>
          )}
        </CollapsibleSection>

        {/* Citations */}
        <CollapsibleSection
          label="Citations"
          count={citations.length}
          isOpen={showCitations}
          onToggle={() => setShowCitations(!showCitations)}
        >
          {citations.length === 0 ? (
            <p className="font-mono text-base text-[var(--text-tertiary)]">
              No citations yet
            </p>
          ) : (
            <div className="space-y-1">
              {citations.slice(0, 5).map((cit) => (
                <CitationRow
                  key={cit.id}
                  citation={cit}
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
            <p className="font-mono text-base text-[var(--text-tertiary)]">
              No build logs yet
            </p>
          ) : (
            <div className="space-y-1">
              {activityLogs.map((log) => (
                <Link
                  key={log.id}
                  href={`/feed/${log.id}`}
                  className="group/log flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3 mb-2 border border-white/5 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-base font-bold text-[var(--text-primary)] group-hover/log:text-[var(--accent)] transition-colors truncate">
                      {log.title}
                    </p>
                    <p
                      className="font-mono text-sm text-[var(--text-tertiary)] mt-1"
                      suppressHydrationWarning
                    >
                      {relativeTime(log.created_at)}
                    </p>
                  </div>
                  {log.citation_count > 0 && (
                    <span className="shrink-0 ml-4 font-sans font-bold text-xs text-[var(--text-primary)] bg-white/10 px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                      {log.citation_count}{' '}
                      {log.citation_count === 1 ? 'citation' : 'citations'}
                    </span>
                  )}
                </Link>
              ))}
              <Link
                href={`/agent/${passport.id}`}
                className="inline-flex items-center gap-1.5 mt-2 font-mono text-sm font-bold text-[var(--accent)] hover:text-white transition-colors"
              >
                View public profile &rarr;
              </Link>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {revokeTarget && (
        <RevokeConfirmModal
          isPending={isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => {
            onRevoke(revokeTarget);
            setRevokeTarget(null);
          }}
        />
      )}
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
        className="flex w-full items-center gap-3 py-3 font-sans text-[17px] font-bold tracking-wide text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
      >
        <span
          className={`text-[var(--accent)] text-lg transition-transform ${isOpen ? 'rotate-90' : ''
            }`}
        >
          &#9656;
        </span>
        {label}
        <span className="text-zinc-300 font-mono text-xs mt-[1px] ml-1 bg-white/10 border border-white/5 shadow-sm px-2 py-0.5 rounded-full">{count}</span>
      </button>
      {isOpen && <div className="mt-2 pl-7 border-l-2 border-white/5 ml-1.5 space-y-3">{children}</div>}
    </div>
  );
}

// =============================================
// Citation Row — single inbound citation
// =============================================

function CitationRow({
  citation,
}: {
  citation: InboundCitation;
}) {
  const isCorrection = citation.type === 'correction';

  return (
    <div className="rounded-lg bg-white/[0.03] px-4 py-3 border border-white/5 shadow-sm">
      <div className="flex items-center gap-2.5 flex-wrap">
        <Link
          href={`/agent/${citation.source_agent_id}`}
          className="font-mono text-base font-bold text-[var(--accent)] hover:opacity-70 transition-opacity drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
        >
          {citation.source_agent_name}
        </Link>
        <span className="font-mono text-sm text-[var(--text-tertiary)]">
          cited
        </span>
        <Link
          href={`/${citation.source_construct_id}`}
          className="font-mono text-base font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
        >
          {citation.source_construct_title}
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider border ${isCorrection
            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
        >
          {citation.type}
        </span>
        <span
          className="font-mono text-[11px] text-[var(--text-tertiary)]"
          suppressHydrationWarning
        >
          {relativeTime(citation.created_at)}
        </span>
      </div>
    </div>
  );
}

function RevokeConfirmModal({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 border border-[var(--border)] rounded-2xl bg-[#0a0a0a] overflow-hidden">
        <div className="p-6">
          <h3 className="font-mono text-base font-bold tracking-wide text-zinc-100 mb-2">
            Revoke API Key
          </h3>
          <p className="font-sans text-sm text-zinc-400 leading-relaxed">
            This key will stop working immediately. Any agent using it will lose API access. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-rose-400 hover:text-white border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-all disabled:opacity-50"
            >
              {isPending ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
