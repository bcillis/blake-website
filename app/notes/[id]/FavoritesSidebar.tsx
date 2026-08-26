"use client";

import { useState } from "react";
import { NoteEntry } from "@/lib/supabase";

const formatSidebarTimestamp = (iso: string): string => {
  const then = new Date(iso);
  const now = new Date();
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  const time = then.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (sameDay) return `Today · ${time}`;
  const date = then.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
  return `${date} · ${time}`;
};

type Props = {
  variant: "desktop" | "mobile";
  favorites: NoteEntry[];
  signedUrls: Record<string, string>;
  onScrollToEntry: (entryId: string) => void;
  onUnstar: (entry: NoteEntry) => void;
};

const StarFilled = () => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    aria-hidden="true"
    fill="#F5C518"
    stroke="#F5C518"
    strokeWidth="1.5"
    strokeLinejoin="round"
  >
    <path d="M8 1.5l1.98 4.02 4.44.64-3.21 3.13.76 4.42L8 11.83l-3.97 2.09.76-4.42-3.21-3.13 4.44-.64L8 1.5z" />
  </svg>
);

type BodyProps = Omit<Props, "variant">;

const SidebarBody = ({ favorites, signedUrls, onScrollToEntry, onUnstar }: BodyProps) => {
  if (favorites.length === 0) {
    return (
      <p className="text-sm text-[var(--ink-3)]">
        No favorites yet. Star any entry to pin it here.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {favorites.map((entry) => (
        <li
          key={entry.id}
          className="grid grid-cols-[1fr_auto] gap-2 border border-[var(--rule)] p-3"
          style={{ borderRadius: "2px", background: "var(--surface)" }}
        >
          <button
            type="button"
            onClick={() => onScrollToEntry(entry.id)}
            aria-label="Scroll to this entry in the log"
            className="min-w-0 text-left"
          >
            {entry.kind === "text" ? (
              <p className="whitespace-pre-wrap break-words text-sm text-[var(--ink)]">
                {entry.content}
              </p>
            ) : entry.image_path && signedUrls[entry.id] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={signedUrls[entry.id]}
                alt=""
                className="max-w-full max-h-[240px] border border-[var(--rule)]"
                style={{ borderRadius: "2px" }}
              />
            ) : (
              <p className="text-[var(--ink-3)] italic text-sm">[image unavailable]</p>
            )}
            <p className="data text-[var(--ink-3)] mt-2">
              {formatSidebarTimestamp(entry.updated_at)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onUnstar(entry)}
            aria-label="Remove from favorites"
            aria-pressed={true}
            className="self-start"
          >
            <StarFilled />
          </button>
        </li>
      ))}
    </ul>
  );
};

export const FavoritesSidebar = ({ variant, ...bodyProps }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const countLabel = `Favorites${bodyProps.favorites.length > 0 ? ` · ${bodyProps.favorites.length}` : ""}`;

  if (variant === "desktop") {
    return (
      <aside
        aria-label="Favorites"
        className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pt-12"
      >
        <p className="meta mb-3">{countLabel}</p>
        <SidebarBody {...bodyProps} />
      </aside>
    );
  }

  // mobile variant: collapsible disclosure, rendered above the log
  return (
    <div className="lg:hidden pt-4 pb-2">
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="meta flex items-center gap-2"
      >
        <span aria-hidden="true">{mobileOpen ? "▾" : "▸"}</span>
        <span>{countLabel}</span>
      </button>
      <div className={`disclosure ${mobileOpen ? "disclosure-open" : ""}`}>
        <div className="pt-3">
          <SidebarBody {...bodyProps} />
        </div>
      </div>
    </div>
  );
};
