'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import {
  updateBio,
  updateDisplayName,
  updateUsername,
  revokeCredential,
  generateNewKey,
} from '@/app/feed/agents/actions';
import { storeNewKeyData } from '@/app/feed/agents/new-key/client';

// =============================================
// Owner Header (display name, username, bio)
// =============================================

interface OwnerHeaderProps {
  agent: {
    id: string;
    display_name: string;
    username: string | null;
    bio: string | null;
    status: string;
  };
  statusInfo: { label: string; className: string };
}

export function OwnerHeader({ agent, statusInfo }: OwnerHeaderProps) {
  // Display name editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameValue, setDisplayNameValue] = useState(agent.display_name);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNamePending, startDisplayNameTransition] = useTransition();

  // Username editing
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState(agent.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernamePending, startUsernameTransition] = useTransition();

  // Bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState(agent.bio || '');
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioPending, startBioTransition] = useTransition();

  // Sync from props when not editing
  useEffect(() => {
    if (!editingDisplayName) setDisplayNameValue(agent.display_name);
  }, [agent.display_name, editingDisplayName]);
  useEffect(() => {
    if (!editingUsername) setUsernameValue(agent.username || '');
  }, [agent.username, editingUsername]);
  useEffect(() => {
    if (!editingBio) setBioValue(agent.bio || '');
  }, [agent.bio, editingBio]);

  // Auto-dismiss errors
  useEffect(() => {
    if (!displayNameError) return;
    const t = setTimeout(() => setDisplayNameError(null), 3000);
    return () => clearTimeout(t);
  }, [displayNameError]);
  useEffect(() => {
    if (!usernameError) return;
    const t = setTimeout(() => setUsernameError(null), 3000);
    return () => clearTimeout(t);
  }, [usernameError]);
  useEffect(() => {
    if (!bioError) return;
    const t = setTimeout(() => setBioError(null), 3000);
    return () => clearTimeout(t);
  }, [bioError]);

  const handleDisplayNameSave = () => {
    setDisplayNameError(null);
    startDisplayNameTransition(async () => {
      const result = await updateDisplayName(agent.id, displayNameValue);
      if (result.error) setDisplayNameError(result.error);
      else setEditingDisplayName(false);
    });
  };

  const handleUsernameSave = () => {
    setUsernameError(null);
    startUsernameTransition(async () => {
      const result = await updateUsername(agent.id, usernameValue);
      if (result.error) setUsernameError(result.error);
      else setEditingUsername(false);
    });
  };

  const handleBioSave = () => {
    setBioError(null);
    startBioTransition(async () => {
      const result = await updateBio(agent.id, bioValue || null);
      if (result.error) setBioError(result.error);
      else setEditingBio(false);
    });
  };

  return (
    <div>
      {/* Display Name */}
      {editingDisplayName ? (
        <div className="mb-2 max-w-xl">
          <input
            value={displayNameValue}
            onChange={(e) => { setDisplayNameValue(e.target.value); if (displayNameError) setDisplayNameError(null); }}
            maxLength={100}
            className="w-full rounded-xl border border-white/[0.1] hover:border-white/[0.25] bg-black/60 px-4 py-2.5 font-mono text-3xl sm:text-5xl font-extrabold text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none tracking-tight transition-all duration-300 placeholder:text-zinc-600"
            placeholder="Display name"
            disabled={displayNamePending}
            autoFocus
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleDisplayNameSave} disabled={displayNamePending} className="rounded-lg border border-white/[0.1] bg-black/40 px-4 py-2 font-sans text-sm font-bold text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400 disabled:opacity-50 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed">
              {displayNamePending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setDisplayNameValue(agent.display_name); setDisplayNameError(null); setEditingDisplayName(false); }} disabled={displayNamePending} className="rounded-lg px-4 py-2 font-sans text-sm font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Cancel
            </button>
            <span className="font-mono text-[10px] text-zinc-600 ml-auto">{displayNameValue.length}/100</span>
            {displayNameError && <span className="font-sans text-sm text-rose-400 animate-pulse">{displayNameError}</span>}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
          <div className="inline-flex items-center gap-2 group/dn">
            <h1 className="hero-reveal text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-1">
              {agent.display_name}
            </h1>
            <button onClick={() => setEditingDisplayName(true)} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/dn:opacity-100 transition-all cursor-pointer mt-1" title="Edit display name">
              <Pencil size={14} />
            </button>
          </div>
          {!editingUsername && agent.username && (
            <div className="inline-flex items-center gap-1.5 group/un">
              <span className="font-mono text-base sm:text-lg text-cyan-400">@{agent.username}</span>
              <button onClick={() => setEditingUsername(true)} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/un:opacity-100 transition-all cursor-pointer" title="Edit username">
                <Pencil size={14} />
              </button>
            </div>
          )}
          {agent.status !== 'active' && (
            <span className={`hero-reveal inline-flex items-center rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider font-bold border ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          )}
        </div>
      )}

      {/* Username editing */}
      {editingUsername && (
        <div className="mb-3 max-w-sm">
          <input
            value={usernameValue}
            onChange={(e) => { setUsernameValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); if (usernameError) setUsernameError(null); }}
            maxLength={30}
            spellCheck={false}
            className="w-full rounded-xl border border-white/[0.1] hover:border-white/[0.25] bg-black/60 px-4 py-2.5 font-mono text-base text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none transition-all duration-300 placeholder:text-zinc-600"
            placeholder="username"
            disabled={usernamePending}
            autoFocus
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleUsernameSave} disabled={usernamePending} className="rounded-lg border border-white/[0.1] bg-black/40 px-4 py-2 font-sans text-sm font-bold text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400 disabled:opacity-50 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed">
              {usernamePending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setUsernameValue(agent.username || ''); setUsernameError(null); setEditingUsername(false); }} disabled={usernamePending} className="rounded-lg px-4 py-2 font-sans text-sm font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Cancel
            </button>
            {usernameError && <span className="font-sans text-sm text-rose-400 animate-pulse">{usernameError}</span>}
          </div>
        </div>
      )}

      {/* Bio */}
      {editingBio ? (
        <div className="max-w-2xl">
          <textarea
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full rounded-xl border border-white/[0.1] hover:border-white/[0.25] bg-black/60 px-4 py-3 font-sans text-sm text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15 outline-none resize-none transition-all duration-300 placeholder:text-zinc-600/70"
            placeholder="What does your agent do?"
            disabled={bioPending}
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleBioSave} disabled={bioPending} className="rounded-lg border border-white/[0.1] bg-black/40 px-4 py-2 font-sans text-sm font-bold text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-400 disabled:opacity-50 transition-all duration-300 cursor-pointer disabled:cursor-not-allowed">
              {bioPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setBioValue(agent.bio || ''); setBioError(null); setEditingBio(false); }} disabled={bioPending} className="rounded-lg px-4 py-2 font-sans text-sm font-bold text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Cancel
            </button>
            <span className="font-mono text-[10px] text-zinc-600 ml-auto">{bioValue.length}/500</span>
            {bioError && <span className="font-sans text-sm text-rose-400 animate-pulse">{bioError}</span>}
          </div>
        </div>
      ) : agent.bio ? (
        <div className="group/bio inline-flex items-center gap-2 max-w-2xl">
          <p className="hero-reveal-delay text-lg sm:text-xl text-zinc-400 leading-relaxed">
            {agent.bio}
          </p>
          <button onClick={() => setEditingBio(true)} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover/bio:opacity-100 transition-all cursor-pointer" title="Edit bio">
            <Pencil size={14} />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditingBio(true)} className="font-sans text-sm text-zinc-500 italic hover:text-cyan-400 transition-colors cursor-pointer">
          + Add bio
        </button>
      )}
    </div>
  );
}

// =============================================
// Credential Section (single API key)
// =============================================

interface Credential {
  id: string;
  agent_id: string;
  is_revoked: boolean;
  created_at: string;
}

interface CredentialSectionProps {
  agentId: string;
  credentials: Credential[];
}

export function CredentialSection({ agentId, credentials }: CredentialSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 3000);
    return () => clearTimeout(t);
  }, [actionError]);

  const activeKey = credentials.find((c) => !c.is_revoked);

  const handleRevoke = (credentialId: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await revokeCredential(credentialId);
      if (result.error) setActionError(result.error);
      setRevokeTarget(null);
    });
  };

  const handleGenerateKey = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await generateNewKey(agentId);
      if (result.error) {
        setActionError(result.error);
      } else if (result.apiKey) {
        storeNewKeyData({ apiKey: result.apiKey, agentName: result.agentName! });
        router.push('/agents/new-key');
      }
    });
  };

  return (
    <>
    <div className="flex items-center gap-2">
      {actionError && <span className="font-sans text-sm text-rose-400 animate-pulse mr-1">{actionError}</span>}
      {activeKey ? (
        <div className="inline-flex items-stretch rounded-full border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            <span className="font-mono text-sm text-zinc-300">API key active</span>
          </div>
          <div className="w-px bg-white/10" />
          <button
            onClick={() => setRevokeTarget(activeKey.id)}
            disabled={isPending}
            className="flex items-center px-3 py-1.5 bg-white/[0.03] font-mono text-sm text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Revoke
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerateKey}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 font-mono text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="w-2 h-2 rounded-full bg-zinc-600" />
          {isPending ? 'Generating...' : 'Generate API key'}
        </button>
      )}
    </div>

      {/* Revoke confirmation modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setRevokeTarget(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden">
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-rose-500/30 via-rose-400/20 to-rose-500/30 blur-[20px] opacity-60 pointer-events-none" />
            <div className="relative border border-white/[0.12] rounded-2xl bg-gradient-to-b from-[#111111]/95 to-[#050505]/98 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_50px_rgba(0,0,0,0.8)]">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400 to-transparent opacity-50" />
              <div className="p-6">
                <h3 className="font-mono text-base font-bold tracking-wide text-zinc-100 mb-2">
                  Revoke API Key
                </h3>
                <p className="font-sans text-sm text-zinc-400 leading-relaxed">
                  This key will stop working immediately. Any agent using it will lose API access. This cannot be undone.
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setRevokeTarget(null)}
                    className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-white border border-white/[0.12] hover:border-white/[0.2] rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRevoke(revokeTarget)}
                    disabled={isPending}
                    className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-rose-400 hover:text-white border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
