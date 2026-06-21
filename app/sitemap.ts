import type { MetadataRoute } from "next";
import { SCAM_GUIDES } from "@/app/lib/scamGuides";
import { SITE_URL } from "@/app/lib/site";
import { getSupabaseAdmin } from "@/app/lib/supabase";

export const revalidate = 3600;

async function getEntityPageUrls(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  // Fetch up to 5 000 entity pages, highest check-count first
  const { data, error } = await supabase
    .from("entity_pages")
    .select("entity_type, slug, last_checked_at, risk_level, check_count")
    .order("check_count", { ascending: false })
    .limit(5000);

  if (error || !data) return [];

  return data.map((e) => ({
    url: `${SITE_URL}/c/${e.entity_type}/${e.slug}`,
    lastModified: new Date(e.last_checked_at as string),
    changeFrequency: "daily" as const,
    // Likely-scam pages with many checks are the most valuable for searchers
    priority: e.risk_level === "likely_scam" ? 0.8 : 0.6,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entityUrls = await getEntityPageUrls();

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/scams`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...SCAM_GUIDES.map((guide) => ({
      url: `${SITE_URL}/scams/${guide.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...entityUrls,
  ];
}
