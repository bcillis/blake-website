"use client";

import Link from "next/link";
import { FadeUp, StaggerGrid, StaggerCard } from "@/components/Motion";

const sections = [
  {
    title: "Websites",
    description:
      "A curated collection of powerful tools, resources, and websites every developer should know about.",
    href: "/websites",
    cta: "Browse the index",
    glyph: "✦",
  },
  {
    title: "Journey",
    description:
      "My 4-year path through Western University's Software Engineering program — every course, every topic.",
    href: "/journey",
    cta: "See the timeline",
    glyph: "↗",
  },
  {
    title: "Guides",
    description:
      "Reference guides for tools and technologies — Git, Unity, game dev, and more. Written for future me.",
    href: "/guides",
    cta: "Read the guides",
    glyph: "§",
  },
  {
    title: "Wishlist",
    description:
      "Things I'd love to own one day — gear, gadgets, and the occasional dream purchase.",
    href: "/wishlist",
    cta: "View the list",
    glyph: "♢",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-16 max-w-3xl">
        <FadeUp>
          <span className="eyebrow mb-6">Personal knowledge hub</span>
        </FadeUp>

        <FadeUp delay={0.05}>
          <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] tracking-[-0.02em] mb-6 text-[var(--text-primary)]">
            Hi, I&apos;m{" "}
            <span className="text-[var(--accent)] italic">Blake</span>.
          </h1>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p className="lead mb-4">
            I&apos;m a Software Engineering graduate from Western University. This
            site is a long-running record of the tools, lessons, and references
            I&apos;ve picked up over four years of studying and building software.
          </p>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Built for me. Kept public for anyone who finds it useful.
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="flex flex-wrap gap-3">
            <Link href="/journey" className="btn-primary">
              Explore the journey →
            </Link>
            <Link href="/guides" className="btn-secondary">
              Read the guides
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* Sections */}
      <section>
        <FadeUp delay={0.25}>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl tracking-[-0.01em] text-[var(--text-primary)]">
              Sections
            </h2>
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              {String(sections.length).padStart(2, "0")} parts
            </span>
          </div>
        </FadeUp>

        <StaggerGrid className="grid gap-5 sm:grid-cols-2">
          {sections.map((section) => (
            <StaggerCard key={section.href}>
              <Link href={section.href} className="card-interactive group block h-full">
                <div className="flex items-start justify-between mb-4">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    {section.glyph}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] mt-2">
                    /{section.href.replace("/", "") || "home"}
                  </span>
                </div>
                <h3 className="font-serif text-2xl text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                  {section.description}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] group-hover:gap-2 transition-all">
                  {section.cta}
                  <span>→</span>
                </span>
              </Link>
            </StaggerCard>
          ))}
        </StaggerGrid>
      </section>
    </div>
  );
}
