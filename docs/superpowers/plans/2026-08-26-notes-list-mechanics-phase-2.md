# Notes list mechanics — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill in the empty right-column stub on `/notes/[id]` with a real favorites sidebar: every entry gains an always-visible star toggle, starred entries appear in a sticky sidebar ordered by most-recently-starred, and clicking a sidebar item scrolls the main log to the corresponding entry with a brief accent highlight. On screens below `lg` the sidebar collapses into a `.disclosure` above the log.

**Architecture:** Add one boolean column (`is_favorite`) on `note_entries` with a partial index. Star toggle writes `{ is_favorite, updated_at }` in one Supabase `update`, keeping the sidebar order coherent without a new column. Sidebar reads from the existing `entries` state (filtered to `is_favorite = true` and re-sorted by `updated_at desc`) and reuses the existing `signedUrls` map — no extra fetch. Click-to-scroll uses stable `id="entry-<uuid>"` attributes on each log row plus `scrollIntoView`, with a CSS `.entry-highlight` class applied for 1.5s. If the target entry is hidden by an active filter, the click clears the filter first, waits one paint frame, then scrolls. FavoritesSidebar is extracted into its own file (`app/notes/[id]/FavoritesSidebar.tsx`) because `page.tsx` is already at 919 lines after Phase 1.

**Tech Stack:** Next.js 14 App Router (client components), TypeScript, Tailwind, `@supabase/ssr` browser client. No new dependencies. No test runner — verification via `npm run lint`, `npx tsc --noEmit`, `npm run build`, and manual `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-08-25-notes-list-mechanics-and-favorites-design.md` (Phase 2 sections)

---

## File Structure

**Modified:**
- `supabase-schema.sql` — append one ALTER TABLE + partial index.
- `lib/supabase.ts` — extend `NoteEntry` type with `is_favorite`.
- `app/globals.css` — add `.entry-highlight` component class.
- `app/notes/[id]/page.tsx` — add `toggleFavorite` handler, star button on each row, stable row `id`, `favoriteEntries` derived list, mobile-disclosure wrapper, replace the empty aside with a `<FavoritesSidebar>` render, and a scroll-with-filter-clear handler.

**Created:**
- `app/notes/[id]/FavoritesSidebar.tsx` — presentational component. Receives the sorted favorites list, the `signedUrls` map, an `onScrollToEntry` callback, and an `onUnstar` callback. No hooks besides `useState` for the mobile disclosure open/closed state (if placed here) — kept close to the disclosure JSX.

**No changes to:**
- Any other route.
- `components/Navbar.tsx`.
- `components/AuthProvider.tsx`.
- `data/journey.ts` or any other data file.
- Phase 1 code (drag, filter, sort). All Phase 2 additions layer on top without touching the drag/sort/filter logic.

---

## Verification model

No test runner (see `CLAUDE.md`). Every code task uses this three-step check:

1. `npm run lint` — must stay at **zero warnings**.
2. `npx tsc --noEmit` — must exit clean.
3. Manual: exercise the change in `npm run dev` on http://localhost:3000. Blake performs manual steps; agentic executors defer manual checks to Blake explicitly.

Schema tasks apply via the Supabase MCP `apply_migration` tool (or Blake runs the SQL by hand — either works).

