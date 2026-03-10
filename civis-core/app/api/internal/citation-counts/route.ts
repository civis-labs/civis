import { NextRequest, NextResponse } from "next/server";
import { checkReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal endpoint for batch-fetching citation counts.
 * Used by the client-side "Load More" component.
 * Not part of the public V1 API.
 */
export async function POST(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = await checkReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: { ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    body.ids.length > 100 ||
    !body.ids.every((id) => typeof id === "string" && uuidRegex.test(id))
  ) {
    return NextResponse.json({ error: "ids must be an array of 1-100 valid UUIDs" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  const { data, error } = await serviceClient.rpc("get_citation_counts", {
    construct_ids: body.ids,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch citation counts" }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.construct_id] = Number(row.citation_count);
  }

  return NextResponse.json({ counts });
}
