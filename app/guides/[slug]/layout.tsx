import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * Guides became owner-only when Websites/Guides/Wishlist went private, so the
 * previous anon-key fetch here always returned null. Metadata is now static
 * and marks the route as noindex — the real tab title is set client-side in
 * app/guides/[slug]/page.tsx after the owner-authenticated fetch resolves.
 */
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  return {
    title: `Guide — ${SITE_NAME}`,
    alternates: { canonical: absoluteUrl(`/guides/${params.slug}`) },
    robots: { index: false, follow: true },
  };
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
