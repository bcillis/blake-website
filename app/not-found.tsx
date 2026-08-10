import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const destinations = [
  { index: "01", href: "/websites", label: "Websites", blurb: "Tools and references worth keeping" },
  { index: "02", href: "/journey", label: "Journey", blurb: "Four years, course by course" },
  { index: "03", href: "/guides", label: "Guides", blurb: "Written references" },
  { index: "04", href: "/wishlist", label: "Wishlist", blurb: "Gear on my radar" },
];

export default function NotFound() {
  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <div className="grid gap-16 lg:grid-cols-[1fr_20rem] lg:gap-20 pt-16 sm:pt-24">
        <section>
          <p className="meta mb-8">Error 404</p>
          <h1 className="display mb-8">This page doesn&apos;t exist.</h1>
          <p className="lead mb-6">
            The link may be out of date, or the address may have a typo in it.
          </p>
          <p className="text-[var(--ink-3)] measure mb-10">
            Guide URLs are lowercase and hyphenated — <code>/guides/git-basics</code>,
            not <code>/guides/Git Basics</code>.
          </p>
          <Link href="/" className="btn">
            Back to home
          </Link>
        </section>

        <section aria-labelledby="elsewhere" className="lg:pt-2">
          <h2 id="elsewhere" className="meta mb-0 pb-3 border-b border-[var(--rule-strong)]">
            Or try
          </h2>
          <ul>
            {destinations.map((destination) => (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  className="group flex gap-4 py-4 border-b border-[var(--rule)] transition-colors hover:bg-[var(--accent-wash)]"
                >
                  <span
                    aria-hidden="true"
                    className="data pt-1 text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors"
                  >
                    {destination.index}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-lg leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                      {destination.label}
                    </span>
                    <span className="block text-sm leading-normal text-[var(--ink-2)] mt-0.5">
                      {destination.blurb}
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
