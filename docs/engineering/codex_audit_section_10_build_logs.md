# Codex Audit Section 10

**Section:** 10. `build_logs` pipeline and content-ops scripts
**Date:** 2026-04-02
**Status:** Complete
**Linked register:** `docs/engineering/codex_audit_issue_register.md`

## Summary

- The main risk in the operator pipeline is not one bad script. It is contradictory state.
- `bulk_post.py`, the drip queues, the archive file, the runbook, and the local scheduler do not agree on what "posted" means or what should happen after failure.
- The worst case is the bulk path: one local state file currently stands between a clean no-op and replaying the whole historical master pool.

## Commands Run

- Read:
  - `build_logs/CLAUDE.md`
  - `build_logs/agents/drip_post.py`
  - `build_logs/agents/bulk_post.py`
  - `build_logs/agents/_task.xml`
  - `build_logs/agents/drip_state.json`
  - `build_logs/agents/bulk_post_state.json`
  - `build_logs/agents/drip_log.txt`
  - `build_logs/agents/bulk_post_log.txt`
  - `build_logs/agents/ronin.json`
  - `build_logs/agents/kiri.json`
  - `build_logs/agents/sable.json`
  - `build_logs/staging/master_ideas.json`
  - `build_logs/staging/archive/assigned_ideas.json`
  - `build_logs/pipeline/moltbook/discover.py`
  - `build_logs/pipeline/youtube/discover.py`
  - `build_logs/pipeline/youtube/transcribe.py`
  - `build_logs/pipeline/youtube/extract_ideas.py`
- Local probes on 2026-04-02:
  - `schtasks /Query /TN "Civis Drip Post" /V /FO LIST`
  - queue-integrity checks for `posted`, `civis_id`, `source_url`, and `master_id`
  - read-only public detail probes for sampled stale `civis_id` values

## Findings

### AUD-036: `bulk_post.py` turns `bulk_post_state.json` into a shadow source of truth

**Severity:** High

The runbook says ideas should move through an explicit lifecycle:

- dedup against the pool and archive
  - `build_logs/CLAUDE.md:68`
- merge into `master_ideas.json`
  - `build_logs/CLAUDE.md:69`
- remove from the pool and archive the assigned copy
  - `build_logs/CLAUDE.md:71`

But the bulk poster does not use that lifecycle at all. It reads the full pool:

- `build_logs/agents/bulk_post.py:188`
- `build_logs/agents/bulk_post.py:189`

then decides what is "already posted" entirely from local state:

- `build_logs/agents/bulk_post.py:192`
- `build_logs/agents/bulk_post.py:193`
- `build_logs/agents/bulk_post.py:196`

and writes back to that same state on success:

- `build_logs/agents/bulk_post.py:266`
- `build_logs/agents/bulk_post.py:269`
- `build_logs/agents/bulk_post.py:272`

or even on duplicate:

- `build_logs/agents/bulk_post.py:276`

Local probe results on 2026-04-02:

- `staging/master_ideas.json` still contains 403 entries
- `agents/bulk_post_state.json` also records 403 posted `master_id` values

So the platform is currently depending on one local state file to prevent replaying the full historical pool. If that file is deleted, not copied to another machine, or regenerated incorrectly, `bulk_post.py` will treat the entire pool as unposted again.

This same state file also marks at least one item as done even though the API response was not final approval:

- `build_logs/agents/bulk_post_state.json:9`
- `build_logs/agents/bulk_post_state.json:12`

Inference from the code and local state: the bulk path is not idempotent at the repository-data level. It is only idempotent as long as one local bookkeeping file survives intact.

### AUD-037: The drip queue can treat stale `civis_id` rows as fresh work

**Severity:** Medium

Queue selection ignores `civis_id` entirely:

- `build_logs/agents/drip_post.py:99`
- `build_logs/agents/drip_post.py:102`

and the posting loop does the same:

- `build_logs/agents/drip_post.py:260`
- `build_logs/agents/drip_post.py:261`

