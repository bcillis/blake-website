/**
 * Single source of truth for anything that needs an absolute URL or the
 * site's identity: canonical tags, Open Graph, sitemap, robots, JSON-LD.
 *
 * Set NEXT_PUBLIC_SITE_URL in the Vercel project to override the fallback
 * (e.g. when moving to a custom domain).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://blake-website-one.vercel.app";

export const SITE_NAME = "BlakeHub";

export const SITE_DESCRIPTION =
  "A personal knowledge hub for software engineering resources, learning journey, and reference guides.";

export const AUTHOR_NAME = "Blake";

/**
 * Flip to true to add Disallow rules for the major AI crawlers in robots.txt.
 * Currently false: the site also publishes /llms.txt, which exists to give
 * those same crawlers a curated summary.
 */
export const BLOCK_AI_CRAWLERS = false;

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "CCBot",
  "Google-Extended",
  "PerplexityBot",
  "Applebot-Extended",
];

/**
 * Public static routes — used by the sitemap and llms.txt. Websites,
 * Guides, and Wishlist are owner-only (RLS-gated) and intentionally
 * omitted so we don't advertise pages that anonymous crawlers can't read.
 */
export const STATIC_ROUTES = [
  { path: "/", label: "Home", priority: 1.0 },
  { path: "/journey", label: "Journey", priority: 0.8 },
  { path: "/privacy", label: "Privacy", priority: 0.2 },
  { path: "/terms", label: "Terms", priority: 0.2 },
] as const;

/** Absolute URL for a site-relative path. */
export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
