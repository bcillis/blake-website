import type { Metadata } from "next";
import { Lora, DM_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  AUTHOR_NAME,
  absoluteUrl,
} from "@/lib/site";

// Lora carries headings and body; DM Mono carries anything that is data.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Software Engineering Knowledge Base`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR_NAME }],
  creator: AUTHOR_NAME,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Software Engineering Knowledge Base`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Software Engineering Knowledge Base`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

/**
 * Person + WebSite structured data. Kept to facts that are already stated
 * on the site itself — no invented job titles, employers, or social profiles.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: AUTHOR_NAME,
      url: SITE_URL,
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Western University",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      author: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${lora.variable} ${dmMono.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main id="main" className="flex-1">
              {children}
            </main>
            <footer className="mt-32 border-t border-[var(--rule)]">
              <div className="max-w-page mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="meta normal-case tracking-normal text-[var(--ink-3)]">
                  Blake · Western University Software Engineering &apos;26
                </span>
                <nav aria-label="Legal" className="flex items-center gap-5">
                  <Link href="/privacy" className="meta hover:text-[var(--accent)] transition-colors">
                    Privacy
                  </Link>
                  <Link href="/terms" className="meta hover:text-[var(--accent)] transition-colors">
                    Terms
                  </Link>
                </nav>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
