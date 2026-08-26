# Notes: list mechanics + favorites — design spec

**Date:** 2026-08-25
**Status:** Approved for planning
**Builds on:** `2026-08-25-notes-section-design.md`

## Purpose

Extend the private Notes section with better in-note navigation so a growing note (Elden Ring boss notes, campaign logs, etc.) stays usable as it accumulates entries. Four capabilities:

1. Drag entries into a custom order.
2. Sort the log by date sent or by that custom order.
3. Filter the log to text-only or images-only.
4. Star entries as favorites and view them in a persistent right-hand sidebar.

Ships in two phases so the highest-leverage improvement (reordering) reaches Blake first.

## Non-goals

- No multi-select or bulk operations (star / delete / drag apply to one entry at a time).
- No undo. Confirm dialogs on destructive actions and one-click reversibility for starring are sufficient.
- No in-note search.
- No cross-note favorites view (no `/notes/favorites` roll-up).
- No dragging between notes.
- No mobile-specific drag tuning — accept `@dnd-kit`'s built-in touch defaults.
- No new animations. Drag preview comes from `@dnd-kit`; the "scroll to entry" highlight is a plain CSS transition. No motion library, per CLAUDE.md.
- No per-note "reset custom order" button — the Date sort mode is the reset.

## Shipping plan

Two phases. Each phase merges independently as its own PR.

- **Phase 1 — List mechanics.** Layout split (log left, favorites placeholder right), filter chips, sort toggle, drag-and-drop reordering. After this phase Blake can already reorder and filter; the favorites sidebar exists in the DOM as an empty pane.
- **Phase 2 — Favorites.** Star toggle on each entry, favorites sidebar populated with starred entries, click-to-scroll behavior.

Splitting this way means the Phase 1 branch includes the layout restructure so Phase 2 only touches the sidebar's contents, not the page shape.

## Data model changes

Schema additions are split by phase so each phase's SQL migration is self-contained.

### Phase 1 additions

**`note_entries`:**

```sql
alter table public.note_entries
  add column if not exists position double precision;

create index if not exists note_entries_note_id_position_idx
  on public.note_entries (note_id, position);
```

**`notes`:**

```sql
alter table public.notes
  add column if not exists sort_mode text
    not null default 'date'
    check (sort_mode in ('date','custom'));
```

- **`position double precision`**: the custom-order slot. Fractional so inserting an entry between two neighbors only rewrites the moved entry's `position` — no re-numbering cascade. Nullable so existing rows don't need a backfill migration; the client backfills a note's positions lazily the first time a drag happens in that note.
- **`sort_mode`**: which lens this specific note was last viewed through. Persists per note so an arranged note comes back arranged. Only two legal values; enforced by check constraint.

### Phase 2 additions

**`note_entries`:**

```sql
alter table public.note_entries
  add column if not exists is_favorite boolean not null default false;

create index if not exists note_entries_note_id_is_favorite_idx
  on public.note_entries (note_id, is_favorite)
  where is_favorite = true;
```

- **`is_favorite boolean not null default false`**: the star flag. Partial index on `is_favorite = true` because the sidebar query only reads favorited rows.

RLS policies from the original notes spec already cover all new columns — no new policies needed (owner-only for select/insert/update/delete on `note_entries` and `notes`).

### Client-side (transient) state

- **Filter (`all` / `text` / `images`)** lives in the URL query string: `/notes/[id]?filter=images`. Survives page refresh and browser back/forward; resets to `all` when unset. Not persisted in the database — filter is a temporary lens, not a preference.

## Layout

The `/notes/[id]` page changes from a centered narrow reading column to a two-column layout on `lg` and above:

