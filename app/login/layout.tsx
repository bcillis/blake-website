import { pageMetadata } from "@/lib/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Sign in",
    description: "Owner sign-in for BlakeHub.",
    path: "/login",
  }),
  // Nothing to gain from indexing a single-user login form.
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
