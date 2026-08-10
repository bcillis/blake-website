import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Websites",
  description:
    "A running index of tools, references and resources worth knowing about — collected while studying and building software.",
  path: "/websites",
});

export default function WebsitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