```
┌─────────────────────────────────────────────┬──────────────────────┐
│ Breadcrumb                                  │                      │
│ Title              [Delete note]            │  Favorites · N       │
│ N entries · updated Aug 25                  │  ─────────────────── │
│                                             │  [starred entry]     │
│ Filter: All Text Images  Sort: Date Custom  │  [starred entry]     │
│ ─────────────────────────────────────────── │  [starred entry]     │
│ [entry log with drag handles + stars]       │  ...                 │
│                                             │  (scrollable)        │
│ [input bar]                                 │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

- Container becomes `max-w-page mx-auto` with a `lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8` grid.
- Left column: everything currently in `/notes/[id]` (breadcrumb, header, filter/sort controls, log, sticky input bar).
- Right column: `Favorites` sidebar, sticky-top so it stays in view while the log scrolls. Its own vertical scroll if the favorites list overflows.
- On screens below `lg`, favorites collapse into a `.disclosure` block above the log, header `Favorites · N ▸`, closed by default.

## Phase 1 — List mechanics

### Filter chips + sort toggle

A controls row directly under the note header, before the log:

```
Filter:  [ All ] [ Text ] [ Images ]        Sort:  [ Date ] [ Custom ]
```

- Segmented button groups using the existing `.btn-quiet` class; the active option gets an accent-wash background and `--accent-ink` text.
- Filter clicks push a URL query update (`router.replace('/notes/[id]?filter=text', { scroll: false })`).
- Sort clicks update `notes.sort_mode` via Supabase and trigger a re-sort of the local `entries` array.
- Both controls hidden entirely when there are no entries yet (empty-state cleanliness).

### Drag handle on each entry row

- Every row gains a new leftmost grid column for the drag handle. New grid: `[handle 1.5rem] [timestamp 3.5rem] [content 1fr]`.
- Handle glyph: a six-dot grip (SVG inline), color `var(--ink-3)`. Cursor: `grab` on hover, `grabbing` while dragging.
- Handle is the drag activator (not the whole row) so text selection inside an entry still works.

### Drag behavior

- Library: `@dnd-kit/core` + `@dnd-kit/sortable`. Chosen for keyboard/screen-reader accessibility and touch support. This is the only new dependency introduced by this feature.
- On drop:
  1. Compute the moved entry's new `position` as the midpoint of its two new neighbors: `(prev.position + next.position) / 2`. If the entry is now first, use `next.position - 1`. If last, use `prev.position + 1`.
  2. If any target position is `null` (fresh note, first drag), lazily backfill *all* entries in this note first: `position = i + 1` in current chronological order, one bulk update. Then compute the midpoint.
  3. Persist the moved entry's new `position` via a single `update` on `note_entries`.
  4. If the current sort mode is `date`, silently flip `notes.sort_mode` to `custom` and re-sort locally. The visible chip animates over.
- **Dragging is disabled while any filter is active.** The handle renders greyed out (`opacity-30 cursor-not-allowed`) and a small helper text appears inline once, near the filter controls: `Clear filter to reorder.`
- Fractional `position` collisions never happen in practice, but if two positions ever match, `created_at` ascending is the tiebreaker in the sort key.

### Sort semantics

- `sort_mode = 'date'`: sort entries by `created_at` ascending. Ignores `position` entirely.
- `sort_mode = 'custom'`: sort entries by `position` ascending, tiebreaker `created_at` ascending. Rows with `position = null` (never backfilled) fall to the end sorted by `created_at`.
- Sort mode change is instantaneous — no server round trip beyond the `sort_mode` write.

### Filter semantics

- `filter = all` (default): all entries visible.
- `filter = text`: only `kind = 'text'` entries visible.
- `filter = images`: only `kind = 'image'` entries visible.
- Filter is a *display* filter — send, edit, delete, and star still operate on the visible set. Sending a text entry while `filter=images` inserts the entry into the DB but it will not be visible until the filter is cleared.

### Empty-state and error behavior

- If filtered set is empty ("No text entries yet." / "No image entries yet."), show a single-line placeholder in the log area. Sort/filter chips stay visible.
- Drag-and-drop failures (Supabase `update` returns an error) revert the local order and surface the error via the existing `.alert` component; no partial state is left in memory.
- If lazy backfill fails, the drag is aborted and the user sees `Couldn't save order: <message>`.

## Phase 2 — Starring + favorites sidebar

### Star toggle on each entry

- Each entry row gains a star button at the far right of the content column.
- Glyph: SVG star, `1rem` square. Hollow state: `stroke="var(--ink-3)"`, no fill. Filled state: `fill="#F5C518"` (a warm yellow), `stroke="#F5C518"`.
- Click issues a single `update` on `note_entries` setting `is_favorite = <new value>` and, when favoriting, `updated_at = now()` in the same statement so the newly-favorited entry lands at the top of the sidebar. Un-favoriting does not bump `updated_at`.
- No confirm dialog — reversible in one click.
- Star is *always visible*, unlike the hover-revealed Edit/Delete buttons. It's a primary affordance, not a secondary action.

