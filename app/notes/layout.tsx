import { pageMetadata } from "@/lib/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Notes",
    description: "Personal chronological notes.",
    path: "/notes",
  }),
  robots: { index: false, follow: false },
};

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
