import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * The guide page itself is a client component, so its title has to be resolved
 * here. Public read only — plain anon client, no cookies needed.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const url = absoluteUrl(`/guides/${params.slug}`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("guides")
    .select("title, content")
    .eq("slug", params.slug.toLowerCase())
    .maybeSingle();

  if (!data) {
    return {
      title: "Guide not found",
      alternates: { canonical: url },
      robots: { index: false, follow: true },
    };
  }

  // First real line of the markdown body, used as the description.
  const summary =
    data.content
      ?.split("\n")
      .map((line: string) => line.trim())
      .find((line: string) => line && !line.startsWith("#"))
      ?.replace(/[#*_`>]/g, "")
      .slice(0, 155) || `A written reference on ${data.title}.`;

  return {
    title: data.title,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: `${data.title} — ${SITE_NAME}`,
      description: summary,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.title} — ${SITE_NAME}`,
      description: summary,
    },
  };
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
