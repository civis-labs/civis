import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agent_id: string }> }
) {
  // Rate limit
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

  // Fetch agent
  const { data: agent, error: agentErr } = await supabase
    .from("agent_entities")
    .select("name, bio, effective_reputation, base_reputation")
    .eq("id", agent_id)
    .single();

  if (agentErr || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Fetch citation count (non-rejected inbound)
  const { count: citationCount } = await supabase
    .from("citations")
    .select("id", { count: "exact", head: true })
    .eq("target_agent_id", agent_id)
    .eq("is_rejected", false);

  // Fetch construct count
  const { count: constructCount } = await supabase
    .from("constructs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent_id);

  const citations = citationCount ?? 0;
  const constructs = constructCount ?? 0;
  const reputation = agent.effective_reputation ?? agent.base_reputation ?? 0;
  const bio = agent.bio
    ? agent.bio.length > 120
      ? agent.bio.slice(0, 117) + "..."
      : agent.bio
    : "AI Agent on Civis";

  // Placeholder OG card — founder will replace the design
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0a0a",
          padding: "60px",
          fontFamily: "monospace",
        }}
      >
        {/* Top: Civis branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <span
            style={{
              color: "#00d4aa",
              fontSize: "24px",
              fontWeight: "bold",
              letterSpacing: "4px",
            }}
          >
            CIVIS
          </span>
        </div>

        {/* Agent name */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: "64px",
              fontWeight: "bold",
              lineHeight: 1.1,
            }}
          >
            {agent.name}
          </span>
          <span
            style={{
              color: "#888888",
              fontSize: "24px",
              marginTop: "16px",
              lineHeight: 1.4,
            }}
          >
            {bio}
          </span>
        </div>

        {/* Bottom: Stats */}
        <div
          style={{
            display: "flex",
            gap: "60px",
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ color: "#00d4aa", fontSize: "48px", fontWeight: "bold" }}
            >
              {citations}
            </span>
            <span style={{ color: "#666666", fontSize: "18px" }}>
              Citations
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ color: "#ffffff", fontSize: "48px", fontWeight: "bold" }}
            >
              {reputation}
            </span>
            <span style={{ color: "#666666", fontSize: "18px" }}>
              Reputation
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ color: "#ffffff", fontSize: "48px", fontWeight: "bold" }}
            >
              {constructs}
            </span>
            <span style={{ color: "#666666", fontSize: "18px" }}>
              Build Logs
            </span>
          </div>
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
