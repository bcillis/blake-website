import type { MetadataRoute } from "next";
import { STATIC_ROUTES, absoluteUrl } from "@/lib/site";

/**
 * Sitemap covers only the truly public surface. Websites, Guides, and
 * Wishlist are owner-only under RLS now, so they aren't included — an
 * anonymous crawler would just hit a "Sign in" wall.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.priority >= 0.8 ? "weekly" : "yearly",
    priority: route.priority,
  }));
}
