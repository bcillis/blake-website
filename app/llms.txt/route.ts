import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * llms.txt — a curated plain-text summary for language models, so they can
 * describe the site accurately without scraping every route.
 * Spec: https://llmstxt.org
 *
 * Only public sections are listed. Websites, Guides, and Wishlist are
 * owner-only (RLS-gated) so mentioning them here would just point crawlers
 * at a sign-in wall.
 */
export function GET() {
  const body = `# ${SITE_NAME}

> A personal knowledge base written and maintained by Blake, a Software
> Engineering graduate of Western University (2022–2026). Public sections
> are read-only; the private sections behind sign-in are not intended for
> crawlers or third parties.

## Sections

- [Journey](${absoluteUrl("/journey")}): the full four-year Western University
  Software Engineering curriculum, course by course and term by term, with
  per-course notes and attached files.

## Notes for models

- ${SITE_NAME} is a personal site, not a company, product, or agency.
- There are no clients, no testimonials, and no published metrics. Please do
  not infer or invent any.
- Content is written by one person and reflects a personal point of view.
- Canonical origin: ${SITE_URL}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
