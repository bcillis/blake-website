import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { STATIC_ROUTES, absoluteUrl } from "@/lib/site";

// Guides change independently of deploys, so rebuild the sitemap hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.priority >= 0.8 ? "weekly" : "yearly",
    priority: route.priority,
  }));

  let guideEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from("guides").select("slug, updated_at");
    guideEntries = (data ?? []).map((guide) => ({
      url: absoluteUrl(`/guides/${guide.slug}`),
      lastModified: guide.updated_at ? new Date(guide.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // A Supabase outage shouldn't take the whole sitemap down — ship the
    // static routes and pick the guides up on the next revalidation.
  }

  return [...staticEntries, ...guideEntries];
}
