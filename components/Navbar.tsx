"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/websites", label: "Websites" },
  { href: "/journey", label: "Journey" },
  { href: "/guides", label: "Guides" },
  { href: "/wishlist", label: "Wishlist" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--bg)] transition-colors duration-150 ${
        scrolled ? "border-b border-[var(--rule)]" : "border-b border-transparent"
      }`}
    >
      <div className="max-w-page mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="group flex items-baseline gap-2.5">
            {/* Flat monogram — the gradient tile is gone, the mark is not. */}
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 shrink-0 translate-y-1 items-center justify-center bg-[var(--accent)] font-serif text-sm font-semibold text-[var(--accent-ink)]"
              style={{ borderRadius: "2px" }}
            >
              B
            </span>
            <span className="font-serif text-lg tracking-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
              BlakeHub
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <span aria-hidden="true" className="mx-2 h-4 w-px bg-[var(--rule)]" />
            <ThemeToggle />
            {loading ? (
              <span className="btn-bare ml-2 opacity-0" aria-hidden="true">
                Sign in
              </span>
            ) : user ? (
              <button onClick={signOut} className="btn-bare ml-2">
                Sign out
              </button>
            ) : (
              <Link href="/login" className="btn-bare ml-2">
                Sign in
              </Link>
            )}
          </nav>

          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              className="p-2 text-[var(--ink-2)] hover:text-[var(--accent)] transition-colors"
            >
              <svg
                aria-hidden="true"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" d="M3 7h18M3 12h18M3 17h18" />
                )}
              </svg>
              <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            </button>
          </div>
        </div>

        {/* CSS grid disclosure — no animation library needed. */}
        <div
          id="mobile-nav"
          className={`md:hidden disclosure ${mobileOpen ? "disclosure-open" : ""}`}
        >
          <div>
            <nav
              aria-label="Main (mobile)"
              className="flex flex-col border-t border-[var(--rule)] py-2"
            >
              {navLinks.map((link) => {
                const active =
                  link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`px-1 py-2.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                      active ? "text-[var(--accent)]" : "text-[var(--ink-2)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {loading ? null : user ? (
                <button
                  onClick={() => signOut()}
                  className="px-1 py-2.5 text-left font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-2)]"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-1 py-2.5 font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-2)]"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
