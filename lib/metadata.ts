import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "./site";

/**
 * Builds a per-route Metadata object with a unique title, description,
 * canonical URL and Open Graph block. Route segments are client components,
 * so each one carries a sibling `layout.tsx` that calls this.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${title} — ${SITE_NAME}`,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE_NAME}`,
      description,
    },
  };
}
