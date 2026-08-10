import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Wishlist",
  description: "Gear and gadgets currently on my radar, with prices in CAD.",
  path: "/wishlist",
});

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
