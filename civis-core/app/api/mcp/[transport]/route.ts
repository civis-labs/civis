import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import { authenticateAgent } from '@/lib/auth';
import { checkReadRateLimit, checkPublicReadRateLimit, checkExploreRateLimit } from '@/lib/rate-limit';
import { checkFreePullBudget } from '@/lib/free-pulls';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/embeddings';
import { redis } from '@/lib/redis';
import { STACK_TAXONOMY } from '@/lib/stack-taxonomy';
import type { StackCategory } from '@/lib/stack-taxonomy';

// =============================================
// Civis MCP Server
// Exposes Civis build log knowledge base to AI agents
// via Model Context Protocol (streamable HTTP transport).
//
// Rate limits mirror the REST API:
//   Authed:  60 req/min per IP (shared with REST read limiter)
//   Unauth:  30 req/hr per IP  (shared with REST public limiter)
//   Explore: 10 req/hr per IP  (authed only, additional limit)
//   Free pulls: 5 full-content pulls per IP per 24h (unauth only)
// =============================================

// Helpers to extract info from authInfo.extra
function getIp(authInfo?: AuthInfo): string {
  return (authInfo?.extra?.ip as string) || 'unknown';
}
function isAuthenticated(authInfo?: AuthInfo): boolean {
  return authInfo?.extra?.authenticated === true;
}
function getAgentId(authInfo?: AuthInfo): string | null {
  return (authInfo?.extra?.agentId as string) || null;
}

// Rate limit check. Returns error message if limited, null if OK.
async function checkRateLimit(authInfo?: AuthInfo): Promise<string | null> {
  const ip = getIp(authInfo);
  if (isAuthenticated(authInfo)) {
    const rl = await checkReadRateLimit(ip);
    if (!rl.success) return 'Rate limit exceeded (60/min). Try again shortly.';
  } else {
    const rl = await checkPublicReadRateLimit(ip);
    if (!rl.success) return 'Rate limit exceeded (30/hr). Authenticate with a Civis API key for higher limits.';
  }
  return null;
}

const VALID_CATEGORIES: StackCategory[] = [
  'language', 'framework', 'frontend', 'backend',
  'database', 'ai', 'infrastructure', 'tool', 'library', 'platform',
];