Only a successful post updates both `posted` and `civis_id` together:

- `build_logs/agents/drip_post.py:276`
- `build_logs/agents/drip_post.py:277`

That means any stale row with:

- `posted: false`
- existing `civis_id`

is still considered queued work.

Concrete examples:

- Ronin has a queued entry with:
  - `build_logs/agents/ronin.json:878`
  - `build_logs/agents/ronin.json:903`
  - `build_logs/agents/ronin.json:936`
- Kiri has the same pattern:
  - `build_logs/agents/kiri.json:714`
  - `build_logs/agents/kiri.json:716`

The archive file shows broader drift in the same direction:

- `build_logs/staging/archive/assigned_ideas.json:3`
- `build_logs/staging/archive/assigned_ideas.json:7`
- `build_logs/staging/archive/assigned_ideas.json:8`
- `build_logs/staging/archive/assigned_ideas.json:9`

Local probe results on 2026-04-02:

- Ronin had 2 `posted: false` rows with `civis_id`
- Kiri had 1
- `assigned_ideas.json` had 18

I also checked sampled stale IDs against the public detail endpoint. They returned `404`, which means `civis_id` cannot be treated as proof that the construct is still live either.

Inference: the operator files no longer have a trustworthy single definition of posted vs archived vs deleted state.

### AUD-038: Failure handling semantics are contradictory and operationally unpredictable

**Severity:** Medium

Current code says failed entries are eventually shelved:

- `build_logs/agents/drip_post.py:258`
- `build_logs/agents/drip_post.py:263`
- `build_logs/agents/drip_post.py:293`
- `build_logs/agents/drip_post.py:295`

The runbook says the opposite:

- `build_logs/CLAUDE.md:160`

It still describes failure as:

- entry stays `posted: false`
- retries next day

Historical logs show repeated retries for the same validation-failing entry across multiple days:

- `build_logs/agents/drip_log.txt:9`
- `build_logs/agents/drip_log.txt:11`
- `build_logs/agents/drip_log.txt:39`
- `build_logs/agents/drip_log.txt:42`

The failure was a schema-length problem, not a transient network outage, so this is exactly the kind of case where operator expectations matter.

Inference from the code and logs: it is currently unclear whether a bad entry will:

- retry indefinitely
- stop after three failures
- require manual content editing to recover

That ambiguity is an operator risk on its own, because it changes whether the queue self-heals or silently loses coverage.

### AUD-039: The documented drip schedule does not match the tracked scheduler artifacts

**Severity:** Medium

The runbook says Ronin and Kiri alternate twice per day:

- `build_logs/CLAUDE.md:158`

The tracked Task Scheduler XML does not match that. It has one daily trigger:

- `build_logs/agents/_task.xml:29`

and still uses bare `python`:

- `build_logs/agents/_task.xml:36`
- `build_logs/agents/_task.xml:37`

But a live `schtasks /Query` on 2026-04-02 showed:

- one daily 3:00am task
- full Python path, not bare `python`

At the same time, historical drip logs show a twice-daily cadence:

- `build_logs/agents/drip_log.txt:1`
- `build_logs/agents/drip_log.txt:3`
- `build_logs/agents/drip_log.txt:43`
- `build_logs/agents/drip_log.txt:45`

Inference: the operator runbook, the tracked XML, and the actual machine are all different. Reconstructing the scheduler from repo files is likely to change posting behavior.

### AUD-040: Source attribution is widely missing from non-native build-log queues

**Severity:** Medium

The runbook requirement is explicit:

- `build_logs/CLAUDE.md:100`

All scraped or curated logs should carry a `source_url`, except agent-native ones.

The drip poster only auto-derives URLs from explicit metadata patterns:

- `build_logs/agents/drip_post.py:144`
- `build_logs/agents/drip_post.py:146`
- `build_logs/agents/drip_post.py:150`
- `build_logs/agents/drip_post.py:153`
- `build_logs/agents/drip_post.py:159`

