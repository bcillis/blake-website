# Notes list mechanics — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/notes/[id]` a two-column layout, a filter chip row (all / text / images), a sort toggle (date / custom) persisted per note, and drag-and-drop reordering via `@dnd-kit`. The favorites sidebar exists as an empty right-column stub after this phase; Phase 2 fills it.

**Architecture:** Extend the existing `notes` and `note_entries` schema with a `sort_mode` column on the note and a fractional `position` column on entries. Wrap the log in a `DndContext` + `SortableContext` from `@dnd-kit/sortable`. Filter lives in the URL (`?filter=text`). Sort mode is persisted per-note in Supabase and drives client-side ordering; dragging a row auto-flips the sort to `custom` and writes the moved entry's new midpoint position.

**Tech Stack:** Next.js 14 App Router (client components), TypeScript, Tailwind, `@supabase/ssr` browser client, `@dnd-kit/core` + `@dnd-kit/sortable` (new). No test runner — verification via `npm run lint`, `npx tsc --noEmit`, `npm run build`, and manual `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-08-25-notes-list-mechanics-and-favorites-design.md`

---

## File Structure

**Modified:**
- `supabase-schema.sql` — append two ALTER TABLE blocks and two indexes.
- `lib/supabase.ts` — extend `Note` (add `sort_mode`) and `NoteEntry` (add `position`) types.
- `app/notes/[id]/page.tsx` — the entire feature lands here.
- `package.json` / `package-lock.json` — new `@dnd-kit` deps.

**No new files.** The page is currently 596 lines. Phase 1 will push it to roughly ~800 lines. Extraction of `<EntryRow>` / `<FavoritesSidebar>` is explicitly deferred to Phase 2 (see spec).

**No changes to:**
- `components/Navbar.tsx`
- Any `/notes/layout.tsx` or `/notes/[id]/layout.tsx`
- Any other route

---

## Verification model

No test runner (see `CLAUDE.md`). Every code task uses this three-step check:

1. `npm run lint` — must stay at **zero warnings**.
2. `npx tsc --noEmit` — must exit clean.
3. Manual: exercise the change in `npm run dev` on http://localhost:3000. Blake performs manual steps; agentic executors defer manual checks to Blake explicitly.

Schema tasks apply via the Supabase MCP `apply_migration` tool (or Blake runs the SQL by hand — either works).

---

## Task 1: Schema — add `position` and `sort_mode` columns

**Files:**
- Modify: `supabase-schema.sql` — append at the end of the file (after the `note-images` bucket policies).

- [ ] **Step 1: Append the migration block**

At the very end of `supabase-schema.sql`, append:

```sql
-- =============================================================
-- Notes list mechanics — Phase 1 additions
-- Adds a custom-order slot to note entries and a per-note sort preference.
-- Safe to re-run (all statements are idempotent).
-- =============================================================

alter table public.note_entries
  add column if not exists position double precision;

create index if not exists note_entries_note_id_position_idx
  on public.note_entries (note_id, position);

alter table public.notes
  add column if not exists sort_mode text
    not null default 'date';

-- Named constraint so re-runs don't create duplicate anonymous checks.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notes_sort_mode_check'
  ) then
    alter table public.notes
      add constraint notes_sort_mode_check
      check (sort_mode in ('date','custom'));
  end if;
end $$;
```

- [ ] **Step 2: Commit the schema change**

```bash
git add supabase-schema.sql
git commit -m "Add position and sort_mode columns for notes list mechanics"
```

---

## Task 2: Apply the schema to Supabase

**Files:** none in the repo — database migration only.

- [ ] **Step 1: Apply the SQL**

Two options — either works:

- **Option A (Blake runs it):** Ask Blake to open the Supabase SQL Editor (project `lamefzddvcefmcinybxn` — bcillis-website) and paste the new block from the bottom of `supabase-schema.sql`. Wait for confirmation.
- **Option B (MCP):** Use `mcp__plugin_supabase_supabase__apply_migration` with `name: "notes_list_mechanics_phase_1"` and the SQL from Task 1 Step 1 as the query. Confirm the response indicates success.

- [ ] **Step 2: Verify the columns exist**

Run via MCP: `mcp__plugin_supabase_supabase__execute_sql` with:

```sql
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and (
     (table_name = 'note_entries' and column_name = 'position')
     or (table_name = 'notes' and column_name = 'sort_mode')
   );
```

