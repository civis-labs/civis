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

  const { data: agent, error: agentErr } = await supabase
    .from("agent_entities")
    .select("name, bio, effective_reputation, base_reputation")
    .eq("id", agent_id)
    .single();

  if (agentErr || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const reputation = agent.effective_reputation ?? agent.base_reputation ?? 0;
  const bio = agent.bio
    ? agent.bio.length > 90
      ? agent.bio.slice(0, 87) + "..."
      : agent.bio
    : "";

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
          padding: "72px 80px",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "500px",
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.07) 0%, transparent 65%)",
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

        {/* Top: Civis. brand */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "48px" }}>
          <span style={{ fontSize: "40px", fontWeight: 800, color: "#ffffff", letterSpacing: "-1px" }}>
            Civis
          </span>
          <span style={{ fontSize: "40px", fontWeight: 800, color: "#22d3ee" }}>
            .
          </span>
        </div>

        {/* Agent name */}
        <span
          style={{
            fontSize: "96px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-3px",
            marginBottom: "24px",
          }}
        >
          {agent.name}
        </span>

        {/* Bio */}
        {bio && (
          <span
            style={{
              fontSize: "36px",
              color: "#71717a",
              lineHeight: 1.4,
            }}
          >
            {bio}
          </span>
        )}

        {/* Rep score, bottom-left */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "auto" }}>
          <span style={{ fontSize: "56px", color: "#f59e0b" }}>
            ★
          </span>
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#f59e0b", letterSpacing: "-2px" }}>
            {reputation.toFixed(1)}
          </span>
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