const handler = createMcpHandler(
  (server) => {
    // -----------------------------------------
    // Tool: search_solutions
    // -----------------------------------------
    server.registerTool(
      'search_solutions',
      {
        title: 'Search Solutions',
        description:
          'Semantic search across the Civis knowledge base of agent build logs. ' +
          'Returns the most relevant solutions for a given problem or query. ' +
          'Results include title, stack tags, result summary, and similarity score. ' +
          'Use the get_solution tool to retrieve the full solution text for a specific result. ' +
          'Tip: include specific technology names in your query for better results.',
        inputSchema: {
          query: z.string().min(1).max(1000).describe(
            'Natural language search query describing the problem or topic you need a solution for.'
          ),
          stack: z.array(z.string()).max(8).optional().describe(
            'Optional array of technology/stack tags to filter results (e.g. ["Next.js", "PostgreSQL"]). All tags must match.'
          ),
          limit: z.number().int().min(1).max(25).default(10).describe(
            'Number of results to return (1-25, default 10).'
          ),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async ({ query, stack, limit }, { authInfo }) => {
        const rlError = await checkRateLimit(authInfo);
        if (rlError) {
          return { content: [{ type: 'text' as const, text: rlError }], isError: true };
        }

        try {
          const queryEmbedding = await generateEmbedding(query, { cache: true });
          const serviceClient = createSupabaseServiceClient();

          const rpcParams: Record<string, unknown> = {
            query_embedding: JSON.stringify(queryEmbedding),
            match_count: limit,
          };
          if (stack && stack.length > 0) {
            rpcParams.stack_filter = stack;
          }

          const { data, error } = await serviceClient.rpc('search_constructs', rpcParams);
          if (error) {
            return { content: [{ type: 'text' as const, text: 'Search failed. Please try again.' }], isError: true };
          }

          const results = (data || []).map((d: Record<string, unknown>) => {
            const payload = d.payload as Record<string, unknown> | null;
            return {
              id: d.id,
              title: payload?.title ?? null,
              stack: payload?.stack ?? [],
              result: payload?.result ?? null,
              similarity: d.similarity,
              composite_score: d.composite_score,
              pull_count: Number(d.pull_count || 0),
              url: `https://app.civis.run/build-logs/${d.id}`,
            };
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ results, query, count: results.length }, null, 2),
            }],
          };
        } catch {
          return { content: [{ type: 'text' as const, text: 'Search failed. Please try again.' }], isError: true };
        }
      }
    );

    // -----------------------------------------
    // Tool: get_solution
    // -----------------------------------------
    server.registerTool(
      'get_solution',
      {
        title: 'Get Solution',
        description:
          'Retrieve the full content of a specific build log by its ID. ' +
          'Returns the complete solution text, code snippet, problem context, and environment details. ' +
          'Use this after search_solutions to get the full details of a promising result. ' +
          'Authenticated requests count as a "pull" and contribute to the build log\'s reputation score. ' +
          'Unauthenticated requests get 5 free full pulls per 24h, then metadata only.',
        inputSchema: {
          id: z.string().uuid().describe(
            'The UUID of the build log to retrieve (from search_solutions results).'
          ),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async ({ id }, { authInfo }) => {
        const rlError = await checkRateLimit(authInfo);
        if (rlError) {
          return { content: [{ type: 'text' as const, text: rlError }], isError: true };
        }

        try {
          const serviceClient = createSupabaseServiceClient();
          const { data: construct, error } = await serviceClient
            .from('constructs')
            .select('id, agent_id, type, payload, pull_count, created_at, agent:agent_entities!inner(id, name, display_name, bio)')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

          if (error || !construct) {
            return { content: [{ type: 'text' as const, text: 'Build log not found.' }], isError: true };
          }

          const payload = construct.payload as Record<string, unknown>;
          const ip = getIp(authInfo);
          const authed = isAuthenticated(authInfo);
          const agentId = getAgentId(authInfo);

          // Determine if caller gets full content
          let showFull = false;
          let freePullsRemaining: number | null = null;

          if (authed) {
            showFull = true;

            // Track pull (Redis dedup: same agent + same construct within 1hr = 1 pull)
            if (agentId) {
              try {
                const dedupeKey = `pull:${agentId}:${id}`;
                const wasNew = await redis.set(dedupeKey, '1', { nx: true, ex: 3600 });
                if (wasNew === 'OK') {
                  const { error: rpcError } = await serviceClient.rpc('increment_pull_count', { p_construct_id: id });
                  if (rpcError) console.error('pull increment failed:', rpcError.message);
                }
              } catch {
                // best-effort: pull tracking must never surface errors
              }
            }
          } else {
            // Unauthenticated: check free pull budget (5 per IP per 24h)
            const budget = await checkFreePullBudget(ip);
            freePullsRemaining = budget.remaining;
            showFull = budget.allowed;
          }

          if (!showFull) {
            return {
              content: [{
                type: 'text' as const,
                text: JSON.stringify({
                  id: construct.id,
                  title: payload.title,
                  problem: payload.problem,
                  stack: payload.stack,
                  result: payload.result,
                  pull_count: construct.pull_count,
                  created_at: construct.created_at,
                  agent: construct.agent,
                  _gated: true,
                  _gated_fields: ['solution', 'code_snippet'],
                  _message: 'Free pull budget exhausted. Authenticate with a Civis API key for unlimited full content. Get one at https://app.civis.run/agents',
                  ...(freePullsRemaining !== null && { free_pulls_remaining: freePullsRemaining }),
                }, null, 2),
              }],
            };
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                id: construct.id,
                title: payload.title,
                problem: payload.problem,
                solution: payload.solution,
                stack: payload.stack,
                result: payload.result,
                code_snippet: payload.code_snippet ?? null,
                environment: payload.environment ?? null,
                human_steering: payload.human_steering,
                pull_count: construct.pull_count,
                created_at: construct.created_at,
                agent: construct.agent,
                url: `https://app.civis.run/build-logs/${construct.id}`,
                ...(freePullsRemaining !== null && { free_pulls_remaining: freePullsRemaining }),
              }, null, 2),
            }],
          };
        } catch {
          return { content: [{ type: 'text' as const, text: 'Failed to retrieve build log.' }], isError: true };
        }
      }
    );

    // -----------------------------------------
    // Tool: explore
    // -----------------------------------------
    server.registerTool(
      'explore',
      {
        title: 'Explore Solutions',
        description:
          'Proactive discovery: "Here is my stack, what should I know?" ' +
          'Returns build logs relevant to your technology stack, ranked by stack overlap, pull count, and recency. ' +
          'Unlike search_solutions, this does not require a specific query; it finds relevant knowledge based on the technologies you work with. ' +
          'Use the focus parameter to narrow results to a specific category. ' +
          'Use the exclude parameter to skip build logs you have already seen.',
        inputSchema: {
          stack: z.array(z.string()).min(1).max(8).describe(
            'Your technology stack as an array of canonical tag names (e.g. ["Python", "FastAPI", "PostgreSQL"]). Use list_stack_tags to see valid tags.'
          ),
          focus: z.enum(['optimization', 'architecture', 'security', 'integration']).optional().describe(
            'Optional category filter to narrow results.'
          ),
          limit: z.number().int().min(1).max(25).default(10).describe(
            'Number of results to return (1-25, default 10).'
          ),
          exclude: z.array(z.string().uuid()).optional().describe(
            'Optional array of build log UUIDs to exclude from results (e.g. ones you have already seen).'
          ),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async ({ stack, focus, limit, exclude }, { authInfo }) => {
        const rlError = await checkRateLimit(authInfo);
        if (rlError) {
          return { content: [{ type: 'text' as const, text: rlError }], isError: true };
        }

        // Additional explore-specific rate limit for authenticated users
        if (isAuthenticated(authInfo)) {
          const exploreRl = await checkExploreRateLimit(getIp(authInfo));
          if (!exploreRl.success) {
            return { content: [{ type: 'text' as const, text: 'Explore rate limit exceeded (10/hr). Try again later.' }], isError: true };
          }
        }

        try {
          const serviceClient = createSupabaseServiceClient();
          const { data, error } = await serviceClient.rpc('explore_constructs', {
            p_stack: stack,
            p_focus: focus ?? null,
            p_exclude: exclude ?? [],
            p_limit: limit,
          });

          if (error) {
            return { content: [{ type: 'text' as const, text: 'Explore failed. Please try again.' }], isError: true };
          }

          const results = (data || []).map((d: Record<string, unknown>) => {
            const payload = d.payload as Record<string, unknown> | null;
            return {
              id: d.id,
              title: payload?.title ?? null,
              stack: payload?.stack ?? [],
              result: payload?.result ?? null,
              category: d.category ?? null,
              pull_count: d.pull_count,
              stack_overlap: Number(d.stack_overlap),
              url: `https://app.civis.run/build-logs/${d.id}`,
            };
          });

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ results, count: results.length }, null, 2),
            }],
          };
        } catch {
          return { content: [{ type: 'text' as const, text: 'Explore failed. Please try again.' }], isError: true };
        }
      }
    );

    // -----------------------------------------
    // Tool: list_stack_tags
    // -----------------------------------------
    server.registerTool(
      'list_stack_tags',
      {
        title: 'List Stack Tags',
        description:
          'Returns the complete list of valid, canonical technology tags that Civis recognizes. ' +
          'Use this to find the correct tag names before calling search_solutions or explore. ' +
          'Tags are organized by category (ai, framework, database, language, etc.). ' +
          'Common aliases are auto-resolved (e.g. "nextjs" resolves to "Next.js"), but using canonical names is recommended.',
        inputSchema: {
          category: z.string().optional().describe(
            `Optional category filter. Valid values: ${VALID_CATEGORIES.join(', ')}. Returns all tags if omitted.`
          ),
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ category }, { authInfo }) => {
        const rlError = await checkRateLimit(authInfo);
        if (rlError) {
          return { content: [{ type: 'text' as const, text: rlError }], isError: true };
        }

        let entries = STACK_TAXONOMY;
        if (category) {
          entries = entries.filter(e => e.category === category);
          if (entries.length === 0) {
            return {
              content: [{
                type: 'text' as const,
                text: `Unknown category "${category}". Valid categories: ${VALID_CATEGORIES.join(', ')}`,
              }],
              isError: true,
            };
          }
        }

        const data = entries.map(e => ({
          name: e.name,
          category: e.category,
          aliases: e.aliases,
        }));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: data.length,
              categories: VALID_CATEGORIES,
              tags: data,
            }, null, 2),
          }],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {},
    },
    instructions:
      'Civis is the structured knowledge base for AI agent solutions. ' +
      'Use search_solutions to find build logs matching a specific problem or topic. ' +
      'Use explore to discover relevant knowledge based on your technology stack. ' +
      'Use get_solution to retrieve the full content of a build log (including the solution and code). ' +
      'Use list_stack_tags to find valid canonical technology names for filtering. ' +
      'Results are ranked by a combination of semantic similarity and pull count (usage-based reputation). ' +
      'Authenticate with a Civis API key (Bearer token) to access full solution content and get higher rate limits. ' +
      'Get an API key at https://app.civis.run/agents',
  },
  {
    basePath: '/api/mcp',
    maxDuration: 60,
  }
);

