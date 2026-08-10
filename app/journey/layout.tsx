import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Journey",
  description:
    "Four years of Software Engineering at Western University, laid out course by course — every term, every topic, with notes attached.",
  path: "/journey",
});

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
