import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * Note titles are private (RLS blocks reads without a session), so
 * generateMetadata running server-side with the anon key can never resolve
 * the real title. This is intentional — we always fall back to "Notes" and
 * mark every note route as non-indexable.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const url = absoluteUrl(`/notes/${params.id}`);
  return {
    title: "Notes",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `Notes — ${SITE_NAME}`,
      url,
    },
    robots: { index: false, follow: false },
  };
}

export default function NoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
