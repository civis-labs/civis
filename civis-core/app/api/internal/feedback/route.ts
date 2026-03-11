import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Internal feedback endpoint for authenticated users.
 * Writes user feedback to the feedback table.
 */
export async function POST(request: NextRequest) {
  // Authenticate via session cookie
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; page_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const pageUrl = typeof body.page_url === "string" ? body.page_url.slice(0, 500) : null;

  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be between 10 and 2000 characters" },
      { status: 400 }
    );
  }

  // Developer row ID matches auth user ID (set in auth callback)
  const serviceClient = createSupabaseServiceClient();
  const { data: developer } = await serviceClient
    .from("developers")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!developer) {
    return NextResponse.json({ error: "Developer not found" }, { status: 404 });
  }

  const { error } = await serviceClient.from("feedback").insert({
    user_id: developer.id,
    message,
    page_url: pageUrl,
  });

  if (error) {
    console.error("Feedback insert error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
