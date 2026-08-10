import { createClient } from "@supabase/supabase-js";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * llms.txt — a curated plain-text summary for language models, so they can
 * describe the site accurately without scraping every route.
 * Spec: https://llmstxt.org
 */
export async function GET() {
  let guideLines = "";
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.from("guides").select("title, slug");
    if (data?.length) {
      guideLines = data
        .map((g) => `- [${g.title}](${absoluteUrl(`/guides/${g.slug}`)})`)
        .join("\n");
    }
  } catch {
    // Fall through to the static section list.
  }

  const body = `# ${SITE_NAME}

> A personal knowledge base written and maintained by Blake, a Software
> Engineering graduate of Western University (2022–2026). Everything here is
> first-hand: links actually used, courses actually taken, notes actually
> written. Public to read, single-author to write.

## Sections

- [Websites](${absoluteUrl("/websites")}): an index of tools and resources
  collected while studying and building software, each with a short note.
- [Journey](${absoluteUrl("/journey")}): the full four-year Western University
  Software Engineering curriculum, course by course and term by term, with
  per-course notes and attached files.
- [Guides](${absoluteUrl("/guides")}): long-form written references for tools
  and technologies, authored in Markdown.
- [Wishlist](${absoluteUrl("/wishlist")}): gear and gadgets on my radar, in CAD.

## Guides
${guideLines || "- (No guides published yet.)"}

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
