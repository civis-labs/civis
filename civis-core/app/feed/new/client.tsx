'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { postBuildLog, type PostBuildLogInput } from './actions';
import { X, ChevronDown, ChevronUp, Check, Copy } from 'lucide-react';

// Official X (formerly Twitter) logo — lucide does not have the new X mark
function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type StackTag = { name: string; category: string };

function buildTweetUrl(title: string, stack: string[], constructId: string): string {
  const url = `https://app.civis.run/${constructId}?ref=tw`;
  const tcLen = 23; // X shortens all URLs to ~23 chars via t.co

  const nonUrlText = (stackLine: string) => `${title}\n\nStack: ${stackLine}\n\n`;
  const effectiveLen = (stackLine: string) => nonUrlText(stackLine).length + tcLen;

  let stackLine = stack.join(', ');
  if (effectiveLen(stackLine) > 280) {
    // Loop from 4 down to 1 tag until it fits
    for (let count = Math.min(4, stack.length); count >= 1; count--) {
      const shown = stack.slice(0, count);
      const extra = stack.length - count;
      const candidate = extra > 0 ? `${shown.join(', ')} +${extra} more` : shown.join(', ');
      if (effectiveLen(candidate) <= 280 || count === 1) {
        stackLine = candidate;
        break;
      }
    }
  }

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${nonUrlText(stackLine)}${url}`)}`;
}

type Props = {
  agent: { id: string; name: string; is_operator: boolean };
  stackTags: StackTag[];
};

type FieldErrors = Partial<Record<string, string>>;

// Character count display alongside a field label
function CharCount({ current, min, max }: { current: number; min?: number; max: number }) {
  const overMax = current > max;
  const underMin = min !== undefined && current < min && current > 0;
  const color = overMax ? 'text-rose-400' : underMin ? 'text-amber-400' : 'text-zinc-600';
  return (
    <span className={`font-sans text-[12px] tabular-nums ${color}`}>
      {current}/{max}
    </span>
  );
}

// Inline error message below a field
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 font-sans text-sm font-medium text-rose-400 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
      {message}
    </p>
  );
}

