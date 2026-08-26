"use client";

import { ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { hostFromUrl } from "@/lib/url";
import { faviconFor } from "@/lib/favicon";

type EntryCardProps = {
  /** Display title, also the accessible link text. */
  title: string;
  /** URL the whole card links to (opens in a new tab). */
  href: string;
  /** Storage path inside the `entry-images` bucket. Null → favicon fallback. */
  imagePath: string | null;
  /** Slot beneath the title: description on Websites, price line on Wishlist. */
  body?: ReactNode;
  /** Slot rendered top-right, only visible on hover/focus. Meant for edit/delete. */
  ownerControls?: ReactNode;
};

/** Resolve a storage path to a public URL. Called only when imagePath !== null. */
const publicUrlFor = (imagePath: string): string => {
  const supabase = createClient();
  return supabase.storage.from("entry-images").getPublicUrl(imagePath).data.publicUrl;
};

/** Image-forward card used on /websites and /wishlist. See design spec:
 *  docs/superpowers/specs/2026-08-26-websites-wishlist-cards-design.md */
export default function EntryCard({
  title,
  href,
  imagePath,
  body,
  ownerControls,
}: EntryCardProps) {
  const host = hostFromUrl(href);
  const isFallback = imagePath === null;
  const imageSrc = isFallback ? faviconFor(host) : publicUrlFor(imagePath);

  return (
    <article className="entry-card group">
      <div className={`entry-card-image${isFallback ? " is-fallback" : ""}`}>
        {/* alt="" because the title alongside already names the entry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt="" loading="lazy" />
      </div>
      <div className="entry-card-body">
        <h2 className="entry-card-title">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="stretched-link"
          >
            {title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </h2>
        {body}
        <p className="entry-card-host">{host}</p>
      </div>
      {ownerControls && <div className="entry-card-actions">{ownerControls}</div>}
    </article>
  );
}
