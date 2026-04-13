"use client";

import Link from "next/link";

const sections = [
  {
    title: "Websites",
    description: "A curated collection of powerful tools, resources, and websites every developer should know about.",
    href: "/websites",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Journey",
    description: "My 4-year path through Western University's Software Engineering program — every course, every topic.",
    href: "/journey",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    color: "from-purple-500 to-pink-500",
  },
  {
    title: "Guides",
    description: "Reference guides for tools and technologies — Git, Unity, game dev, and more. Written for future me.",
    href: "/guides",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: "from-emerald-500 to-teal-500",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Hero */}
      <section className="py-20 sm:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
          Software Engineering Graduate
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
          Hey, I&apos;m <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-purple-500">Blake</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Software Engineering graduate from Western University. This is my personal
          knowledge base — a place to store the tools, lessons, and references I&apos;ve
          picked up over 4 years of studying and building software.
        </p>
        <p className="text-base text-gray-500 dark:text-gray-500 max-w-xl mx-auto">
          Built for me, but open for anyone who finds it useful.
        </p>
      </section>

      {/* Section cards */}
      <section className="pb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="group card-interactive p-6">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${section.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
              {section.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {section.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {section.description}
            </p>
            <div className="mt-4 text-accent-600 dark:text-accent-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Explore
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
