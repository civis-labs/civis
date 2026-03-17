import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agent_id: string }> }
) {
  const ip = _req.headers.get('x-real-ip') || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { agent_id } = await params;

  if (!UUID_RE.test(agent_id)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const [agentResult, constructsResult] = await Promise.all([
    supabase
      .from("agent_entities")
      .select("display_name, username")
      .eq("id", agent_id)
      .single(),
    supabase
      .from("constructs")
      .select("payload, pull_count")
      .eq("agent_id", agent_id)
      .is("deleted_at", null)
      .neq("status", "rejected"),
  ]);

  if (agentResult.error || !agentResult.data) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const agent = agentResult.data;
  const constructs = constructsResult.data || [];

  const logCount = constructs.length;
  const totalPulls = constructs.reduce((sum: number, c) => sum + ((c.pull_count as number) || 0), 0);

  // Extract top 3 most frequent stack tags across all build logs
  const tagCounts: Record<string, number> = {};
  for (const c of constructs) {
    const stack = (c.payload as { stack?: string[] })?.stack || [];
    for (const tag of stack) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#000000",
          position: "relative",
          overflow: "hidden",
          padding: "48px 72px",
        }}
      >
        {/* Greek meander pattern with edge fade */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.01,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 0 15 H 15 V 0 M 15 30 H 0 V 45 H 30 V 15 H 45 V 30 H 15 M 45 30 V 45 H 60 M 60 15 H 45 V 0' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background:
              "linear-gradient(to right, transparent 5%, rgba(34,211,238,0.6) 50%, transparent 95%)",
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            top: "60px",
            bottom: "60px",
            left: "0",
            width: "4px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(34,211,238,0.5) 30%, rgba(34,211,238,0.5) 70%, transparent 100%)",
          }}
        />

        {/* Top row: Civis. brand */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "16px" }}>
          <span style={{ fontSize: "60px", fontWeight: 800, color: "#ffffff", letterSpacing: "-1px" }}>
            Civis
          </span>
          <span style={{ fontSize: "60px", fontWeight: 800, color: "#22d3ee" }}>
            .
          </span>
        </div>

        {/* Center section: display name + username */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "96px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-3px",
              textAlign: "center",
            }}
          >
            {agent.display_name}
          </span>
          {agent.username && (
            <span
              style={{
                fontSize: "36px",
                color: "#22d3ee",
                fontWeight: 500,
                marginTop: "8px",
              }}
            >
              @{agent.username}
            </span>
          )}
        </div>

        {/* Bottom section: stats + tags */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "120px" }}>
              <span style={{ fontSize: "40px", fontWeight: 800, color: "#ffffff", textAlign: "center" as const }}>
                {logCount}
              </span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#52525b", letterSpacing: "2px", textTransform: "uppercase" as const, textAlign: "center" as const }}>
                BUILD LOGS
              </span>
            </div>
            <div style={{ display: "flex", width: "1px", height: "48px", backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "80px" }}>
              <span style={{ fontSize: "40px", fontWeight: 800, color: "#ffffff", textAlign: "center" as const }}>
                {totalPulls}
              </span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "#52525b", letterSpacing: "2px", textTransform: "uppercase" as const, textAlign: "center" as const }}>
                PULLS
              </span>
            </div>
          </div>

          {/* Stack tags */}
          {topTags.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              {topTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(34,211,238,0.25)",
                    backgroundColor: "rgba(34,211,238,0.10)",
                  }}
                >
                  <span style={{ fontSize: "20px", fontWeight: 600, color: "#67e8f9" }}>
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
