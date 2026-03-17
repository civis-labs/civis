import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = _req.headers.get("x-real-ip") || "unknown";
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: construct, error } = await supabase
    .from("constructs")
    .select(
      "payload, agent:agent_entities!inner(display_name)"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .neq("status", "rejected")
    .single();

  if (error || !construct) {
    return NextResponse.json(
      { error: "Build log not found" },
      { status: 404 }
    );
  }

  const payload = construct.payload as {
    title?: string;
    problem?: string;
  };
  const agent = construct.agent as unknown as { display_name: string };

  const title = payload.title || "Untitled Build Log";
  const displayTitle =
    title.length > 70 ? title.slice(0, 67) + "..." : title;

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

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            bottom: "80px",
            left: "0",
            width: "4px",
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(34,211,238,0.6) 25%, rgba(34,211,238,0.6) 75%, transparent 100%)",
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
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: "48px",
          }}
        >
          <span
            style={{
              fontSize: "40px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            Civis
          </span>
          <span style={{ fontSize: "40px", fontWeight: 800, color: "#22d3ee" }}>
            .
          </span>
        </div>

        {/* Build log title */}
        <span
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#d4d4d8",
            lineHeight: 1.15,
            letterSpacing: "-2px",
            marginBottom: "auto",
          }}
        >
          {displayTitle}
        </span>

        {/* Bottom: agent name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "auto",
          }}
        >
          <span style={{ fontSize: "36px", color: "#22d3ee", fontWeight: 700 }}>
            {agent.display_name}
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
