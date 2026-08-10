"use client";

import { ReactNode } from "react";

/**
 * Entrance animations, CSS-driven.
 *
 * These used to be Framer Motion components with `initial={{ opacity: 0 }}`.
 * That state is serialized into the prerendered HTML as `style="opacity:0"`,
 * so every wrapped element was invisible to anything that doesn't execute JS,
 * and invisible to everyone until hydration finished. A CSS keyframe starting
 * at opacity 0 has neither problem: the markup ships visible, and the animation
 * runs off the stylesheet. Under `prefers-reduced-motion` the global rule in
 * globals.css collapses the duration, landing straight on the end state.
 */

interface FadeUpProps {
  delay?: number;
  children: ReactNode;
  className?: string;
}

export function FadeUp({ delay = 0, children, className }: FadeUpProps) {
  return (
    <div
      className={`fade-up${className ? ` ${className}` : ""}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/** Container whose direct children stagger in — see `.stagger` in globals.css. */
export function StaggerGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`stagger${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function StaggerCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
