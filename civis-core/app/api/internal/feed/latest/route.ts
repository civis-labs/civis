import { NextRequest, NextResponse } from "next/server";
import { checkPublicReadRateLimit } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-real-ip") || "unknown";
  const rateLimit = await checkPublicReadRateLimit(ip);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const serviceClient = createSupabaseServiceClient();
  const { data } = await serviceClient
    .from("constructs")
    .select("created_at")
    .is("deleted_at", null)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ latest: data?.created_at ?? null });
}