Design tokens: All new colors reference CSS custom properties (`var(--ink-3)`, `var(--accent)`, `var(--rule)`, `var(--surface)`, `var(--bg)`). The one exception is the star's filled color `#F5C518` — a warm yellow specified explicitly in the spec because it isn't part of the site palette (it's a semantic "favorited" hue, not a UI-chrome color).

---

## Task 1: Schema — add `is_favorite` column and partial index

**Files:**
- Modify: `supabase-schema.sql` — append at the end of the file (after the Phase 1 block).

- [ ] **Step 1: Append the Phase 2 migration block**

At the very end of `supabase-schema.sql`, append:

```sql
-- =============================================================
-- Notes list mechanics — Phase 2 additions
-- Adds a star/favorite flag on note entries with a partial index
-- for the favorites-sidebar query. Safe to re-run.
-- =============================================================

alter table public.note_entries
  add column if not exists is_favorite boolean not null default false;

create index if not exists note_entries_note_id_is_favorite_idx
  on public.note_entries (note_id, is_favorite)
  where is_favorite = true;
```

- [ ] **Step 2: Commit the schema change**

```bash
git add supabase-schema.sql
git commit -m "Add is_favorite column and partial index for favorites sidebar"
```

---

## Task 2: Apply the schema to Supabase

**Files:** none in the repo — database migration only.

- [ ] **Step 1: Apply the SQL**

Two options — either works:

- **Option A (Blake runs it):** Ask Blake to open the Supabase SQL Editor (project `lamefzddvcefmcinybxn` — bcillis-website) and paste the new Phase 2 block from the bottom of `supabase-schema.sql`. Wait for confirmation.
- **Option B (MCP):** Use `mcp__plugin_supabase_supabase__apply_migration` with `name: "notes_list_mechanics_phase_2"` and the SQL from Task 1 Step 1 as the query. Confirm the response indicates success.

- [ ] **Step 2: Verify the column exists**

Run via MCP: `mcp__plugin_supabase_supabase__execute_sql` with:

```sql
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'note_entries'
   and column_name = 'is_favorite';
```

Expected: one row. `is_favorite` is `boolean`, not nullable, default `false`.

- [ ] **Step 3: Verify the partial index exists**

Run via MCP: `mcp__plugin_supabase_supabase__execute_sql` with:

```sql
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and tablename = 'note_entries'
   and indexname = 'note_entries_note_id_is_favorite_idx';
```

Expected: one row. `indexdef` should include `WHERE (is_favorite = true)`.

No commit for this task (nothing changed in the repo).

---

## Task 3: Extend TypeScript type

**Files:**
- Modify: `lib/supabase.ts` — extend the existing `NoteEntry` interface.

- [ ] **Step 1: Add `is_favorite` to `NoteEntry`**

Find the `NoteEntry` interface in `lib/supabase.ts` and add `is_favorite`:

```ts
export interface NoteEntry {
  id: string;
  note_id: string;
  user_id: string;
  kind: "text" | "image";
  content: string | null;
  image_path: string | null;
  position: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean. `tsc` should not complain in `app/notes/[id]/page.tsx` because no read of `is_favorite` exists there yet.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "Add is_favorite to NoteEntry type"
```

---

## Task 4: Add `.entry-highlight` CSS

**Files:**
- Modify: `app/globals.css` — add a component class inside `@layer components`, right after the `.disclosure` block.

- [ ] **Step 1: Add the class**

Find the `.disclosure > *` block (currently around line 335–338, ending with `min-height: 0; }`). Directly after that block's closing `}` and before the `/* ---------- Alert ---------- */` comment, insert:

```css
  /* ---------- Entry highlight (favorites sidebar → log jump) ---------- */
  .entry-highlight {
    box-shadow: inset 3px 0 0 0 var(--accent);
    transition: box-shadow 900ms ease-out;
  }
```

Rationale for the shape: a hairline vertical accent bar on the row's left edge, matching the site's "hairline rule" language (no shadows, no rounded fills). Applied via inset box-shadow so it doesn't reflow layout. The class is added by JS, then removed after 1.5s; the `900ms ease-out` `transition` handles the fade-out when the class is removed. On class add the shadow appears instantly (no in-transition since the element didn't previously have a shadow value to interpolate from — this is intentional).

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Add .entry-highlight for favorites sidebar scroll target"
```

---

## Task 5: Add stable row id + star button on every entry row

**Files:**
- Modify: `app/notes/[id]/page.tsx`

Two related changes bundled here because they both live on the same row element and share no state with the sidebar yet (the sidebar consumes them in Tasks 6 and 7). After this task, Blake can already star entries — they just won't appear in the sidebar until Task 7.

- [ ] **Step 1: Extend `SortableEntryRowProps` and pass through a stable id**

At the top of `app/notes/[id]/page.tsx`, find `SortableEntryRowProps` (currently around line 56):

```tsx
type SortableEntryRowProps = {
  entry: NoteEntry;
  timeLabel: string;
  dragDisabled: boolean;
  children: React.ReactNode;
};
```

The type is already fine — `entry.id` is already on `entry`. What we need is to add the DOM `id` attribute to the row's outer `<div>`. In the `SortableEntryRow` component body (currently around line 84), find:

```tsx
return (
  <div
    ref={setNodeRef}
    style={style}
    className="group grid grid-cols-[1.5rem_3.5rem_1fr] gap-3"
  >
```

Change to:

```tsx
return (
  <div
    id={`entry-${entry.id}`}
    ref={setNodeRef}
    style={style}
    className="group grid grid-cols-[1.5rem_3.5rem_1fr] gap-3"
  >
```

Do not touch anything else inside `SortableEntryRow`. The `id` attribute is inert until Task 7 uses it.

- [ ] **Step 2: Add the `toggleFavorite` handler inside `NotePage`**

Directly below `setSortMode` (currently ends around line 458), and above `handleDragEnd`, add:

```tsx
const toggleFavorite = async (entry: NoteEntry) => {
  const nextFavorite = !entry.is_favorite;
  // Optimistic local update so the star and sidebar respond instantly.
  const nowIso = new Date().toISOString();
  setEntries((prev) =>
    prev.map((e) =>
      e.id === entry.id
        ? { ...e, is_favorite: nextFavorite, updated_at: nextFavorite ? nowIso : e.updated_at }
        : e
    )
  );

  const supabase = createClient();
  // Favoriting bumps updated_at so the sidebar sorts most-recently-starred first.
  // Un-favoriting leaves updated_at alone.
  const patch = nextFavorite
    ? { is_favorite: true, updated_at: nowIso }
    : { is_favorite: false };
  const { error: updateError } = await supabase
    .from("note_entries")
    .update(patch)
    .eq("id", entry.id);

  if (updateError) {
    // Revert on failure.
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? entry : e))
    );
    setError(`Couldn't ${nextFavorite ? "star" : "unstar"} entry: ${updateError.message}`);
    return;
  }
  setError(null);
};
```

- [ ] **Step 3: Add the star SVG inline where entry actions render**

Find, inside the log render block, the following section (currently around line 850, inside the `SortableEntryRow` children). It's the block that renders the row-actions (`Edit` / `Delete`):

```tsx
{editingEntryId !== entry.id && (
  <div className="row-actions mt-1.5 flex gap-3">
    {entry.kind === "text" && (
      <button onClick={() => startEditing(entry)} className="btn-bare">
        Edit<span className="sr-only"> entry</span>
      </button>
    )}
    <button onClick={() => deleteEntry(entry)} className="btn-bare">
      Delete<span className="sr-only"> entry</span>
    </button>
  </div>
)}
```

We need the star to sit at the top-right of the content column, always visible (not gated by `row-actions` hover). Restructure the content-column children so the actual content (text or image or [image unavailable]) sits inside a flex row alongside the star button.

Find the outer content branch inside `SortableEntryRow` (currently around lines 799–849):

```tsx
{entry.kind === "text" ? (
  editingEntryId === entry.id ? (
    <div className="space-y-2">
      <textarea ... />
      <div className="flex items-center gap-2">
        <button onClick={() => saveEdit(entry)} ...>...</button>
        <button onClick={cancelEditing} className="btn-quiet">Cancel</button>
      </div>
    </div>
  ) : (
    <p className="whitespace-pre-wrap break-words text-[var(--ink)]">
      {entry.content}
      {entry.updated_at !== entry.created_at && (
        <span className="data text-[var(--ink-3)] ml-2">(edited)</span>
      )}
    </p>
  )
) : entry.image_path && signedUrls[entry.id] ? (
  <a
    href={signedUrls[entry.id]}
    target="_blank"
    rel="noreferrer"
    className="inline-block"
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={signedUrls[entry.id]}
      alt=""
      className="max-h-[400px] border border-[var(--rule)]"
      style={{ borderRadius: "2px" }}
    />
  </a>
) : (
  <p className="text-[var(--ink-3)] italic text-sm">
    [image unavailable]
  </p>
)}
{editingEntryId !== entry.id && (
  <div className="row-actions mt-1.5 flex gap-3">
    {entry.kind === "text" && (
      <button onClick={() => startEditing(entry)} className="btn-bare">
        Edit<span className="sr-only"> entry</span>
      </button>
    )}
    <button onClick={() => deleteEntry(entry)} className="btn-bare">
      Delete<span className="sr-only"> entry</span>
    </button>
  </div>
)}
```

Replace the whole block with:

```tsx
<div className="flex items-start gap-3">
  <div className="min-w-0 flex-1">
    {entry.kind === "text" ? (
      editingEntryId === entry.id ? (
        <div className="space-y-2">
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={Math.max(2, editDraft.split("\n").length)}
            className="field-area w-full font-serif text-sm"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveEdit(entry)}
              disabled={savingEdit || !editDraft.trim()}
              className="btn"
            >
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button onClick={cancelEditing} className="btn-quiet">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-[var(--ink)]">
          {entry.content}
          {entry.updated_at !== entry.created_at && (
            <span className="data text-[var(--ink-3)] ml-2">(edited)</span>
          )}
        </p>
      )
    ) : entry.image_path && signedUrls[entry.id] ? (
      <a
        href={signedUrls[entry.id]}
        target="_blank"
        rel="noreferrer"
        className="inline-block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrls[entry.id]}
          alt=""
          className="max-h-[400px] border border-[var(--rule)]"
          style={{ borderRadius: "2px" }}
        />
      </a>
    ) : (
      <p className="text-[var(--ink-3)] italic text-sm">
        [image unavailable]
      </p>
    )}
    {editingEntryId !== entry.id && (
      <div className="row-actions mt-1.5 flex gap-3">
        {entry.kind === "text" && (
          <button onClick={() => startEditing(entry)} className="btn-bare">
            Edit<span className="sr-only"> entry</span>
          </button>
        )}
        <button onClick={() => deleteEntry(entry)} className="btn-bare">
          Delete<span className="sr-only"> entry</span>
        </button>
      </div>
    )}
  </div>
  <button
    type="button"
    onClick={() => toggleFavorite(entry)}
    aria-pressed={entry.is_favorite}
    aria-label={entry.is_favorite ? "Remove from favorites" : "Add to favorites"}
    className="shrink-0 mt-0.5 text-[var(--ink-3)] hover:text-[var(--ink-2)] transition-colors"
  >
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      fill={entry.is_favorite ? "#F5C518" : "none"}
      stroke={entry.is_favorite ? "#F5C518" : "currentColor"}
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M8 1.5l1.98 4.02 4.44.64-3.21 3.13.76 4.42L8 11.83l-3.97 2.09.76-4.42-3.21-3.13 4.44-.64L8 1.5z" />
    </svg>
  </button>