Expected: two rows. `note_entries.position` is `double precision`, nullable, no default. `notes.sort_mode` is `text`, not nullable, default `'date'::text`.

No commit for this task (nothing changed in the repo).

---

## Task 3: Extend TypeScript types

**Files:**
- Modify: `lib/supabase.ts` — extend the existing `Note` and `NoteEntry` interfaces.

- [ ] **Step 1: Add the new fields**

Find the `Note` interface in `lib/supabase.ts` and add `sort_mode`:

```ts
export interface Note {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sort_mode: "date" | "custom";
}
```

Find the `NoteEntry` interface and add `position`:

```ts
export interface NoteEntry {
  id: string;
  note_id: string;
  user_id: string;
  kind: "text" | "image";
  content: string | null;
  image_path: string | null;
  position: number | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean. `tsc` may briefly complain in `app/notes/[id]/page.tsx` about property access on `note.sort_mode` — check that no such access exists yet (page.tsx only reads `note.title`, `note.updated_at`, `note.id`), so `tsc` should be silent.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "Add sort_mode and position to Note/NoteEntry types"
```

---

## Task 4: Install `@dnd-kit` dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

`@dnd-kit/utilities` is required because `@dnd-kit/sortable`'s `CSS.Transform.toString()` helper lives there.

- [ ] **Step 2: Verify build still succeeds**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all three clean. The build must succeed cleanly before the packages are considered installed correctly.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @dnd-kit packages for note entry reordering"
```

---

## Task 5: Layout — split `/notes/[id]` into a two-column grid

**Files:**
- Modify: `app/notes/[id]/page.tsx` — restructure the top-level return of the main render path (the last `return` in the file, currently starting near line 387).

This task changes the layout without adding new features. The favorites right-column is a static stub. This lets the visual restructure land in one focused commit before drag/sort/filter arrive.

- [ ] **Step 1: Wrap the existing page body in a two-column grid**

Find the main return in `app/notes/[id]/page.tsx` (the one that renders when `authLoading` is false, `loading` is false, and `note` exists). It currently begins:

```tsx
return (
  <div className="max-w-text mx-auto px-6 pb-24 flex flex-col min-h-[calc(100vh-4rem)]">
```

Replace that opening `<div>` and the entire body up to the matching closing `</div>` (the last line before `);` in this return) with the following structure. The **inner "left column" contents are unchanged** — every child that was previously inside the outer `<div>` becomes the direct children of the new `<div className="min-w-0 flex flex-col min-h-[calc(100vh-4rem)]">` on the left.

```tsx
return (
  <div className="max-w-page mx-auto px-6 pb-24 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8">
    <div className="min-w-0 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* --- everything from the previous <div>'s contents goes here, unchanged --- */}
      {/* breadcrumb <nav>, header <header>, log <div ref={logRef}>, error alert, sticky input bar */}
    </div>

    <aside
      aria-label="Favorites"
      className="hidden lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto pt-12"
    >
      <p className="meta mb-3">Favorites</p>
      <p className="text-sm text-[var(--ink-3)]">
        Favorites will live here.
      </p>
    </aside>
  </div>
);
```

The literal move is:
- Change outermost `<div className="max-w-text mx-auto px-6 pb-24 flex flex-col min-h-[calc(100vh-4rem)]">` to `<div className="max-w-page mx-auto px-6 pb-24 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8">`.
- Immediately open a new `<div className="min-w-0 flex flex-col min-h-[calc(100vh-4rem)]">` inside that.
- Close that new inner `<div>` right before the outer closing `</div>`.
- Insert the `<aside>` shown above between the inner `</div>` and the outer `</div>`.

Do **not** modify the breadcrumb, header, log, alert, or input bar contents. Only the wrapping element changes.

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 3: Manual verification (deferred to Blake)**

Report: "Blake — please open `/notes/[some-existing-note]` in `npm run dev` at width ≥ 1024px (lg breakpoint). Confirm the log stays roughly where it was (now on the left) and a `Favorites will live here.` stub appears on the right. At width < 1024px the stub should disappear entirely (mobile has no sidebar yet — a mobile disclosure lands in Phase 2)."

- [ ] **Step 4: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Split /notes/[id] into two-column grid with favorites stub"
```

---