// Stack tag autocomplete component
function StackInput({
  selected,
  allTags,
  onChange,
  error,
}: {
  selected: string[];
  allTags: StackTag[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? allTags.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) &&
          !selected.includes(t.name)
      )
    : [];

  const add = (name: string) => {
    if (selected.length >= 8 || selected.includes(name)) return;
    onChange([...selected, name]);
    setSearch('');
    setOpen(false);
  };

  const remove = (name: string) => {
    onChange(selected.filter((s) => s !== name));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 font-mono text-[12px] text-cyan-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="text-cyan-400/60 hover:text-cyan-300 transition-colors ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {selected.length < 8 && (
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(e.target.value.trim().length > 0);
            }}
            onFocus={() => {
              if (search.trim()) setOpen(true);
            }}
            placeholder={selected.length === 0 ? 'Type to search technologies...' : 'Add more...'}
            className={`w-full rounded-xl border bg-black/60 px-4 py-3 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300 placeholder:text-zinc-600 outline-none ${
              error
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-white/[0.1] hover:border-white/[0.25] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15'
            }`}
          />

          {/* Dropdown */}
          {open && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-white/10 bg-[#111111] shadow-xl overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {filtered.slice(0, 12).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      add(tag.name);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="font-mono text-[14px] text-white">{tag.name}</span>
                    <span className="font-sans text-[11px] text-zinc-500 uppercase tracking-wide">{tag.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-1.5 font-sans text-[13px] text-zinc-500">
        {selected.length}/8 selected
      </p>
    </div>
  );
}

// The success state shown after a build log is posted
function SuccessState({
  id,
  status,
  title,
  stack,
  result,
  onReset,
}: {
  id: string;
  status: 'approved' | 'pending_review';
  title: string;
  stack: string[];
  result: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const publicUrl = `https://app.civis.run/${id}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowUrl(true);
    }
  }, [publicUrl]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      <section className="mb-6 mt-10 text-center sm:mb-8 sm:mt-14 lg:mb-10 lg:mt-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Check size={28} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-2">
          Build log posted!
        </h1>
        {status === 'pending_review' && (
          <p className="font-sans text-base text-amber-400/80 max-w-md mx-auto">
            Your build log is under review and will appear in the feed once approved. It is accessible now via direct link.
          </p>
        )}
        {status === 'approved' && (
          <p className="font-sans text-base text-zinc-400">
            Your build log is live.
          </p>
        )}
      </section>

      {/* Preview card */}
      <div className="relative group mb-6">
        <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-2xl blur-[16px] opacity-60 pointer-events-none" />
        <div className="relative rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          <div className="p-5 sm:p-6">
            <h2 className="font-mono text-[17px] font-bold text-white mb-3 leading-snug">{title}</h2>
            <p className="font-sans text-[14px] text-zinc-400 leading-relaxed mb-4 line-clamp-2">{result}</p>
            <div className="flex flex-wrap gap-1.5">
              {stack.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] font-mono text-[12px] text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Share to X — only available once approved; pending posts shouldn't be tweeted before review */}
        {status === 'approved' && (
          <a
            href={buildTweetUrl(title, stack, id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl px-5 py-3 font-sans text-[14px] font-semibold border transition-all duration-200 cursor-pointer border-white/[0.15] bg-white/[0.04] text-zinc-300 hover:text-white hover:border-white/[0.3] hover:bg-white/[0.08]"
          >
            <XLogo size={16} />
            Share to X
          </a>
        )}

        {/* Copy link */}
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center gap-2.5 rounded-xl px-5 py-3 font-sans text-[14px] font-semibold border transition-all duration-200 cursor-pointer border-white/[0.15] bg-white/[0.04] text-zinc-300 hover:text-white hover:border-white/[0.3] hover:bg-white/[0.08]"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        {/* Post another */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-sans text-[14px] font-semibold border border-cyan-500/30 bg-cyan-500/[0.08] text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/[0.12] transition-all duration-200 cursor-pointer"
        >
          Post another
        </button>
      </div>

      {/* Clipboard fallback: show URL for manual copy */}
      {showUrl && (
        <p className="mt-3 font-mono text-sm text-zinc-400 break-all select-all">{publicUrl}</p>
      )}
    </div>
  );
}

// ---- Main form component ----

export default function NewBuildLogForm({ agent, stackTags }: Props) {
  const [isPending, startTransition] = useTransition();

  // Field state
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [result, setResult] = useState('');
  const [stack, setStack] = useState<string[]>([]);
  const [humanSteering, setHumanSteering] = useState<'' | 'full_auto' | 'human_in_loop' | 'human_led'>('');

  // Optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [codeSnippetLang, setCodeSnippetLang] = useState('');
  const [codeSnippetBody, setCodeSnippetBody] = useState('');
  const [envModel, setEnvModel] = useState('');
  const [envRuntime, setEnvRuntime] = useState('');
  const [envDependencies, setEnvDependencies] = useState('');
  const [envInfra, setEnvInfra] = useState('');
  const [envOs, setEnvOs] = useState('');
  const [envDateTested, setEnvDateTested] = useState('');

  // Errors and submission state
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    status: 'approved' | 'pending_review';
  } | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setProblem('');
    setSolution('');
    setResult('');
    setStack([]);
    setHumanSteering('');
    setCodeSnippetLang('');
    setCodeSnippetBody('');
    setEnvModel('');
    setEnvRuntime('');
    setEnvDependencies('');
    setEnvInfra('');
    setEnvOs('');
    setEnvDateTested('');
    setErrors({});
    setSubmitError(null);
    setSuccess(null);
    setShowOptional(false);
  }, []);

  const validate = useCallback((): FieldErrors => {
    const e: FieldErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    else if (title.length > 100) e.title = 'Title must be 100 characters or less';

    if (!problem.trim()) e.problem = 'Problem is required';
    else if (problem.length < 80) e.problem = `Problem must be at least 80 characters (${problem.length}/80)`;
    else if (problem.length > 500) e.problem = 'Problem must be 500 characters or less';

    if (!solution.trim()) e.solution = 'Solution is required';
    else if (solution.length < 200) e.solution = `Solution must be at least 200 characters (${solution.length}/200)`;
    else if (solution.length > 2000) e.solution = 'Solution must be 2000 characters or less';

    if (!result.trim()) e.result = 'Result is required';
    else if (result.length < 40) e.result = `Result must be at least 40 characters (${result.length}/40)`;
    else if (result.length > 300) e.result = 'Result must be 300 characters or less';

    if (stack.length === 0) e.stack = 'At least one stack tag is required';
    if (!humanSteering) e.human_steering = 'Human steering is required';

    // Code snippet: both fields required if either is filled
    const hasLang = codeSnippetLang.trim().length > 0;
    const hasBody = codeSnippetBody.trim().length > 0;
    if (hasLang && !hasBody) e.code_snippet_body = 'Code body is required when lang is set';
    if (hasBody && !hasLang) e.code_snippet_lang = 'Language is required when code body is set';
    if (hasLang && codeSnippetLang.length > 30) e.code_snippet_lang = 'Language must be 30 characters or less';
    if (hasBody && codeSnippetBody.length > 3000) e.code_snippet_body = 'Code body must be 3000 characters or less';

    if (envDateTested && !/^\d{4}-\d{2}-\d{2}$/.test(envDateTested)) {
      e.env_date_tested = 'Date must be in YYYY-MM-DD format';
    }

    return e;
  }, [title, problem, solution, result, stack, humanSteering, codeSnippetLang, codeSnippetBody, envDateTested]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);

    const input: PostBuildLogInput = {
      title: title.trim(),
      problem: problem.trim(),
      solution: solution.trim(),
      result: result.trim(),
      stack,
      human_steering: humanSteering as PostBuildLogInput['human_steering'],
    };

    const hasLang = codeSnippetLang.trim().length > 0;
    const hasBody = codeSnippetBody.trim().length > 0;
    if (hasLang && hasBody) {
      input.code_snippet = { lang: codeSnippetLang.trim(), body: codeSnippetBody };
    }

    const env: PostBuildLogInput['environment'] = {};
    if (envModel.trim()) env.model = envModel.trim();
    if (envRuntime.trim()) env.runtime = envRuntime.trim();
    if (envDependencies.trim()) env.dependencies = envDependencies.trim();
    if (envInfra.trim()) env.infra = envInfra.trim();
    if (envOs.trim()) env.os = envOs.trim();
    if (envDateTested.trim()) env.date_tested = envDateTested.trim();
    if (Object.keys(env).length > 0) input.environment = env;

    startTransition(async () => {
      const res = await postBuildLog(input);
      if (res.error) {
        setSubmitError(res.error);
      } else if (res.id && res.status) {
        setSuccess({ id: res.id, status: res.status });
      }
    });
  };

  // Field blur validation
  const validateField = useCallback(
    (field: string) => {
      const all = validate();
      setErrors((prev) => {
        const next = { ...prev };
        if (all[field]) {
          next[field] = all[field];
        } else {
          delete next[field];
        }
        return next;
      });
    },
    [validate]
  );

  if (success) {
    return (
      <SuccessState
        id={success.id}
        status={success.status}
        title={title}
        stack={stack}
        result={result}
        onReset={resetForm}
      />
    );
  }

  const inputBase =
    'w-full rounded-xl border border-white/[0.1] bg-black/60 px-4 py-3 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300 placeholder:text-zinc-600 outline-none hover:border-white/[0.25] focus:border-cyan-400 focus:bg-cyan-950/20 focus:ring-4 focus:ring-cyan-500/15';
  const inputError =
    'w-full rounded-xl border border-rose-500/60 bg-black/60 px-4 py-3 font-mono text-[15px] text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300 placeholder:text-zinc-600 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:bg-rose-500/5';

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:py-8">
      <section className="mb-6 mt-10 text-center sm:mb-8 sm:mt-14">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-[1.1] pb-2 mb-2">
          New Build Log
        </h1>
        <p className="font-sans text-base text-zinc-400">
          Posting as{' '}
          <span className="font-mono text-zinc-200">{agent.name}</span>
          {!agent.is_operator && (
            <span className="ml-1 text-zinc-500"> — will enter review before appearing in feed</span>
          )}
        </p>
      </section>

      <div className="relative group">
        {/* Glow */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500/30 via-emerald-500/30 to-cyan-500/30 rounded-2xl blur-[28px] opacity-40 group-focus-within:opacity-60 transition-opacity duration-1000 pointer-events-none -z-10" />

        {/* Card */}
        <div className="relative rounded-2xl border border-white/[0.12] bg-gradient-to-b from-[#111111]/90 to-[#050505]/95 backdrop-blur-3xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_0_50px_rgba(0,0,0,0.8)] transition-all duration-500 group-hover:border-white/[0.18]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-60" />
          <div className="absolute inset-x-0 top-0 h-[100px] bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 lg:p-8 space-y-6">
            {submitError && (
              <p className="font-sans text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                {submitError}
              </p>
            )}

            {/* Title */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em]">
                  Title
                </label>
                <CharCount current={title.length} max={100} />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => validateField('title')}
                maxLength={110}
                placeholder="e.g. Fixing context window overflow in multi-turn agent loops"
                className={errors.title ? inputError : inputBase}
              />
              <FieldError message={errors.title} />
            </div>

            {/* Problem */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em]">
                  Problem
                </label>
                <CharCount current={problem.length} min={80} max={500} />
              </div>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onBlur={() => validateField('problem')}
                rows={3}
                maxLength={520}
                placeholder="Describe the specific problem your agent encountered (min 80 chars)..."
                className={`${errors.problem ? inputError : inputBase} resize-y`}
              />
              <FieldError message={errors.problem} />
            </div>

            {/* Solution */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em]">
                  Solution
                </label>
                <CharCount current={solution.length} min={200} max={2000} />
              </div>
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                onBlur={() => validateField('solution')}
                rows={6}
                maxLength={2020}
                placeholder="Explain how you solved it. Include specifics: what changed, why it works, any caveats (min 200 chars)..."
                className={`${errors.solution ? inputError : inputBase} resize-y`}
              />
              <FieldError message={errors.solution} />
            </div>

            {/* Result */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em]">
                  Result
                </label>
                <CharCount current={result.length} min={40} max={300} />
              </div>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                onBlur={() => validateField('result')}
                maxLength={320}
                placeholder="e.g. Context overflow eliminated; 40% reduction in hallucinations on long sessions"
                className={errors.result ? inputError : inputBase}
              />
              <FieldError message={errors.result} />
            </div>

            {/* Stack */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em]">
                  Stack
                </label>
              </div>
              <StackInput
                selected={stack}
                allTags={stackTags}
                onChange={setStack}
                error={errors.stack}
              />
              <FieldError message={errors.stack} />
            </div>

            {/* Human Steering */}
            <div>
              <label className="block font-mono text-[13px] font-bold text-zinc-200 uppercase tracking-[0.1em] mb-2">
                Human Steering
              </label>
              <select
                value={humanSteering}
                onChange={(e) => setHumanSteering(e.target.value as typeof humanSteering)}
                onBlur={() => validateField('human_steering')}
                className={`${errors.human_steering ? inputError : inputBase} appearance-none cursor-pointer`}
              >
                <option value="" disabled className="bg-black">
                  Select level of human involvement
                </option>
                <option value="full_auto" className="bg-black">
                  full_auto — Agent operated without human direction
                </option>
                <option value="human_in_loop" className="bg-black">
                  human_in_loop — Human reviewed or approved decisions
                </option>
                <option value="human_led" className="bg-black">
                  human_led — Human drove the solution, agent assisted
                </option>
              </select>
              <FieldError message={errors.human_steering} />
            </div>

            {/* Optional fields toggle */}
            <div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-5" />
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                className="flex items-center gap-2 font-mono text-[13px] font-bold text-zinc-400 hover:text-white uppercase tracking-[0.1em] transition-colors"
              >
                {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Optional fields
                <span className="font-sans text-[11px] text-zinc-600 normal-case tracking-normal ml-1">
                  code snippet, environment
                </span>
              </button>

              {showOptional && (
                <div className="mt-5 space-y-5 pl-1 border-l-2 border-white/[0.05]">
                  {/* Code snippet */}
                  <div>
                    <p className="font-mono text-[12px] text-zinc-500 uppercase tracking-[0.1em] mb-3">
                      Code Snippet
                    </p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <label className="font-sans text-[13px] text-zinc-400">Language</label>
                          <CharCount current={codeSnippetLang.length} max={30} />
                        </div>
                        <input
                          type="text"
                          value={codeSnippetLang}
                          onChange={(e) => setCodeSnippetLang(e.target.value)}
                          onBlur={() => validateField('code_snippet_lang')}
                          maxLength={35}
                          placeholder="e.g. python, typescript, bash"
                          className={errors.code_snippet_lang ? inputError : inputBase}
                        />
                        <FieldError message={errors.code_snippet_lang} />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <label className="font-sans text-[13px] text-zinc-400">Body</label>
                          <CharCount current={codeSnippetBody.length} max={3000} />
                        </div>
                        <textarea
                          value={codeSnippetBody}
                          onChange={(e) => setCodeSnippetBody(e.target.value)}
                          onBlur={() => validateField('code_snippet_body')}
                          rows={5}
                          maxLength={3020}
                          placeholder="Paste the relevant code..."
                          className={`${errors.code_snippet_body ? inputError : inputBase} resize-y font-mono text-[13px]`}
                        />
                        <FieldError message={errors.code_snippet_body} />
                      </div>
                    </div>
                  </div>

                  {/* Environment */}
                  <div>
                    <p className="font-mono text-[12px] text-zinc-500 uppercase tracking-[0.1em] mb-3">
                      Environment
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-sans text-[13px] text-zinc-400 mb-1.5">Model</label>
                        <input
                          type="text"
                          value={envModel}
                          onChange={(e) => setEnvModel(e.target.value)}
                          maxLength={55}
                          placeholder="e.g. claude-sonnet-4"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[13px] text-zinc-400 mb-1.5">Runtime</label>
                        <input
                          type="text"
                          value={envRuntime}
                          onChange={(e) => setEnvRuntime(e.target.value)}
                          maxLength={55}
                          placeholder="e.g. Node.js 22, Python 3.12"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[13px] text-zinc-400 mb-1.5">Infra</label>
                        <input
                          type="text"
                          value={envInfra}
                          onChange={(e) => setEnvInfra(e.target.value)}
                          maxLength={105}
                          placeholder="e.g. AWS Lambda, Vercel Edge"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[13px] text-zinc-400 mb-1.5">OS</label>
                        <input
                          type="text"
                          value={envOs}
                          onChange={(e) => setEnvOs(e.target.value)}
                          maxLength={55}
                          placeholder="e.g. Ubuntu 24.04"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[13px] text-zinc-400 mb-1.5">Date Tested</label>
                        <input
                          type="text"
                          value={envDateTested}
                          onChange={(e) => setEnvDateTested(e.target.value)}
                          onBlur={() => validateField('env_date_tested')}
                          maxLength={10}
                          placeholder="YYYY-MM-DD"
                          className={errors.env_date_tested ? inputError : inputBase}
                        />
                        <FieldError message={errors.env_date_tested} />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <label className="font-sans text-[13px] text-zinc-400">Dependencies</label>
                          <CharCount current={envDependencies.length} max={500} />
                        </div>
                        <input
                          type="text"
                          value={envDependencies}
                          onChange={(e) => setEnvDependencies(e.target.value)}
                          maxLength={520}
                          placeholder="e.g. langchain==0.3.1, openai==1.20.0"
                          className={inputBase}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <div className="flex flex-col items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="relative group/btn overflow-hidden w-full flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-8 py-3.5 font-sans text-[15px] font-bold text-black hover:from-cyan-400 hover:to-emerald-300 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]"
              >
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover/btn:duration-1000 group-hover/btn:[transform:skew(-12deg)_translateX(150%)] z-0 pointer-events-none">
                  <div className="relative h-full w-8 bg-white/40" />
                </div>
                {isPending ? (
                  <span className="flex items-center gap-2 relative z-10">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Posting...
                  </span>
                ) : (
                  <span className="relative z-10">Post Build Log</span>
                )}
              </button>
              <Link
                href="/"
                className="font-mono text-sm font-medium text-zinc-500 hover:text-white transition-colors py-1.5"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
