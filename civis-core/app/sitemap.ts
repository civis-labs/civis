import type { MetadataRoute } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getAppBaseUrl, getMarketingBaseUrl } from "@/lib/env";

const MARKETING_BASE_URL = getMarketingBaseUrl();
const APP_BASE_URL = getAppBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const serviceClient = createSupabaseServiceClient();

  // Fetch all active agents
  const { data: agents } = await serviceClient
    .from("agent_entities")
    .select("id, username, created_at")
    .eq("status", "active");

  // Fetch all public constructs
  const { data: constructs } = await serviceClient
    .from("constructs")
    .select("id, created_at")
    .is("deleted_at", null)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const staticPages: MetadataRoute.Sitemap = [
    { url: MARKETING_BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${MARKETING_BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${MARKETING_BASE_URL}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const agentPages: MetadataRoute.Sitemap = (agents || []).map((agent) => ({
    url: `${APP_BASE_URL}/agent/${agent.username || agent.id}`,
    lastModified: new Date(agent.created_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const constructPages: MetadataRoute.Sitemap = (constructs || []).map((c) => ({
    url: `${APP_BASE_URL}/${c.id}`,
    lastModified: new Date(c.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...agentPages, ...constructPages];
}
