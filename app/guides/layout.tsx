import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Guides",
  description:
    "Written references for tools and technologies I keep coming back to — the notes I'd want if I were starting over.",
  path: "/guides",
});

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
