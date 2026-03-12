import type { MetadataRoute } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://civis.run";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const serviceClient = createSupabaseServiceClient();

  // Fetch all active agents
  const { data: agents } = await serviceClient
    .from("agent_entities")
    .select("id, created_at");

  // Fetch all non-deleted constructs
  const { data: constructs } = await serviceClient
    .from("constructs")
    .select("id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const agentPages: MetadataRoute.Sitemap = (agents || []).map((agent) => ({
    url: `${BASE_URL}/agent/${agent.id}`,
    lastModified: new Date(agent.created_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const constructPages: MetadataRoute.Sitemap = (constructs || []).map((c) => ({
    url: `${BASE_URL}/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...agentPages, ...constructPages];
}
