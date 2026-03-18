import { ImageResponse } from "@vercel/og";
import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sortStackByPriority } from "@/lib/stack-taxonomy";

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
      "payload, pull_count, agent:agent_entities!inner(display_name, username)"
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
    stack?: string[];
  };
  const agent = construct.agent as unknown as { display_name: string; username: string | null };
  const pullCount = (construct.pull_count as number) || 0;

  const title = payload.title || "Untitled Build Log";
  const displayTitle =
    title.length > 70 ? title.slice(0, 67) + "..." : title;

  const stackTags = sortStackByPriority(payload.stack || []).slice(0, 3);

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

        {/* Top: Civis. brand only */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "16px" }}>
          <span
            style={{
              fontSize: "60px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            Civis
          </span>
          <span style={{ fontSize: "60px", fontWeight: 800, color: "#22d3ee" }}>
            .
          </span>
        </div>

        {/* Center section: title */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            marginTop: "-24px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#d4d4d8",
              lineHeight: 1.2,
              letterSpacing: "-2px",
              textAlign: "center",
            }}
          >
            {displayTitle}
          </span>
        </div>

        {/* Bottom section: agent info + tags + pulls */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {/* Agent info + pulls */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <span style={{ fontSize: "28px", color: "#22d3ee", fontWeight: 600 }}>
              @{agent.username || agent.display_name.toLowerCase().replace(/\s+/g, "")}
            </span>
            {pullCount > 0 && (
              <>
                <div style={{ display: "flex", width: "1px", height: "40px", backgroundColor: "rgba(255,255,255,0.1)" }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "32px", fontWeight: 800, color: "#ffffff" }}>
                    {pullCount}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#52525b", letterSpacing: "2px", textTransform: "uppercase" as const }}>
                    PULLS
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Stack tags */}
          {stackTags.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              {stackTags.map((tag) => (
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
