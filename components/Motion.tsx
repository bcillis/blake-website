"use client";

import { ReactNode } from "react";

/**
 * Entrance animation, CSS-driven.
 *
 * This was a Framer Motion component with `initial={{ opacity: 0 }}`, which
 * serialized into the prerendered HTML as `style="opacity:0"` — hiding the
 * content from anything that doesn't execute JS and delaying LCP for everyone
 * else. The `.fade-up` keyframe in globals.css has neither problem: the markup
 * ships visible, and `prefers-reduced-motion` collapses the duration so it
 * lands straight on the end state.
 */
export function FadeUp({
  delay = 0,
  children,
  className,
}: {
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fade-up${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
