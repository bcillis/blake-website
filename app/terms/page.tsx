import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Terms",
  description:
    "Terms of use for BlakeHub — a personal, non-commercial site provided as-is.",
  path: "/terms",
});

/*
 * TODO(blake): pick a licence for the written content if you want people to be
 * able to reuse the guides. Left unstated rather than assigning one for you —
 * "all rights reserved" below is the default if you do nothing.
 */
export default function TermsPage() {
  return (
    <div className="max-w-text mx-auto px-6 pb-24">
      <header className="pt-16 pb-10 mb-10 border-b border-[var(--rule-strong)]">
        <p className="meta mb-5">Legal</p>
        <h1 className="page-title mb-5">Terms</h1>
        <p className="lead">
          A short set of terms for a small personal site. Nothing here is a
          commercial offer.
        </p>
      </header>

      <div className="prose">
        <h2>What this site is</h2>
        <p>
          BlakeHub is a personal knowledge base — my own notes, references, and
          collected links, published because they might be useful to someone else.
          It is not a product, not a service, and nothing on it is sold.
        </p>

        <h2>No warranty</h2>
        <p>
          Everything is provided as-is. Notes reflect what I understood at the time I
          wrote them, and technical writing goes out of date. Verify anything that
          matters before relying on it. I make no guarantee that the site is
          accurate, complete, or available at any given moment.
        </p>

        <h2>Content ownership</h2>
        <p>
          The writing, course notes, and site design are mine, all rights reserved.
          You are welcome to link to any page, quote a passage with attribution, or
          reference the material in your own work. Republishing pages wholesale is
          not permitted.
        </p>

        <h2>Third-party links</h2>
        <p>
          Links to other sites are there because I found them useful. I don&apos;t
          control them, don&apos;t vouch for their current contents, and earn nothing
          from them.
        </p>

        <h2>Accounts and access</h2>
        <p>
          The site has a single owner account. Attempting to access, modify, or
          delete content you don&apos;t own is not permitted.
        </p>
      </div>
    </div>
  );
}
