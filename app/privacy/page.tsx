import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Privacy",
  description:
    "What BlakeHub does and doesn't collect: no analytics, no tracking, no third-party scripts.",
  path: "/privacy",
});

/*
 * Everything below describes what the code in this repository actually does.
 * If you add analytics, comments, or any third-party embed, update this page
 * in the same commit.
 *
 * TODO(blake): decide whether to publish a contact address here. Left out
 * deliberately rather than guessing at one.
 */
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="eyebrow mb-4">Legal</p>
        <h1 className="section-title mb-4">Privacy</h1>
        <p className="lead">
          BlakeHub is a personal site. It has no analytics, no advertising, and no
          third-party tracking scripts.
        </p>
      </header>

      <div className="prose-content">
        <h2>What is collected from visitors</h2>
        <p>
          Nothing. Reading this site does not require an account, and no cookie is
          set for visitors. There is no analytics package, no tag manager, no
          advertising pixel, and no embedded third-party widget on any page.
        </p>

        <h2>Fonts and assets</h2>
        <p>
          Typefaces are self-hosted and served from this site&apos;s own domain, so
          loading a page does not send a request to a font CDN or any other outside
          host.
        </p>

        <h2>Accounts</h2>
        <p>
          There is exactly one account — mine — used to add and edit content. Signing
          in sets an authentication cookie for that session. There is no public
          sign-up, and no way for a visitor to create an account.
        </p>

        <h2>Service providers</h2>
        <p>
          Two services are involved in running this site, and each keeps its own
          operational logs, which typically include IP addresses and request
          metadata:
        </p>
        <ul>
          <li>
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              Vercel
            </a>{" "}
            — hosting and content delivery.
          </li>
          <li>
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              Supabase
            </a>{" "}
            — the database that stores the site&apos;s content, and authentication for
            the owner account.
          </li>
        </ul>
        <p>
          I do not receive, store, or analyse visitor-level data from either of them.
        </p>

        <h2>Outbound links</h2>
        <p>
          The Websites and Wishlist sections link out to other sites. Once you follow
          one, that site&apos;s own privacy policy applies. None of the links are
          affiliate links, and no referral or commission is earned from them.
        </p>

        <h2>Changes</h2>
        <p>
          If this ever stops being true — if I add analytics, for instance — this page
          gets updated in the same change that adds it.
        </p>
      </div>
    </div>
  );
}