</div>
```

Key points about the restructure:
- The content column now uses a `flex items-start gap-3` layout: content on the left (fills space via `flex-1`), star on the right (`shrink-0`).
- The star is **always visible** (not inside `.row-actions`, which hides its children until row hover).
- Hollow star: `fill="none"`, `stroke="currentColor"` (inherits `var(--ink-3)` from the button). Filled star: fill and stroke both `#F5C518`.
- Star sits at `mt-0.5` to align optically with the first line of prose.
- `min-w-0` on the content wrapper prevents long unbroken image URLs or paths from blowing out the flex layout.

- [ ] **Step 4: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 5: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note with entries, (2) confirm a hollow star icon appears at the far right of each entry (should be visible without hovering), (3) click a star — it fills yellow instantly; refresh — it stays filled, (4) click again — it hollows out; refresh — it stays hollow, (5) Edit/Delete on hover still work exactly as before, (6) star an image entry — the star should sit at the top-right of the image."

- [ ] **Step 6: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Add always-visible star toggle on note entries"
```

---

## Task 6: Extract `FavoritesSidebar` into its own file

**Files:**
- Create: `app/notes/[id]/FavoritesSidebar.tsx`
- Modify: `app/notes/[id]/page.tsx` (replace the stub `<aside>` with the component, wire empty callbacks)

This task creates the component and swaps it in with **stubbed props** — favorites list is empty, callbacks are no-ops. Task 7 replaces the stubs with real data and behavior. Splitting this way keeps the file-shape change (new file + import) in its own diff.

- [ ] **Step 1: Create `FavoritesSidebar.tsx`**

Create `app/notes/[id]/FavoritesSidebar.tsx` with:

```tsx
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
  const time = then.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
