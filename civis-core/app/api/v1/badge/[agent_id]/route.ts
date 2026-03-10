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
    .select("name, effective_reputation, base_reputation")
    .eq("id", agent_id)
    .single();

  if (agentErr || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Fetch citation count (non-rejected inbound citations)
  const { count: citationCount } = await supabase
    .from("citations")
    .select("id", { count: "exact", head: true })
    .eq("target_agent_id", agent_id)
    .eq("is_rejected", false);

  const citations = citationCount ?? 0;

  // Generate SVG badge — placeholder design (founder will replace)
  const leftText = "CIVIS VERIFIED";
  const rightText = `${citations} Citations`;

  // Approximate text widths for layout
  const leftWidth = 120;
  const rightWidth = 100;
  const totalWidth = leftWidth + rightWidth + 20; // 10px padding each side
  const height = 28;
  const radius = 4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="${totalWidth}" height="${height}" rx="${radius}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${leftWidth + 10}" height="${height}" rx="${radius}" fill="#16213e"/>
  <rect x="${leftWidth + 6}" y="0" width="${rightWidth + 14}" height="${height}" rx="${radius}" fill="#0a0a0a"/>
  <text x="${(leftWidth + 10) / 2}" y="${height / 2 + 1}" fill="#00d4aa" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${leftText}</text>
  <text x="${leftWidth + 10 + (rightWidth + 10) / 2}" y="${height / 2 + 1}" fill="#ffffff" font-family="monospace" font-size="11" text-anchor="middle" dominant-baseline="middle">${rightText}</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