### Favorites sidebar

- Rendered inside the right-column grid cell on `lg+`; inside a `.disclosure` above the log below `lg`.
- Sticky-top on desktop: `lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`.
- Header row:
  ```
  Favorites · N
  ```
  in `.meta` uppercase mono. `N` is `favorited.length`; hidden if zero.
- Body: a vertical list of every entry in this note with `is_favorite = true`.
- **Order:** most recently starred first (`order by updated_at desc`). Rationale: starring is an intentional action, and the most recent star is what the user was just thinking about.
- **Each sidebar item shows the full content** — text entries render their whole message; image entries show a thumbnail at `max-w-full max-h-[240px]`, click-to-open in a new tab like in the main log.
- Below each item: a `.data` timestamp (relative: `Today · 3:42pm` for today, else `Aug 24 · 3:42pm`).
- Each item has its own **filled star icon** on the top-right of its card; clicking un-stars the entry, removes it from the sidebar, and hollows the star in the log.
- Empty state:
  ```
  Favorites · 0
  No favorites yet. Star any entry to pin it here.
  ```

### Click-to-scroll behavior

- Clicking a favorited item's *body* (not its star icon) scrolls the main log to the corresponding entry.
- Implementation: each log entry renders a stable `id={`entry-${entry.id}`}` attribute. Sidebar click calls `document.getElementById(...)?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- After scroll, add a `.entry-highlight` class to the target for 1.5 seconds — a plain CSS transition on the entry's border-color, from `var(--rule)` to `var(--accent)` and back.
- If the target entry is currently hidden by an active filter, clear the filter first (update the URL), wait one paint frame with `requestAnimationFrame`, then scroll and highlight.

### Signed URL handling for sidebar images

- Sidebar image entries use the *same* signed URL as the main log — no duplicate fetch. When the page loads `note_entries`, it generates one signed URL per image path regardless of whether the entry is favorited; sidebar and log both read from the shared `signedUrls` state map keyed by entry id.

## Interaction between phases

- Phase 1 ships with the two-column layout in place. The favorites sidebar column exists but its body is a single stub: `Favorites will live here.` (No new schema in Phase 1 for `is_favorite`; the column is added in Phase 2's migration.)
- Alternative: Phase 1 could keep the current single-column layout and Phase 2 restructures it. Rejected because the layout restructure is the visually disruptive change; doing it once, in Phase 1, means Phase 2 is a pure content-fill.

## Component structure

Phase 1 adds:
- Small SVG-icon components inline where used (grip, no separate file yet).
- No new file — all changes stay inside `app/notes/[id]/page.tsx`. If it grows past ~800 lines during Phase 2, extract `<EntryRow>` and `<FavoritesSidebar>` into sibling files under `app/notes/[id]/`.

Phase 2 adds:
- Star SVG icon inline.
- A `FavoritesSidebar` component if the page has grown enough to warrant extraction; otherwise inline. Decide during implementation based on file size at that point.

## Accessibility

- **Drag handle:** `@dnd-kit` provides keyboard drag via Space to pick up, arrow keys to move, Space to drop. `aria-label="Reorder entry"` on each handle.
- **Sort/filter chips:** rendered as `<button>` with `aria-pressed={isActive}`.
- **Star:** `aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}` on each star button, and `aria-pressed={isFavorite}`.
- **Sidebar items:** each is a `<button>` (semantically a jump control), `aria-label="Scroll to this entry in the log"`.
- **Filter+drag disabled state:** when filter is active, the drag handle sets `aria-disabled="true"` and the helper text is `aria-live="polite"` so screen readers announce the reason on first appearance.

## Verification model

Same as the original notes spec — no test runner, verified via:
1. `npm run lint` — zero warnings.
2. `npx tsc --noEmit` — clean.
3. Manual walkthrough in `npm run dev`.

Manual checklists per phase go in the implementation plans, not here.

## Open questions for implementation

- Sidebar ordering uses `updated_at`, which is also mutated by content edits. An edit to a favorited entry will re-bump it to the top of the sidebar. Probably fine — the user just interacted with that entry, so surfacing it feels correct — but if this becomes noisy, add a dedicated `favorited_at` column in a follow-up. Not blocking.