```

Notes:
- One component, two placements via the `variant` prop. The mobile version needs to render **above** the log (so it must sit inside the left column in the JSX flow); the desktop version needs to render in the right column of the grid. Because those are two different positions in the DOM tree, we render the component twice.
- Both variants share `<SidebarBody>` so the empty state and row rendering stay identical.
- The header `Favorites · N` label is computed once as `countLabel` and reused across variants. `N` is hidden when zero.
- Rows are `<li>` with two child `<button>`s in a grid: body-button on the left, unstar-button on the right. No nested buttons.
- Mobile disclosure default: closed. The user opts in.

- [ ] **Step 2: Swap the stub `<aside>` for the new component (two placements)**

At the top of `app/notes/[id]/page.tsx`, add the import (near the other local imports, after the `@dnd-kit/utilities` import at line 22):

```tsx
import { FavoritesSidebar } from "./FavoritesSidebar";
```

Two placements are needed because the mobile disclosure must render above the log (inside the left column) while the desktop aside must render in the right column of the grid.

**Placement A — mobile disclosure, inside the left column, between the header and the controls row.**

Find the controls row (the `{entries.length > 0 && ( ... )}` block that renders the Filter/Sort chips — currently starts around line 713). Directly *above* that block, insert:

```tsx
<FavoritesSidebar
  variant="mobile"
  favorites={[]}
  signedUrls={signedUrls}
  onScrollToEntry={() => {}}
  onUnstar={() => {}}