## Task 6: Filter chips + visible-entries filter

**Files:**
- Modify: `app/notes/[id]/page.tsx`

- [ ] **Step 1: Import `useSearchParams` and `useRouter`, add a `filter` type**

At the top of the file, change:

```tsx
import { useParams } from "next/navigation";
```

to:

```tsx
import { useParams, useRouter, useSearchParams } from "next/navigation";
```

Directly below the existing top-of-file constants (after `MIME_TO_EXT` and before `formatTime`), add:

```ts
type EntryFilter = "all" | "text" | "images";

const parseFilter = (raw: string | null): EntryFilter => {
  if (raw === "text" || raw === "images") return raw;
  return "all";
};
```

- [ ] **Step 2: Read the filter from the URL inside the component**

Just after the existing `const noteId = params.id as string;` line (currently around line 37), add:

```tsx
const router = useRouter();
const searchParams = useSearchParams();
const filter: EntryFilter = parseFilter(searchParams.get("filter"));
```

- [ ] **Step 3: Add a handler that updates the URL when a chip is clicked**

Just below the `deleteNote` handler (currently ends around line 336), add:

```tsx
const setFilter = (next: EntryFilter) => {
  const params = new URLSearchParams(searchParams.toString());
  if (next === "all") {
    params.delete("filter");
  } else {
    params.set("filter", next);
  }
  const query = params.toString();
  router.replace(`/notes/${noteId}${query ? `?${query}` : ""}`, { scroll: false });
};
```

- [ ] **Step 4: Compute the visible entries list**

Just above the JSX return (find `if (!authLoading && !user) {` — insert immediately before it), add:

```tsx
const visibleEntries = entries.filter((entry) => {
  if (filter === "text") return entry.kind === "text";
  if (filter === "images") return entry.kind === "image";
  return true;
});
```

- [ ] **Step 5: Render the filter chips in the header**

In the header block, find the paragraph:

```tsx
<p className="data mt-3 text-[var(--ink-3)]">
  {entries.length} {entries.length === 1 ? "entry" : "entries"} · updated{" "}
  ...
</p>
```

Directly below the closing `</header>` (the `</header>` currently around line 459), and before the log `<div ref={logRef}>`, insert this controls row:

```tsx
{entries.length > 0 && (
  <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
    <span className="meta">Filter</span>
    <div className="flex gap-1" role="group" aria-label="Filter entries">
      {(["all", "text", "images"] as EntryFilter[]).map((option) => {
        const active = filter === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            aria-pressed={active}
            className={`btn-quiet ${
              active ? "bg-[var(--accent-wash)] text-[var(--accent-ink)]" : ""
            }`}
          >
            {option === "all" ? "All" : option === "text" ? "Text" : "Images"}
          </button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 6: Point the render loop at `visibleEntries` and update the empty-state copy**

Find the log body:

```tsx
{entries.length === 0 ? (
  <p className="text-[var(--ink-3)] italic py-16 text-center">
    No entries yet. Type below and press Enter.
  </p>
) : (
  entries.map((entry, i) => {
```

Replace with:

```tsx
{entries.length === 0 ? (
  <p className="text-[var(--ink-3)] italic py-16 text-center">
    No entries yet. Type below and press Enter.
  </p>
) : visibleEntries.length === 0 ? (
  <p className="text-[var(--ink-3)] italic py-16 text-center">
    {filter === "text" ? "No text entries yet." : "No image entries yet."}
  </p>
) : (
  visibleEntries.map((entry, i) => {
```

Inside the `.map` body, find the line:

```tsx
const prev = entries[i - 1];
```

Change to:

```tsx
const prev = visibleEntries[i - 1];
```

This ensures the day-divider only fires when the *previous visible* entry is on a different day, not the previous unfiltered entry.

- [ ] **Step 7: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 8: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note with at least one text and one image entry, (2) confirm the `Filter: All Text Images` chips appear below the header, (3) click Text — only text entries visible; URL becomes `?filter=text`, (4) click Images — only images visible, (5) refresh — the filter persists across the reload, (6) click All or use the back button — filter clears."

- [ ] **Step 9: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Add all/text/images filter chips backed by URL query"
```

---

## Task 7: Sort toggle (date / custom) persisted per note

**Files:**
- Modify: `app/notes/[id]/page.tsx`

- [ ] **Step 1: Compute the sorted-and-visible entries and derive the display order**

Delete the `visibleEntries` block you added in Task 6 Step 4 and replace it in the same location (just before `if (!authLoading && !user) {`) with:

```tsx
const sortedEntries = (() => {
  if (!note || note.sort_mode === "date") {
    return [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
  return [...entries].sort((a, b) => {
    const ap = a.position;
    const bp = b.position;
    if (ap == null && bp == null) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (ap == null) return 1;
    if (bp == null) return -1;
    if (ap === bp) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return ap - bp;
  });
})();

const visibleEntries = sortedEntries.filter((entry) => {
  if (filter === "text") return entry.kind === "text";
  if (filter === "images") return entry.kind === "image";
  return true;
});
```

- [ ] **Step 2: Add a handler that flips the sort mode and persists it**

Directly below the `setFilter` handler from Task 6 Step 3, add:

```tsx
const setSortMode = async (next: "date" | "custom") => {
  if (!note || note.sort_mode === next) return;
  // Optimistic local flip so the log re-orders immediately.
  setNote({ ...note, sort_mode: next });
  const supabase = createClient();
  const { error: updateError } = await supabase
    .from("notes")
    .update({ sort_mode: next })
    .eq("id", note.id);
  if (updateError) {
    // Revert on failure.
    setNote(note);
    setError(`Couldn't change sort: ${updateError.message}`);
  }
};
```

- [ ] **Step 3: Render the sort toggle in the same controls row as the filter**

In the controls row from Task 6 Step 5, extend the block. Replace:

```tsx
{entries.length > 0 && (
  <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
    <span className="meta">Filter</span>
    <div className="flex gap-1" role="group" aria-label="Filter entries">
      ...
    </div>
  </div>
)}
```

with:

```tsx
{entries.length > 0 && (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 pb-2">
    <div className="flex items-center gap-3">
      <span className="meta">Filter</span>
      <div className="flex gap-1" role="group" aria-label="Filter entries">
        {(["all", "text", "images"] as EntryFilter[]).map((option) => {
          const active = filter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={active}
              className={`btn-quiet ${
                active ? "bg-[var(--accent-wash)] text-[var(--accent-ink)]" : ""
              }`}
            >
              {option === "all" ? "All" : option === "text" ? "Text" : "Images"}
            </button>
          );
        })}
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="meta">Sort</span>
      <div className="flex gap-1" role="group" aria-label="Sort entries">
        {(["date", "custom"] as const).map((option) => {
          const active = note?.sort_mode === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setSortMode(option)}
              aria-pressed={active}
              className={`btn-quiet ${
                active ? "bg-[var(--accent-wash)] text-[var(--accent-ink)]" : ""
              }`}
            >
              {option === "date" ? "Date" : "Custom"}
            </button>
          );
        })}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Remove the redundant `.order("created_at", ...)` from the initial fetch**

The initial fetch inside the `useEffect` (near line 87) uses `.order("created_at", { ascending: true })`. This is now overridden by the client-side sort in Step 1, but keeping the DB-side order avoids a large re-sort on first paint for notes with many entries. **Leave it alone.**

(This step exists only to prevent an executor from "cleaning up" the DB-side order in a follow-up. Do nothing here.)

- [ ] **Step 5: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 6: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note, confirm `Sort: Date Custom` chips appear next to the filter chips, (2) click Custom — nothing visually changes yet because no entries have a `position` (that's fine; drag lands in Task 8), (3) reload — the sort mode you picked should still be highlighted, confirming the DB write succeeded, (4) click Date — reverts."

- [ ] **Step 7: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Add date/custom sort toggle persisted per note"
```

---

## Task 8: Drag-and-drop reordering with `@dnd-kit`

**Files:**
- Modify: `app/notes/[id]/page.tsx`

This is the largest task. Adds a drag handle to each entry, wraps the log in a `DndContext` + `SortableContext`, implements the drop math (midpoint + lazy backfill), and auto-flips the sort to `custom` on drop.

- [ ] **Step 1: Add the dnd-kit imports**

At the top of the file, immediately after the `import { useAuth } ...` line, add:

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

- [ ] **Step 2: Add the `<SortableEntryRow>` inner component**

At the *very top of the file*, immediately after the existing `isSameDay` helper (currently around line 32) and before `export default function NotePage()`, insert the following. It receives everything through props so it doesn't need to touch `NotePage`'s hooks directly.

```tsx
type SortableEntryRowProps = {
  entry: NoteEntry;
  timeLabel: string;
  dragDisabled: boolean;
  children: React.ReactNode;
};

const SortableEntryRow = ({
  entry,
  timeLabel,
  dragDisabled,
  children,
}: SortableEntryRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id, disabled: dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group grid grid-cols-[1.5rem_3.5rem_1fr] gap-3"
    >
      <button
        type="button"
        aria-label="Reorder entry"
        aria-disabled={dragDisabled}
        {...(dragDisabled ? {} : attributes)}
        {...(dragDisabled ? {} : listeners)}
        className={`self-start pt-1 text-[var(--ink-3)] ${
          dragDisabled ? "opacity-30 cursor-not-allowed" : "cursor-grab active:cursor-grabbing hover:text-[var(--ink-2)]"
        }`}
      >
        <svg viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
          <circle cx="3" cy="3" r="1.2" fill="currentColor" />
          <circle cx="9" cy="3" r="1.2" fill="currentColor" />
          <circle cx="3" cy="8" r="1.2" fill="currentColor" />
          <circle cx="9" cy="8" r="1.2" fill="currentColor" />
          <circle cx="3" cy="13" r="1.2" fill="currentColor" />
          <circle cx="9" cy="13" r="1.2" fill="currentColor" />
        </svg>
      </button>
      <time
        dateTime={entry.created_at}
        className="data text-[var(--ink-3)] pt-0.5"
      >
        {timeLabel}
      </time>
      <div className="min-w-0">{children}</div>
    </div>
  );
};
```

Note the new grid `grid-cols-[1.25rem_3.5rem_1fr]` — that's the three-column layout (handle, timestamp, content) that replaces the current two-column `grid-cols-[3.5rem_1fr]`.

- [ ] **Step 3: Set up sensors inside the component**

Inside `NotePage`, immediately after the `const [savingTitle, setSavingTitle] = useState(false);` line (currently around line 53), add:

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

The `distance: 4` on the pointer sensor prevents accidental drags when the user just clicks the handle.

- [ ] **Step 4: Add the `handleDragEnd` handler**

Directly below `setSortMode` (from Task 7 Step 2), add:

```tsx
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id || !note) return;

  // Compute the moved entry's new position based on its new neighbors
  // in the currently-visible order.
  const oldIndex = visibleEntries.findIndex((e) => e.id === active.id);
  const newIndex = visibleEntries.findIndex((e) => e.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;

  const reordered = [...visibleEntries];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);

  const supabase = createClient();

  // Lazy backfill: if any position in this note is null, assign positions
  // to every entry in current chronological order, then continue.
  const anyNull = entries.some((e) => e.position == null);
  let backfilledEntries = entries;
  if (anyNull) {
    const byDate = [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    backfilledEntries = byDate.map((e, i) => ({ ...e, position: i + 1 }));
    const backfillRows = backfilledEntries.map((e) => ({
      id: e.id,
      note_id: e.note_id,
      user_id: e.user_id,
      kind: e.kind,
      position: e.position,
    }));
    const { error: backfillError } = await supabase
      .from("note_entries")
      .upsert(backfillRows, { onConflict: "id" });
    if (backfillError) {
      setError(`Couldn't save order: ${backfillError.message}`);
      return;
    }
    setEntries(backfilledEntries);
  }

  // Recompute the reordered list against the (possibly) backfilled entries
  // so that `moved` carries a non-null position for neighbor math below.
  const currentSource = anyNull ? backfilledEntries : entries;
  const currentVisible = currentSource.filter((entry) => {
    if (filter === "text") return entry.kind === "text";
    if (filter === "images") return entry.kind === "image";
    return true;
  });
  const currentReordered = [...currentVisible];
  const currentOld = currentReordered.findIndex((e) => e.id === active.id);
  const currentNew = currentReordered.findIndex((e) => e.id === over.id);
  const [currentMoved] = currentReordered.splice(currentOld, 1);
  currentReordered.splice(currentNew, 0, currentMoved);

  const prev = currentReordered[currentNew - 1];
  const next = currentReordered[currentNew + 1];
  let newPosition: number;
  if (prev && next && prev.position != null && next.position != null) {
    newPosition = (prev.position + next.position) / 2;
  } else if (prev && prev.position != null) {
    newPosition = prev.position + 1;
  } else if (next && next.position != null) {
    newPosition = next.position - 1;
  } else {
    newPosition = 1;
  }

  // Optimistic local update.
  const updatedEntries = currentSource.map((e) =>
    e.id === active.id ? { ...e, position: newPosition } : e
  );
  setEntries(updatedEntries);

  const { error: updateError } = await supabase
    .from("note_entries")
    .update({ position: newPosition })
    .eq("id", active.id);
  if (updateError) {
    // Revert on failure.
    setEntries(currentSource);
    setError(`Couldn't save order: ${updateError.message}`);
    return;
  }
  setError(null);

  // Auto-flip sort to custom if we weren't already there.
  if (note.sort_mode !== "custom") {
    setNote({ ...note, sort_mode: "custom" });
    const { error: sortError } = await supabase
      .from("notes")
      .update({ sort_mode: "custom" })
      .eq("id", note.id);
    if (sortError) {
      // Non-fatal: the position was saved. Log to console for diagnosis.
      // Reverting the position now would be more disruptive than leaving it.
      console.warn("Failed to flip sort mode to custom:", sortError.message);
    }
  }
};
```

- [ ] **Step 5: Wrap the log in `DndContext` + `SortableContext` and swap to `SortableEntryRow`**

Find the log render block (currently starting around line 461 with `<div ref={logRef}...`). The entries `.map()` produces a `<div key={entry.id}>` per entry, containing the day divider paragraph and the per-entry grid.

The change is one large find/replace on the log render block. Find this exact block (currently around lines 461–558 of `app/notes/[id]/page.tsx`):

```tsx
<div
  ref={logRef}
  className="flex-1 overflow-y-auto py-6 space-y-4"
  aria-live="polite"
>
  {entries.length === 0 ? (
    <p className="text-[var(--ink-3)] italic py-16 text-center">
      No entries yet. Type below and press Enter.
    </p>
  ) : visibleEntries.length === 0 ? (
    <p className="text-[var(--ink-3)] italic py-16 text-center">
      {filter === "text" ? "No text entries yet." : "No image entries yet."}
    </p>
  ) : (
    visibleEntries.map((entry, i) => {
      const prev = visibleEntries[i - 1];
      const showDay = !prev || !isSameDay(prev.created_at, entry.created_at);
      return (
        <div key={entry.id}>
          {showDay && (
            <p className="meta py-2 border-b border-[var(--rule)] mb-3">
              {formatDayLabel(entry.created_at)}
            </p>
          )}
          <div className="group grid grid-cols-[3.5rem_1fr] gap-3">
            <time
              dateTime={entry.created_at}
              className="data text-[var(--ink-3)] pt-0.5"
            >
              {formatTime(entry.created_at)}
            </time>
            <div className="min-w-0">
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
          </div>
        </div>
      );
    })
  )}
</div>
```

Replace with:

```tsx
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <div
    ref={logRef}
    className="flex-1 overflow-y-auto py-6 space-y-4"
    aria-live="polite"
  >
    {entries.length === 0 ? (
      <p className="text-[var(--ink-3)] italic py-16 text-center">
        No entries yet. Type below and press Enter.
      </p>
    ) : visibleEntries.length === 0 ? (
      <p className="text-[var(--ink-3)] italic py-16 text-center">
        {filter === "text" ? "No text entries yet." : "No image entries yet."}
      </p>
    ) : (
      <SortableContext
        items={visibleEntries.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        {visibleEntries.map((entry, i) => {
          const prev = visibleEntries[i - 1];
          const showDay = !prev || !isSameDay(prev.created_at, entry.created_at);
          return (
            <div key={entry.id}>
              {showDay && (
                <p className="meta py-2 border-b border-[var(--rule)] mb-3">
                  {formatDayLabel(entry.created_at)}
                </p>
              )}
              <SortableEntryRow
                entry={entry}
                timeLabel={formatTime(entry.created_at)}
                dragDisabled={filter !== "all"}
              >
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
              </SortableEntryRow>
            </div>
          );
        })}
      </SortableContext>
    )}
  </div>
</DndContext>
```

- [ ] **Step 6: Add a helper text near the sort/filter chips when drag is disabled**

In the controls row from Task 7 Step 3, directly after the closing `</div>` of the Sort group (before the outer `</div>` that wraps both groups), add:

```tsx
{filter !== "all" && (
  <p className="meta text-[var(--ink-3)]" aria-live="polite">
    Clear filter to reorder.
  </p>
)}
```

- [ ] **Step 7: Verify**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all three clean.

- [ ] **Step 8: Manual verification (deferred to Blake)**

Report: "Blake — please: (1) open a note with at least three entries, (2) grab the six-dot handle on the left of any entry and drag it above or below another, (3) confirm the row moves and stays where you dropped it after the drop, (4) confirm the Sort chip auto-flipped to Custom, (5) reload — order is preserved, (6) flip Sort to Date — chronological order returns, (7) flip Sort back to Custom — your arrangement returns, (8) turn on Filter: Text — the drag handles should grey out and a `Clear filter to reorder.` hint appears, (9) click a greyed handle — nothing happens, (10) clear the filter — dragging works again."

- [ ] **Step 9: Commit**

```bash
git add "app/notes/[id]/page.tsx"
git commit -m "Add drag-and-drop reordering with @dnd-kit and auto-flip to custom sort"
```

---

## Task 9: Final walkthrough + build verification

**Files:** none modified.

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: succeeds with no errors. The `/notes/[id]` route should still show as `ƒ` (dynamic) with a slightly larger first-load JS due to `@dnd-kit`.

- [ ] **Step 2: Lint once more**

```bash
npm run lint
```

Expected: zero warnings.

- [ ] **Step 3: End-to-end manual walkthrough (deferred to Blake)**

Report to Blake — with `npm run dev` running:

1. Sign in. Navigate to a note that already has ~5 entries mixing text and images.
2. Confirm the two-column layout: log on the left, `Favorites will live here.` stub on the right (only at width ≥ 1024px).
3. Confirm the controls row appears under the header with `Filter: All Text Images` and `Sort: Date Custom` chips.
4. Filter to Text — only text entries visible; URL is `?filter=text`. Refresh — filter persists.
5. Filter to Images — only images visible. Try to send a text entry from the input bar — it inserts into the DB but doesn't appear in view (expected). Clear filter — new text entry appears.
6. Clear filter, then flip Sort to Custom — nothing changes visually yet (no `position` values set).
7. Grab an entry's handle and drop it above another. Confirm it moves. Confirm Sort chip stayed on Custom (or auto-flipped if you had it on Date).
8. Reload — the custom order persists.
9. Flip Sort to Date — chronological order returns.
10. Flip Sort back to Custom — your arrangement returns.
11. Filter to Text — drag handles grey out, `Clear filter to reorder.` hint appears.
12. Attempt to drag a greyed handle — nothing happens.
13. Clear filter — dragging works again.
14. Test keyboard drag: Tab to a handle, Space to pick up, arrow keys to move, Space to drop.
15. On mobile (or narrow browser <1024px): confirm the log fills the width and the favorites stub is hidden.

- [ ] **Step 4: No commit needed unless step 1 forced a fix**

If step 1 required changes, commit those with a descriptive message.

---

## Notes for the executor

- **Optimistic updates.** Every mutation follows the existing project pattern: check the returned `error`, only mutate local state on success (or revert if we already optimistically updated). Do not refetch after a write.
- **RLS is the security boundary.** No new server-side checks needed. The new columns are covered by the existing owner-only policies on `notes` and `note_entries`.
- **No motion library beyond `@dnd-kit`.** `@dnd-kit` handles its own drag preview via CSS transforms; do not add framer-motion or a global animation library. Any additional transitions use plain CSS (Task 6 chip active state uses a static class swap, not a transition).
- **Tokens over utilities.** All new colors reference CSS custom properties (`var(--ink-3)`, `var(--accent-wash)`, `var(--accent-ink)`, etc.). No `dark:` variants.
- **Row keys.** The `<SortableEntryRow>` uses `entry.id` as its sortable id via `useSortable({ id: entry.id })`. The outer wrapping `<div key={entry.id}>` in the map preserves React's reconciliation.
- **File size.** The page is expected to reach roughly ~800 lines by the end of Phase 1. Do not extract components — Phase 2 will inherit a page that's clearly ready for a `<EntryRow>` split, and doing it then keeps the diffs in Phase 1 focused on functionality.
