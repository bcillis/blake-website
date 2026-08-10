import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const destinations = [
  { href: "/websites", label: "Websites", blurb: "Tools and resources worth knowing" },
  { href: "/journey", label: "Journey", blurb: "Four years, course by course" },
  { href: "/guides", label: "Guides", blurb: "Written references" },
  { href: "/wishlist", label: "Wishlist", blurb: "Gear on my radar" },
];

export default function NotFound() {
  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <section className="pt-20 sm:pt-28 pb-12 max-w-2xl">
        <p className="eyebrow mb-6">Error 404</p>
        <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] tracking-[-0.02em] mb-6 text-[var(--text-primary)]">
          This page doesn&apos;t exist.
        </h1>
        <p className="lead mb-8">
          The link may be out of date, or the address may have a typo in it. Guide
          URLs are lowercase — <code>/guides/git</code>, not <code>/guides/Git</code>.
        </p>
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-4">
          Or try one of these
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {destinations.map((destination) => (
            <li key={destination.href}>
              <Link href={destination.href} className="card-interactive group block h-full">
                <span className="font-serif text-xl text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {destination.label}
                </span>
                <span className="block text-sm text-[var(--text-secondary)] mt-1">
                  {destination.blurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