/>
```

The component internally applies `lg:hidden` so it's invisible on desktop.

**Placement B — desktop aside, replacing the current stub in the right column.**

At the bottom of `NotePage`'s main return, find the current stub aside (currently around lines 907–915):

```tsx
<aside
  aria-label="Favorites"
  className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pt-12"
>
  <p className="meta mb-3">Favorites</p>
  <p className="text-sm text-[var(--ink-3)]">
    Favorites will live here.
  </p>
</aside>
```

Replace with:

```tsx
<FavoritesSidebar
  variant="desktop"
  favorites={[]}
  signedUrls={signedUrls}
  onScrollToEntry={() => {}}
  onUnstar={() => {}}
/>
```

Both placements use empty callbacks and an empty list. Task 7 wires them up. This step exists so the file swap and its build/lint impact are isolated in one commit.

- [ ] **Step 3: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean. Lint may complain about `onScrollToEntry` and `onUnstar` receiving arrow-function-with-unused-args props — the current stubs `() => {}` accept zero args (matching `.length = 0`), which satisfies the type signature. No suppression needed.

- [ ] **Step 4: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note in `npm run dev` at width ≥ 1024px, (2) confirm the right column shows the header `Favorites` and the body `No favorites yet. Star any entry to pin it here.`, (3) resize below 1024px — the desktop sidebar disappears from the right, and a small `▸ Favorites` disclosure appears in the left column directly above the Filter/Sort controls row. Click the disclosure — it opens with the same empty-state text; click again — closes. Note: at this step, starring an entry from Task 5 will *not* populate the sidebar — that lands in Task 7."

- [ ] **Step 5: Commit**

```bash
git add "app/notes/[id]/FavoritesSidebar.tsx" "app/notes/[id]/page.tsx"
git commit -m "Extract FavoritesSidebar component with mobile disclosure"
```

---

## Task 7: Wire the sidebar to real favorites + click-to-scroll with highlight + filter clear

**Files:**
- Modify: `app/notes/[id]/page.tsx`

- [ ] **Step 1: Derive the sorted favorites list**

Inside `NotePage`, directly below the existing `visibleEntries` block (currently around line 594), add:

```tsx
const favoriteEntries = [...entries]
  .filter((e) => e.is_favorite)
  .sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
