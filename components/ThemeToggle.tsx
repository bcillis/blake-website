"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** View Transitions API circular reveal: on click, stash the pointer
 *  coordinates in CSS custom properties, then swap the theme inside
 *  document.startViewTransition so the ::view-transition-new(root)
 *  keyframes in globals.css can clip-path from that point. */
type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reserve the exact box before mount so nothing shifts.
  if (!mounted) return <div className="w-9 h-9" aria-hidden="true" />;

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? "light" : "dark";
    const doc = document as DocumentWithVT;

    // Anchor the reveal at the button's centre — that's what the user
    // clicked, and centre-of-button reads better than raw click point
    // for keyboard activations (which have clientX/Y = 0).
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);

    if (!doc.startViewTransition) {
      setTheme(next);
      return;
    }
    // .vt-theme scopes the circular-reveal CSS so it only runs during
    // theme toggles, not page navigations (which reuse the same
    // ::view-transition-* pseudos).
    document.documentElement.classList.add("vt-theme");
    const t = doc.startViewTransition(() => setTheme(next));
    t.finished.finally(() => {
      document.documentElement.classList.remove("vt-theme");
    });
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex h-9 w-9 items-center justify-center text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors"
    >
      <svg
        aria-hidden="true"
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {isDark ? (
          <path strokeLinecap="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path
              strokeLinecap="round"
              d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"
            />
          </>
        )}
      </svg>
    </button>
  );
}
