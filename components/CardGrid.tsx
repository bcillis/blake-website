"use client";

import { ReactNode } from "react";

/** Responsive card grid: 1 col below sm, 2 at sm, 4 at md+. Matches the
 *  4-column density chosen for the Websites and Wishlist redesigns. */
export default function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
      {children}
    </div>
  );
}