```

Most-recently-starred first. Reads from the same `entries` state that the log uses, so the sidebar reflects optimistic updates from `toggleFavorite` immediately.

- [ ] **Step 2: Add the scroll-to-entry handler with filter-clear + highlight**

Directly below `toggleFavorite` (added in Task 5 Step 2), add:

```tsx
const scrollToEntry = (entryId: string) => {
  const doScroll = () => {
    const el = document.getElementById(`entry-${entryId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("entry-highlight");
    window.setTimeout(() => {
      el.classList.remove("entry-highlight");
    }, 1500);
  };

  const targetEntry = entries.find((e) => e.id === entryId);
  const hiddenByFilter =
    targetEntry &&
    ((filter === "text" && targetEntry.kind !== "text") ||
      (filter === "images" && targetEntry.kind !== "image"));

  if (hiddenByFilter) {
    // Clear the filter first, then scroll after a paint frame so the target
    // row exists in the DOM by the time we ask for it.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filter");
    const query = params.toString();
    router.replace(`/notes/${noteId}${query ? `?${query}` : ""}`, { scroll: false });
    // Two rAFs: one for the URL change to flush, one for the re-rendered row.
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
    return;
  }

  doScroll();
};
```

Two RAFs are used instead of one because the URL change re-renders `NotePage`, which computes `filter` fresh, which re-derives `visibleEntries`. The row DOM isn't guaranteed to exist until after the second paint. Two RAFs are cheap and reliable; a `setTimeout(0)` would work too but is less deterministic.

- [ ] **Step 3: Wire the real props into both `<FavoritesSidebar>` placements**

Both the mobile placement (from Task 6 Step 2, Placement A — above the controls row) and the desktop placement (Placement B — in the right column) currently have `favorites={[]}` with no-op callbacks. Update each render site.

For the mobile placement, change:

```tsx
<FavoritesSidebar
  variant="mobile"
  favorites={[]}
  signedUrls={signedUrls}
  onScrollToEntry={() => {}}
  onUnstar={() => {}}
/>
```

to:

```tsx
<FavoritesSidebar
  variant="mobile"
  favorites={favoriteEntries}
  signedUrls={signedUrls}
  onScrollToEntry={scrollToEntry}
  onUnstar={toggleFavorite}
/>
```

For the desktop placement, change:

```tsx
<FavoritesSidebar
  variant="desktop"
  favorites={[]}
  signedUrls={signedUrls}
  onScrollToEntry={() => {}}
  onUnstar={() => {}}
/>
```

to:

```tsx
<FavoritesSidebar
  variant="desktop"
  favorites={favoriteEntries}
  signedUrls={signedUrls}
  onScrollToEntry={scrollToEntry}
  onUnstar={toggleFavorite}
/>
```

`onUnstar` reuses the existing `toggleFavorite` handler — same logic (`is_favorite: !entry.is_favorite`), just triggered from the sidebar. On success the entry disappears from `favoriteEntries` (which re-derives from `entries`) and its main-log star hollows out (same source of truth).

- [ ] **Step 4: Verify**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all three clean.

- [ ] **Step 5: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note with a mix of text and image entries, (2) star two or three of them — each appears in the right-column sidebar with the full text or a thumbnail and a relative timestamp (`Today · HH:MM` or `MMM D · HH:MM`), (3) most-recently-starred appears at the top, (4) click a sidebar item's body (not the star) — the main log scrolls to that entry and a small vermilion bar flashes on its left edge for ~1.5s, then fades, (5) star the same item again from the sidebar — it should re-bump to the top (favoriting updates `updated_at`), (6) click the filled star in the sidebar — the item disappears from the sidebar and hollows out in the log, (7) turn on `Filter: Text`, then click a favorited *image* entry in the sidebar — the filter should clear (URL loses `?filter=text`), the log scrolls to the image, and the highlight flashes. (8) On <1024px: open the mobile disclosure, confirm favorites appear, star/unstar works, click-to-scroll from the disclosure also works (the log is below it, so scrolling behavior is subtle but the highlight should still flash)."

- [ ] **Step 6: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Wire favorites sidebar with click-to-scroll and filter clear"
```

---

## Task 8: Final walkthrough + build verification

**Files:** none modified.

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: succeeds with no errors. The `/notes/[id]` route should still render as `ƒ` (dynamic). First-load JS should be roughly the same as after Phase 1 — no new dependencies were added.

- [ ] **Step 2: Lint once more**

```bash
npm run lint
```

Expected: zero warnings.

- [ ] **Step 3: End-to-end manual walkthrough (deferred to Blake)**

Report to Blake — with `npm run dev` running, sign in and open a note with at least six mixed entries:

1. Confirm two-column layout at ≥1024px: log on the left, favorites sidebar on the right (initially empty-state text).
2. Star two text entries and one image. Confirm they appear in the sidebar with full content, thumbnail (image capped ~240px tall), and relative timestamps.
3. Confirm sidebar order = most-recent-star-first. Re-star the oldest one — it should move to the top.
4. Click a sidebar item's body. Log scrolls smoothly; left-edge accent bar flashes and fades in ~1.5s. The star and content are otherwise untouched.
5. Click the sidebar item's filled star. It vanishes from the sidebar; the corresponding row's star in the log hollows out.
6. Turn on `Filter: Text`. Click a favorited *image* entry in the sidebar. The filter clears (`?filter=text` disappears from the URL), the log scrolls to the image, and the highlight flashes.
7. `Filter: All`, then `Sort: Custom`, drag an entry to a new position. The star on that entry persists across the drag; the sidebar order is unaffected (drag doesn't touch `is_favorite` or `updated_at`).
8. Test at width <1024px: right sidebar disappears; a `▸ Favorites · N` disclosure appears under the note header. Open it — full content visible. Star/unstar/click-to-scroll from the disclosure all work.
9. Refresh in each state — all stars persist. Sort mode persists. Filter (if set via URL) persists.
10. Keyboard: Tab to a star button, Space or Enter toggles it. Tab to a sidebar body button, Enter jumps to the log entry.
11. Regression: Edit an entry (row-actions Edit button on hover). Confirm the star stays visible during edit. Confirm `(edited)` marker still shows after save. Confirm the sidebar refreshes if the edited entry was favorited (an edit bumps `updated_at`, so it should re-bump to the top of the sidebar — this is a known behavior noted in the spec's open questions).
12. Delete an entry that is favorited. Confirm it disappears from both the log and the sidebar.

- [ ] **Step 4: No commit needed unless step 1 forced a fix**

If step 1 required changes, commit those with a descriptive message.

---

## Notes for the executor

- **Optimistic updates.** Every mutation follows the existing project pattern: check the returned `error`, only mutate local state on success (or revert if we already optimistically updated). Do not refetch after a write.
- **RLS is the security boundary.** No new server-side checks needed. The new `is_favorite` column is covered by the existing owner-only policies on `note_entries`.
- **Tokens over utilities.** All new colors reference CSS custom properties. The single exception is the star's yellow `#F5C518` — an explicit semantic color for "favorited" specified in the spec.
- **`updated_at` bump on favorite is intentional.** Favoriting writes `{ is_favorite: true, updated_at: now() }` in one statement so the sidebar's `order by updated_at desc` puts the most-recently-starred entry on top. Un-favoriting does *not* bump `updated_at` — it just clears the flag.
- **Filter/scroll interaction.** When a sidebar click targets an entry hidden by a filter, we clear the filter *before* scrolling. Do not attempt to scroll to a row that isn't in the DOM.
- **No new dependencies.** Everything Phase 2 needs (`useState`, `useRef`, `document.getElementById`, `scrollIntoView`, `URLSearchParams`, plus the existing Supabase client) is already available.
- **Row keys.** The `<SortableEntryRow>` still uses `entry.id` as its sortable id. The outer wrapping `<div key={entry.id}>` in the map preserves React's reconciliation. The new DOM `id={\`entry-${entry.id}\`}` on the sortable row is what the scroll-to lookup uses.
- **File size after Phase 2.** `page.tsx` grows by roughly 60–90 lines. `FavoritesSidebar.tsx` lands around 130 lines. If a Phase 3 emerges and `page.tsx` still feels overweight, `<EntryRow>` extraction is the next candidate — but it's not needed for Phase 2.
