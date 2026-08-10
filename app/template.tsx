"use client";

import { ReactNode } from "react";

/**
 * Page transition.
 *
 * Deliberately CSS-only: a Framer Motion `initial={{ opacity: 0 }}` here gets
 * serialized into the prerendered HTML as `style="opacity:0"`, which hides the
 * entire page from anything that doesn't run JS (and delays LCP for everyone
 * else). The `page-enter` animation in globals.css starts from opacity 0 too,
 * but only ever applies once the stylesheet has loaded and animations run —
 * so the served markup stays visible.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
