import type { MetadataRoute } from "next";
import {
  SITE_URL,
  BLOCK_AI_CRAWLERS,
  AI_CRAWLER_USER_AGENTS,
  absoluteUrl,
} from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    { userAgent: "*", allow: "/", disallow: ["/login"] },
  ];

  if (BLOCK_AI_CRAWLERS) {
    rules.push(...AI_CRAWLER_USER_AGENTS.map((ua) => ({ userAgent: ua, disallow: "/" })));
  }

  return {
    rules,
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
