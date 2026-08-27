"use client";

import { createClient } from "@/lib/supabase";
import { hostFromUrl } from "@/lib/url";
import { faviconFor } from "@/lib/favicon";

type LinkCardProps = {
  title: string;
  href: string;
  imagePath: string | null;
  /** Text shown in the centre chip of the buttons row.
   *  Wishlist: formatted price. Websites: "Visit". */
  middle: string;
  /** Optional short line under the hostname. Websites uses this for the
   *  description; Wishlist omits it. Clamped to 2 lines. */
  subtitle?: string;
  /** When present, edit/del buttons appear on hover. Owner-only. */
  onEdit?: () => void;
  onDelete?: () => void;
};

const publicUrlFor = (imagePath: string): string => {
  const supabase = createClient();
  return supabase.storage.from("entry-images").getPublicUrl(imagePath).data.publicUrl;
};

/** Uiverse-inspired dark card, shared by /websites and /wishlist. Ported from
 *  styled-components to plain CSS (see .link-card-* in app/globals.css).
 *  Whole card links to href via the stretched-link on the title; owner
 *  controls sit above the link with z-index. */
export default function LinkCard({
  title,
  href,
  imagePath,
  middle,
  subtitle,
  onEdit,
  onDelete,
}: LinkCardProps) {
  const host = hostFromUrl(href);
  const isFallback = imagePath === null;
  const imageSrc = isFallback ? faviconFor(host) : publicUrlFor(imagePath);

  return (
    <article className="link-card">
      <div className="link-card-front">
        {/* alt="" — the title below already names the entry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          className={`link-card-image${isFallback ? " is-fallback" : ""}`}
        />
        <div className="link-card-fl" aria-hidden="true">
          <div className="link-card-fullscreen">
            <svg viewBox="0 0 100 100" className="link-card-fullscreen-svg">
              <path d="M3.563-.004a3.573 3.573 0 0 0-3.527 4.09l-.004-.02v28.141c0 1.973 1.602 3.57 3.57 3.57s3.57-1.598 3.57-3.57V12.218v.004l22.461 22.461a3.571 3.571 0 0 0 6.093-2.527c0-.988-.398-1.879-1.047-2.523L12.218 7.172h19.989c1.973 0 3.57-1.602 3.57-3.57s-1.598-3.57-3.57-3.57H4.035a3.008 3.008 0 0 0-.473-.035zM96.333 0l-.398.035.02-.004h-28.16a3.569 3.569 0 0 0-3.57 3.57 3.569 3.569 0 0 0 3.57 3.57h19.989L65.323 29.632a3.555 3.555 0 0 0-1.047 2.523 3.571 3.571 0 0 0 6.093 2.527L92.83 12.221v19.985a3.569 3.569 0 0 0 3.57 3.57 3.569 3.569 0 0 0 3.57-3.57V4.034v.004a3.569 3.569 0 0 0-3.539-4.043l-.105.004zM3.548 64.23A3.573 3.573 0 0 0 .029 67.8v28.626-.004l.016.305-.004-.016.004.059v-.012l.039.289-.004-.023.023.121-.004-.023c.074.348.191.656.34.938l-.008-.02.055.098-.008-.02.148.242-.008-.012.055.082-.008-.012c.199.285.43.531.688.742l.008.008.031.027.004.004c.582.461 1.32.742 2.121.762h.004l.078.004h28.61a3.569 3.569 0 0 0 3.57-3.57 3.569 3.569 0 0 0-3.57-3.57H12.224l22.461-22.461a3.569 3.569 0 0 0-2.492-6.125l-.105.004h.008a3.562 3.562 0 0 0-2.453 1.074L7.182 87.778V67.793a3.571 3.571 0 0 0-3.57-3.57h-.055.004zm92.805 0a3.573 3.573 0 0 0-3.519 3.57v19.993-.004L70.373 65.328a3.553 3.553 0 0 0-2.559-1.082h-.004a3.573 3.573 0 0 0-3.566 3.57c0 1.004.414 1.91 1.082 2.555l22.461 22.461H67.802a3.57 3.57 0 1 0 0 7.14h28.606c.375 0 .742-.059 1.082-.168l-.023.008.027-.012-.02.008.352-.129-.023.008.039-.02-.02.008.32-.156-.02.008.023-.016-.008.008c.184-.102.34-.207.488-.32l-.008.008.137-.113-.008.004.223-.211.008-.008c.156-.164.301-.34.422-.535l.008-.016-.008.016.008-.02.164-.285.008-.02-.008.016.008-.02c.098-.188.184-.406.246-.633l.008-.023-.004.008.008-.023a3.44 3.44 0 0 0 .121-.852v-.004l.004-.078V67.804a3.569 3.569 0 0 0-3.57-3.57h-.055.004z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="link-card-back" aria-hidden="true" />
      <div className="link-card-data">
        <div className="link-card-icon" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconFor(host)} alt="" loading="lazy" />
        </div>
        <div className="link-card-text">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="stretched-link link-card-text-title"
          >
            {title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="link-card-text-host">{host}</span>
          {subtitle && (
            <span className="link-card-text-subtitle">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="link-card-btns">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="link-card-action action-edit"
          >
            edit<span className="sr-only"> {title}</span>
          </button>
        )}
        <span className="link-card-middle">{middle}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="link-card-action action-delete"
          >
            del<span className="sr-only"> {title}</span>
          </button>
        )}
      </div>
    </article>
  );
}
