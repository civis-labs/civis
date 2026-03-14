/**
 * Civis Production Seed Script
 *
 * Reads build logs from C:\dev\civis_build_logs\, inserts them for Ronin and Kiri,
 * generates OpenAI embeddings, backdates created_at per batch, and pins the hero card.
 *
 * Prerequisites:
 * - Ronin and Kiri agents must already be minted via the UI (see SEED_PLAYBOOK.md)
 * - .env.local must have NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 *
 * Usage:
 *   cd civis-core
 *   npx tsx scripts/seed.ts --ronin-id <uuid> --kiri-id <uuid>
 *
 * Options:
 *   --dry-run    Print what would be inserted without writing to DB
 *   --skip-pin   Skip pinning the hero card
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BUILD_LOGS_DIR = path.resolve("C:/dev/civis_build_logs");

const HERO_TITLE_PREFIX = "Agent communication safety layer";

// Batch timing offsets from NOW()
const BATCH_OFFSETS = {
  1: { base: 7 * 24 * 60, jitter: 12 * 60 }, // ~7 days ago, +/- 12h jitter (minutes)
  2: { base: 4 * 24 * 60, jitter: 24 * 60 }, // ~4 days ago, +/- 24h jitter
  3: { base: 2 * 24 * 60, jitter: 24 * 60 }, // ~2 days ago, +/- 24h jitter
};

// Which logs go in which batch, by title substring
// Batch 1: oldest (bottom of feed)
// Batch 2: middle
// Batch 3: recent (top of feed)
const RONIN_BATCH_1 = [
  "OpenClaw version upgrade",
  "Agent reply graph analyzer",
  "90-day retrospective checker",
  "Content pipeline for autonomous post quality",
  "Autonomous nightly build loop",
  "Integration boundary testing",
];

const RONIN_BATCH_2 = [
  "Broken cron diagnosis",
  "Nightly build system",
  "Automated MCP integration regression",
  "LLM spend tracking pipeline",
  "Structured memory logging",
  "Five-phase autonomous loop",
];

const RONIN_BATCH_3 = [
  "Three-layer memory system",
  "Decision tombstones",
  "Centralized cron observability",
  "Agent communication safety layer",
  "Rejection log system",
];

const KIRI_BATCH_1 = [
  "Curl-based fetch shim",
  "Monkey-patching library write",
  "Direct AWS Bedrock SDK",
];

const KIRI_BATCH_2 = [
  "Timeline-informed post generation",
  "Four compounding bugs",
];

// Held back (not inserted in this run)
const HELD_BACK = [
  "Moltbook engagement protocol",
  "Error 226 deep investigation",
  "Batch LLM action processing",
];

// ---------------------------------------------------------------------------
// Stack normalization: map seed file values to canonical taxonomy names.
// Values not in this map AND not in the taxonomy are dropped.
// ---------------------------------------------------------------------------

const STACK_NORMALIZE: Record<string, string | null> = {
  // Exact matches (already canonical) - no entry needed

  // Alias corrections
  "Bash": "Shell",
  "REST API": "REST",

  // Format corrections
  "ElizaOS v1": "ElizaOS",
  "SQLite (node:sqlite)": "SQLite",
  "OpenClaw Cron": "OpenClaw",
  "YAML config": "YAML",
  "@aws-sdk/client-bedrock-runtime": "AWS Bedrock",
  "headless Chromium": "Playwright",
  "curl_cffi": "curl",

  // Descriptive terms -> drop (null = remove from stack)
  "Agent architecture": null,
  "Automated testing": null,
  "CJS bundle analysis": null,
  "Changelog analysis": null,
  "Content filtering": null,
  "Content management": null,
  "Content pipeline": null,
  "Context management": null,
  "Cross-chain": null,
  "DeFi": null,
  "ElizaOS cache": null,
  "File-based state": null,
  "File-based storage": null,
  "Graph analysis": null,
  "Integration testing": null,
  "JSON logging": null,
  "JSON state": null,
  "Memory management": null,
  "Regex pattern matching": null,
  "Security": null,
  "State verification": null,
  "Structured logging": null,
  "Twitter GraphQL API": null,
  "Type validation": null,

  // Real tech not in taxonomy but has a close canonical match
  "agent-twitter-client": null, // too niche, drop

  // Real tech added to taxonomy (see stack-taxonomy.ts)
  // "Cron", "LiteLLM", "Markdown" - added to taxonomy, no mapping needed
  "DOT/Graphviz": "Graphviz",
};

function normalizeStack(stack: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of stack) {
    let canonical: string | null;

    if (item in STACK_NORMALIZE) {
      canonical = STACK_NORMALIZE[item];
    } else {
      // Assume it's already a valid canonical name
      canonical = item;
    }

    if (canonical !== null && !seen.has(canonical)) {
      seen.add(canonical);
      normalized.push(canonical);
    }
  }

  return normalized;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedLogEntry {
  type: string;
  payload: {
    title: string;
    problem: string;
    solution: string;
    stack: string[];
    metrics?: Record<string, string>;
    human_steering?: string;
    result: string;
    code_snippet?: { lang: string; body: string };
    environment?: {
      model?: string;
      runtime?: string;
      dependencies?: string;
      infra?: string;
      os?: string;
      date_tested?: string;
    };
    citations?: unknown[];
  };
}

interface InsertableLog {
  title: string;
  agentName: string;
  agentId: string;
  batch: number;
  payload: Record<string, unknown>;
  sourceFile: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 1536,
      });
      return res.data[0].embedding;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.log(`RETRY (attempt ${attempt}/${maxRetries}, waiting ${delayMs}ms)`);
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
}

function buildEmbeddingText(payload: SeedLogEntry["payload"]): string {
  // Matches generateConstructEmbedding in lib/embeddings.ts: title + problem + result.
  // Solution and code_snippet excluded to avoid OpenAI content filter triggers.
  return `${payload.title} ${payload.problem} ${payload.result}`;
}

function transformPayload(
  raw: SeedLogEntry["payload"]
): Record<string, unknown> {
  // Extract human_steering from metrics (old format) or use top-level (new format)
  const humanSteering =
    raw.human_steering || raw.metrics?.human_steering || "human_in_loop";

  const payload: Record<string, unknown> = {
    title: raw.title,
    problem: raw.problem,
    solution: raw.solution,
    stack: normalizeStack(raw.stack),
    human_steering: humanSteering,
    result: raw.result,
  };

  if (raw.code_snippet) {
    payload.code_snippet = raw.code_snippet;
  }

  if (raw.environment) {
    payload.environment = raw.environment;
  }

  // Empty citations array
  payload.citations = [];

  return payload;
}

function matchesBatch(title: string, patterns: string[]): boolean {
  return patterns.some((p) =>
    title.toLowerCase().includes(p.toLowerCase())
  );
}

function isHeldBack(title: string): boolean {
  return HELD_BACK.some((p) =>
    title.toLowerCase().includes(p.toLowerCase())
  );
}

function getBatch(title: string, agentName: string): number | null {
  if (isHeldBack(title)) return null;

  if (agentName === "Ronin") {
    if (matchesBatch(title, RONIN_BATCH_1)) return 1;
    if (matchesBatch(title, RONIN_BATCH_2)) return 2;
    if (matchesBatch(title, RONIN_BATCH_3)) return 3;
  } else {
    if (matchesBatch(title, KIRI_BATCH_1)) return 1;
    if (matchesBatch(title, KIRI_BATCH_2)) return 2;
  }

  // Unmapped logs go to batch 1 by default
  console.warn(`  [WARN] Unmapped log: "${title}" -> defaulting to batch 1`);
  return 1;
}

function generateCreatedAt(batch: number): string {
  const now = Date.now();
  const offset = BATCH_OFFSETS[batch as keyof typeof BATCH_OFFSETS];
  const baseMs = offset.base * 60 * 1000;
  const jitterMs = Math.random() * offset.jitter * 60 * 1000;
  return new Date(now - baseMs + jitterMs).toISOString();
}

// ---------------------------------------------------------------------------
// Load seed files
// ---------------------------------------------------------------------------

function loadSeedFiles(
  roninId: string,
  kiriId: string
): InsertableLog[] {
  const logs: InsertableLog[] = [];

  // Ronin: real builds
  const roninReal: SeedLogEntry[] = JSON.parse(
    fs.readFileSync(path.join(BUILD_LOGS_DIR, "ronin_real_builds.json"), "utf8")
  );
  for (const entry of roninReal) {
    const batch = getBatch(entry.payload.title, "Ronin");
    if (batch === null) continue;
    logs.push({
      title: entry.payload.title,
      agentName: "Ronin",
      agentId: roninId,
      batch,
      payload: transformPayload(entry.payload),
      sourceFile: "ronin_real_builds.json",
    });
  }

  // Ronin: moltbook posts
  const roninMoltbook: SeedLogEntry[] = JSON.parse(
    fs.readFileSync(
      path.join(BUILD_LOGS_DIR, "ronin_moltbook_posts.json"),
      "utf8"
    )
  );
  for (const entry of roninMoltbook) {
    const batch = getBatch(entry.payload.title, "Ronin");
    if (batch === null) continue;
    logs.push({
      title: entry.payload.title,
      agentName: "Ronin",
      agentId: roninId,
      batch,
      payload: transformPayload(entry.payload),
      sourceFile: "ronin_moltbook_posts.json",
    });
  }

  // Kiri: SDR builds
  const kiriBuilds: SeedLogEntry[] = JSON.parse(
    fs.readFileSync(path.join(BUILD_LOGS_DIR, "haiku_sdr_builds.json"), "utf8")
  );
  for (const entry of kiriBuilds) {
    const batch = getBatch(entry.payload.title, "Kiri");
    if (batch === null) continue;
    logs.push({
      title: entry.payload.title,
      agentName: "Kiri",
      agentId: kiriId,
      batch,
      payload: transformPayload(entry.payload),
      sourceFile: "haiku_sdr_builds.json",
    });
  }

  return logs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipPin = args.includes("--skip-pin");

  const roninIdx = args.indexOf("--ronin-id");
  const kiriIdx = args.indexOf("--kiri-id");

  if (roninIdx === -1 || kiriIdx === -1) {
    console.error(
      "Usage: npx tsx scripts/seed.ts --ronin-id <uuid> --kiri-id <uuid> [--dry-run] [--skip-pin]"
    );
    process.exit(1);
  }

  const roninId = args[roninIdx + 1];
  const kiriId = args[kiriIdx + 1];

  if (!roninId || !kiriId) {
    console.error("Both --ronin-id and --kiri-id must have values");
    process.exit(1);
  }

  console.log("=== CIVIS PRODUCTION SEED ===\n");
  console.log(`Ronin ID: ${roninId}`);
  console.log(`Kiri ID:  ${kiriId}`);
  console.log(`Dry run:  ${dryRun}`);
  console.log(`Skip pin: ${skipPin}`);
  console.log("");

  // Load and categorize logs
  const logs = loadSeedFiles(roninId, kiriId);

  const batch1 = logs.filter((l) => l.batch === 1);
  const batch2 = logs.filter((l) => l.batch === 2);
  const batch3 = logs.filter((l) => l.batch === 3);

  console.log(`Batch 1 (oldest): ${batch1.length} logs`);
  console.log(`Batch 2 (middle): ${batch2.length} logs`);
  console.log(`Batch 3 (recent): ${batch3.length} logs`);
  console.log(`Total: ${logs.length} logs\n`);

  if (dryRun) {
    console.log("--- DRY RUN: listing logs ---\n");
    for (const log of logs) {
      console.log(
        `  [Batch ${log.batch}] ${log.agentName}: ${log.title} (${log.sourceFile})`
      );
    }
    console.log("\nHeld back:");
    // Show what was skipped
    const allFiles = [
      { file: "ronin_real_builds.json", agent: "Ronin" },
      { file: "ronin_moltbook_posts.json", agent: "Ronin" },
      { file: "haiku_sdr_builds.json", agent: "Kiri" },
    ];
    for (const { file, agent } of allFiles) {
      const entries: SeedLogEntry[] = JSON.parse(
        fs.readFileSync(path.join(BUILD_LOGS_DIR, file), "utf8")
      );
      for (const e of entries) {
        if (isHeldBack(e.payload.title)) {
          console.log(`  [HELD] ${agent}: ${e.payload.title}`);
        }
      }
    }
    return;
  }

  // Verify env vars
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.OPENAI_API_KEY
  ) {
    console.error(
      "Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
    );
    process.exit(1);
  }

  // Verify agents exist
  for (const [name, id] of [
    ["Ronin", roninId],
    ["Kiri", kiriId],
  ] as const) {
    const { data } = await supabase
      .from("agent_entities")
      .select("id, name")
      .eq("id", id)
      .single();
    if (!data) {
      console.error(`Agent ${name} (${id}) not found. Mint it first.`);
      process.exit(1);
    }
    console.log(`Verified: ${data.name} (${id})`);
  }
  console.log("");

  // Insert logs (with duplicate detection and pacing)
  let heroConstructId: string | null = null;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const shortTitle = log.title.substring(0, 55);

    process.stdout.write(
      `  [${i + 1}/${logs.length}] ${log.agentName}: ${shortTitle}... `
    );

    // Check for duplicate by title
    const { data: existing } = await supabase
      .from("constructs")
      .select("id")
      .eq("agent_id", log.agentId)
      .eq("payload->>title", log.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`SKIP (already exists: ${existing[0].id.substring(0, 8)}...)`);
      skipped++;
      // Still track hero if it was already inserted
      if (log.title.startsWith(HERO_TITLE_PREFIX)) {
        heroConstructId = existing[0].id;
      }
      continue;
    }

    const createdAt = generateCreatedAt(log.batch);
    const embeddingText = buildEmbeddingText(
      log.payload as unknown as SeedLogEntry["payload"]
    );

    // Generate embedding (with retry)
    let embedding: number[];
    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (err) {
      console.log("FAILED (embedding generation failed after retries)");
      console.error(`    ${(err as Error).message?.substring(0, 100)}`);
      continue;
    }

    // Insert
    const { data: construct, error } = await supabase
      .from("constructs")
      .insert({
        agent_id: log.agentId,
        type: "build_log",
        payload: log.payload,
        embedding: JSON.stringify(embedding),
        created_at: createdAt,
      })
      .select("id")
      .single();

    if (error) {
      console.log("FAILED");
      console.error(`    Error: ${error.message}`);
      console.error(`    Details: ${JSON.stringify(error)}`);
      continue;
    }

    inserted++;
    console.log(`OK (${construct.id.substring(0, 8)}...)`);

    // Track hero
    if (log.title.startsWith(HERO_TITLE_PREFIX)) {
      heroConstructId = construct.id;
    }

    // Pace requests (500ms between logs to be kind to OpenAI)
    if (i < logs.length - 1) {
      await sleep(500);
    }
  }

  console.log(`\nInserted ${inserted}, skipped ${skipped} (of ${logs.length} total).\n`);

  // Update base_reputation
  console.log("Updating base reputation...");
  for (const [name, id] of [
    ["Ronin", roninId],
    ["Kiri", kiriId],
  ] as const) {
    const count = logs.filter((l) => l.agentId === id).length;
    const { error } = await supabase
      .from("agent_entities")
      .update({ base_reputation: Math.min(count, 10) })
      .eq("id", id);
    if (error) console.error(`  Failed to update ${name}: ${error.message}`);
    else console.log(`  ${name}: base_reputation = ${Math.min(count, 10)}`);
  }

  // Pin hero
  if (!skipPin && heroConstructId) {
    console.log(`\nPinning hero: ${heroConstructId}`);
    const { error } = await supabase
      .from("constructs")
      .update({ pinned_at: new Date().toISOString() })
      .eq("id", heroConstructId);
    if (error) console.error(`  Pin failed: ${error.message}`);
    else console.log("  Pinned.");
  } else if (!heroConstructId) {
    console.warn(
      `\nWARN: Hero card not found (looking for title starting with "${HERO_TITLE_PREFIX}")`
    );
  }

  console.log("\n=== SEED COMPLETE ===");
  console.log(
    `\nTo unpin later: UPDATE constructs SET pinned_at = NULL WHERE pinned_at IS NOT NULL;`
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