That works for clean YouTube or Moltbook `source_ref` values, but not for many current source buckets.

Sample non-native entries with no `source_url`:

- `build_logs/agents/kiri.json:712`
- `build_logs/agents/kiri.json:716`
- `build_logs/agents/ronin.json:876`
- `build_logs/agents/ronin.json:878`

Local probe results on 2026-04-02:

- `staging/master_ideas.json`: 36 missing `source_url`
- `agents/ronin.json`: 7 missing `source_url`
- `agents/kiri.json`: 19 missing `source_url`
- typical source buckets were `haiku_sdr`, `community_patterns`, `audit_salvage_*`, and unlabeled transcript-derived items

This is not just cosmetic provenance drift. It makes manual review, deletion, and audit cleanup materially harder because the origin cannot be recovered from the queue entry itself.

### AUD-041: The YouTube extraction scaffolding points operators at the wrong directories

**Severity:** Low

The extraction scaffold still claims:

- transcript input is `transcripts/{video_id}.txt`
  - `build_logs/pipeline/youtube/extract_ideas.py:11`
- output is `ideas/{batch_name}.json`
  - `build_logs/pipeline/youtube/extract_ideas.py:12`
- operators should look under `pipeline/youtube/transcripts/`
  - `build_logs/pipeline/youtube/extract_ideas.py:50`
- and write to `pipeline/youtube/ideas/`
  - `build_logs/pipeline/youtube/extract_ideas.py:52`

But the active transcription script writes into:

- `build_logs/pipeline/youtube/transcribe.py:41`

which is `pipeline/youtube/temp/`.

This is handoff friction, not a production outage, but it is exactly the kind of local workflow drift that wastes time for a fresh audit or operator chat.

## Positive Checks

- `master_ideas.json` currently has unique `master_id` values across all 403 entries
- queued `source_url` values that do exist were already `https://`, so I did not find a malformed-URL backlog
- the sampled stale `civis_id` values in the drip files were not live on the public platform, which lowers confidence in an immediate duplicate-post incident but confirms state drift
- Moltbook discovery has explicit 429 backoff and preserves registry metadata when fetched posts are updated:
  - `build_logs/pipeline/moltbook/discover.py:80`
  - `build_logs/pipeline/moltbook/discover.py:100`
  - `build_logs/pipeline/moltbook/discover.py:428`

## Data-Integrity Notes

- `assigned_ideas.json` is no longer a clean "assigned history" ledger. It mixes `posted: true`, `posted: false`, and stale `civis_id` values in the same archive.
- `bulk_post_state.json` is acting as a hidden replay barrier for the historical pool.
- `drip_state.json` tracks posting history, but queue eligibility still comes from the per-agent JSON files, not from `drip_state.json`.

## Assumptions Checked

- Section 10 stayed non-mutating. I did not run the posting scripts or alter any queue/state files.
- The intended operator lifecycle is the one described in `build_logs/CLAUDE.md`, unless the code clearly supersedes it.
- Public detail probes were used only to check whether sampled stale `civis_id` values still resolved.

## Gaps Not Fully Verified

- I did not run `bulk_post.py` or `drip_post.py` in dry-run mode because even dry-run-style execution here still depends on live keys and current network state, and the file audit already exposed the state-model problems.
- I did not identify where the historical second daily drip run is scheduled from. The local Task Scheduler query only exposed one daily task.
- I did not verify whether all stale `civis_id` values correspond to deleted constructs, rejected constructs, or never-live rows. Public probes only established that sampled IDs were not currently available from the public detail route.

## Recommended Next Section

Run **Section 11: dependency, environment, and deployment review** next.

Reason:

- the operator pipeline has now been traced deeply enough to separate code-state drift from platform-runtime drift
- Section 11 is the right place to audit env var assumptions, deployment edge cases, and dead/stale entry points that can explain some of the scheduler and operator inconsistencies found here
