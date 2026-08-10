import Link from "next/link";

/*
 * Copy note: the section blurbs below describe what each page actually
 * contains. The previous versions ("a curated collection of powerful tools…
 * every developer should know about") promised more than the data delivers.
 */
const sections = [
  {
    index: "01",
    title: "Websites",
    description:
      "An index of tools and references collected while studying and building software.",
    href: "/websites",
  },
  {
    index: "02",
    title: "Journey",
    description:
      "Four years of Software Engineering at Western University, course by course.",
    href: "/journey",
  },
  {
    index: "03",
    title: "Guides",
    description: "Written references for things I want to remember how to do.",
    href: "/guides",
  },
  {
    index: "04",
    title: "Wishlist",
    description: "Gear and gadgets on my radar, with prices in CAD.",
    href: "/wishlist",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-page mx-auto px-6">
      <div className="grid gap-16 lg:grid-cols-[1fr_20rem] lg:gap-20 pt-16 sm:pt-24 pb-24">
        {/* Hero — the one place on the site with an entrance animation. */}
        <section className="fade-up">
          <p className="meta mb-8">Personal knowledge hub</p>

          <h1 className="display mb-8">
            Hi, I&apos;m <span className="italic text-[var(--accent)]">Blake</span>.
          </h1>

          <p className="lead mb-6">
            I&apos;m a Software Engineering graduate from Western University. This
            site is a long-running record of the tools, lessons, and references
            I&apos;ve picked up over four years of studying and building software.
          </p>

          <p className="text-[var(--ink-3)] measure">
            Built for me. Kept public for anyone who finds it useful.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/journey" className="btn">
              Explore the journey
            </Link>
            <Link href="/guides" className="btn-quiet">
              Read the guides
            </Link>
          </div>
        </section>

        {/* Contents — a mono index, not a card grid. */}
        <section aria-labelledby="contents" className="lg:pt-2">
          <h2 id="contents" className="meta mb-0 pb-3 border-b border-[var(--rule-strong)]">
            Contents
          </h2>

          <ul>
            {sections.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  className="group flex gap-4 py-4 border-b border-[var(--rule)] transition-colors hover:bg-[var(--accent-wash)]"
                >
                  <span className="data pt-1 text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors">
                    {section.index}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-lg leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {section.title}
                    </span>
                    <span className="block text-sm leading-normal text-[var(--ink-2)] mt-0.5">
                      {section.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
