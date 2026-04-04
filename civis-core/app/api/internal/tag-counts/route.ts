import { NextRequest, NextResponse } from "next/server";
import { checkPublicReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal endpoint returning tag usage counts.
 * Used by the search page technology dropdown.
 * Not part of the public V1 API.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") || "unknown";
  const rateLimit = await checkPublicReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient.rpc("get_tag_counts");

  if (error || !data) {
    return NextResponse.json({ data: [] });
  }

  const tags = (data as { tag: string; count: number }[]).map((row) => ({
    tag: row.tag,
    count: Number(row.count),
  }));

  return NextResponse.json(
    { data: tags },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
