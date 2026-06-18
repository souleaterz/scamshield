import type { MetadataRoute } from "next";
import { SCAM_GUIDES } from "@/app/lib/scamGuides";
import { SITE_URL } from "@/app/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/scams`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...SCAM_GUIDES.map((guide) => ({
      url: `${SITE_URL}/scams/${guide.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