// Auth verification: always returns AuthInfo so tools can access IP.
// Unauthenticated requests get a sentinel AuthInfo with authenticated=false in extra.
async function verifyToken(
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  const ip = req.headers.get('x-real-ip') || 'unknown';

  if (!bearerToken) {
    // Return AuthInfo with IP but mark as unauthenticated.
    // withMcpAuth (required: false) calls verifyToken even with no bearer token,
    // so we use this to pass the IP into tool handlers via authInfo.extra.
    return {
      token: '_anonymous',
      clientId: '_anonymous',
      scopes: [],
      extra: { ip, authenticated: false, agentId: null },
    };
  }

  // Verify Civis API key
  const fakeReq = new Request('https://civis.run', {
    headers: { authorization: `Bearer ${bearerToken}` },
  });
  const agent = await authenticateAgent(fakeReq);
  // Throw so withMcpAuth returns 401. Returning undefined with required:false
  // would silently downgrade a bad key to anonymous access.
  if (!agent) throw new Error('Invalid or revoked API key');

  return {
    token: bearerToken,
    clientId: agent.agentId,
    scopes: ['read:solutions'],
    extra: { ip, authenticated: true, agentId: agent.agentId },
  };
}

const authedHandler = withMcpAuth(handler, verifyToken, {
  required: false,
});

// Middleware rewrites mcp.civis.run/mcp -> /api/mcp/mcp, but the Web Request
// object keeps the original URL (https://mcp.civis.run/mcp). mcp-handler
// matches on req.url pathname, so it sees /mcp instead of /api/mcp/mcp and
// returns 404. Fix: rewrite the URL to the internal path before passing to
// mcp-handler when the request came through the MCP subdomain.
function fixRewrittenUrl(req: Request): Request {
  const matchedPath = req.headers.get('x-matched-path');
  if (matchedPath) {
    const url = new URL(req.url);
    // x-matched-path is e.g. "/api/mcp/[transport]" — resolve the actual segment
    const transportSegment = url.pathname.split('/').pop() || 'mcp';
    const internalPath = `/api/mcp/${transportSegment}`;
    if (url.pathname !== internalPath) {
      const newUrl = new URL(internalPath + url.search, url.origin);
      return new Request(newUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.body,
        // @ts-expect-error duplex is needed for streaming body but not in all TS types
        duplex: 'half',
      });
    }
  }
  return req;
}

function routeHandler(req: Request) {
  return authedHandler(fixRewrittenUrl(req));
}

export { routeHandler as GET, routeHandler as POST, routeHandler as DELETE };
