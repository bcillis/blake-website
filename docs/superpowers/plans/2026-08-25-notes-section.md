# Notes Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a private, owner-only "Notes" section with a chat-log style UI that lets Blake paste text and images as chronological entries — replacing the Discord-alt-account habit.

**Architecture:** Two new Supabase tables (`notes`, `note_entries`) plus a private `note-images` Storage bucket, all gated by owner-only RLS (unlike the rest of the site which is public-read). Two new App Router segments (`/notes`, `/notes/[id]`), both `"use client"`, following the existing guides pattern of direct Supabase calls with a sibling `layout.tsx` for metadata. Image entries store only the Storage path; signed URLs are generated per read and never persisted.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, `@supabase/ssr` browser client, no test runner (verification via `npm run lint`, `npm run build`, and manual `npm run dev` checks).

**Spec:** `docs/superpowers/specs/2026-08-25-notes-section-design.md`

---

## File Structure

**New files:**
- `app/notes/layout.tsx` — static `metadata` for the index route
- `app/notes/page.tsx` — index page (list, create, delete notes)
- `app/notes/[id]/layout.tsx` — `generateMetadata` for note routes, with `robots: noindex`
- `app/notes/[id]/page.tsx` — chat log page (title, entries, input bar, paste, edit, delete)

**Modified files:**
- `supabase-schema.sql` — append tables, RLS, bucket, storage policies
- `lib/supabase.ts` — add `Note` and `NoteEntry` interfaces
- `components/Navbar.tsx` — add owner-only "Notes" link

**No new dependencies.**

---

## Verification model

This project has no test runner (see `CLAUDE.md`). Every code task uses this three-step check:

1. `npm run lint` — must stay at **zero warnings**.
2. `npx tsc --noEmit` — must exit clean (or run `npm run build` if you want the fuller compile pass).
3. Manual: whatever change was made, exercise it in `npm run dev` on http://localhost:3000.

Schema tasks are verified by running the SQL and confirming it applies cleanly (either in the Supabase SQL Editor by Blake, or via the Supabase MCP `apply_migration` tool if you have access).

---

## Task 1: Schema — `notes` and `note_entries` tables

**Files:**
- Modify: `supabase-schema.sql` — append at the end of the existing file, before the storage section.

- [ ] **Step 1: Append the two tables**

Open `supabase-schema.sql` and append (after the wishlist table block, before the RLS section header):

```sql
-- 5. Notes table (private — owner-only for both read and write)
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Note entries table (private — owner-only for both read and write)
create table if not exists public.note_entries (
  id uuid default gen_random_uuid() primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid references auth.users(id),
  kind text not null check (kind in ('text','image')),
  content text,
  image_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists note_entries_note_id_created_at_idx
  on public.note_entries (note_id, created_at);
```

- [ ] **Step 2: Append the RLS enable + policies for both tables**

In the RLS Policies section of `supabase-schema.sql` (after the wishlist policies), add:

```sql
alter table public.notes         enable row level security;
alter table public.note_entries  enable row level security;

-- Notes policies (owner-only for ALL operations, unlike the public-read tables above)
drop policy if exists "Owners can view their notes"    on public.notes;
drop policy if exists "Owners can insert their notes"  on public.notes;
drop policy if exists "Owners can update their notes"  on public.notes;
drop policy if exists "Owners can delete their notes"  on public.notes;

create policy "Owners can view their notes" on public.notes
  for select using (auth.uid() = user_id);
create policy "Owners can insert their notes" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their notes" on public.notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owners can delete their notes" on public.notes
  for delete using (auth.uid() = user_id);

-- Note entries policies (owner-only for ALL operations)
drop policy if exists "Owners can view their note entries"    on public.note_entries;
drop policy if exists "Owners can insert their note entries"  on public.note_entries;
drop policy if exists "Owners can update their note entries"  on public.note_entries;
drop policy if exists "Owners can delete their note entries"  on public.note_entries;

create policy "Owners can view their note entries" on public.note_entries
  for select using (auth.uid() = user_id);
create policy "Owners can insert their note entries" on public.note_entries
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their note entries" on public.note_entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owners can delete their note entries" on public.note_entries
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Commit the schema change**

```bash
git add supabase-schema.sql
git commit -m "Add notes and note_entries tables with owner-only RLS"
```

---

## Task 2: Schema — private `note-images` Storage bucket + policies

**Files:**
- Modify: `supabase-schema.sql` — append after the existing `course-files` storage block.

- [ ] **Step 1: Append the bucket + policies**

At the end of `supabase-schema.sql`:

```sql
-- =============================================================
-- Private Storage bucket for note images (pasted screenshots, etc.)
-- Unlike course-files, this bucket is NOT public — reads require a signed URL.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Owners can view note images"    on storage.objects;
drop policy if exists "Owners can upload note images"  on storage.objects;
drop policy if exists "Owners can update note images"  on storage.objects;
drop policy if exists "Owners can delete note images"  on storage.objects;

-- The app uploads to `{user.id}/{note_id}/{uuid}.{ext}`, so the first path
-- segment must equal the caller's uid for every operation, INCLUDING select
-- (because the bucket is private and even signed-URL generation goes through
-- the select policy).
create policy "Owners can view note images" on storage.objects
  for select using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owners can upload note images" on storage.objects
  for insert with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owners can update note images" on storage.objects
  for update using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owners can delete note images" on storage.objects
  for delete using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase-schema.sql
git commit -m "Add private note-images Storage bucket for notes section"
```

---

## Task 3: Apply the schema to Supabase

**Files:** none in the repo — this is a database migration step.

- [ ] **Step 1: Apply the SQL**

Two options — either works:

- **Option A (Blake runs it):** Ask Blake to open the Supabase SQL Editor and paste the two new blocks from `supabase-schema.sql` (or paste the whole file — it's safe to re-run). Wait for confirmation that it applied without error.
- **Option B (MCP applies it):** Use the `mcp__plugin_supabase_supabase__apply_migration` tool. Pass the two new blocks as one migration named `notes_and_note_images`. Confirm the response indicates success.

- [ ] **Step 2: Verify the tables exist**

Either ask Blake to run `select * from public.notes limit 1;` in the SQL Editor (expected: empty result, no error), or use `mcp__plugin_supabase_supabase__list_tables` and confirm `notes` and `note_entries` are present.

- [ ] **Step 3: Verify the bucket exists**

In the Supabase dashboard → Storage, confirm `note-images` is present and is **not** marked public. If you have MCP access you can also inspect via `execute_sql`: `select id, name, public from storage.buckets where id = 'note-images';` — expected: one row, `public` is `false`.

No commit for this task (nothing changed in the repo).

---

## Task 4: Add TypeScript types

**Files:**
- Modify: `lib/supabase.ts` — append two interfaces below `WishlistItem`.

- [ ] **Step 1: Add the interfaces**

At the end of `lib/supabase.ts`, after the `WishlistItem` interface:

```ts
export interface Note {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NoteEntry {
  id: string;
  note_id: string;
  user_id: string;
  kind: "text" | "image";
  content: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify**

Run:

```bash
npx tsc --noEmit
```

Expected: exits clean.

Run:

```bash
npm run lint
```

Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "Add Note and NoteEntry types for notes section"
```

---

## Task 5: Add Notes link to the Navbar (owner-only)

**Files:**
- Modify: `components/Navbar.tsx`

The existing `navLinks` array is rendered for everyone. Notes is private, so it must only render when `user` is truthy. Rather than adding a conditional inside the map, we build the visible list inline.

- [ ] **Step 1: Replace the static navLinks list with a user-aware list**

In `components/Navbar.tsx`, find:

```ts
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/websites", label: "Websites" },
  { href: "/journey", label: "Journey" },
  { href: "/guides", label: "Guides" },
  { href: "/wishlist", label: "Wishlist" },
];
```

Leave it as-is (it stays the base list), and inside the component (after the existing `useAuth()` call), compute the visible list:

```ts
const visibleNavLinks = user
  ? [...navLinks, { href: "/notes", label: "Notes" }]
  : navLinks;
```

Then in both the desktop `<nav>` and the mobile `<nav>` inside the disclosure, change `navLinks.map(...)` to `visibleNavLinks.map(...)`. There are two occurrences.

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

Start the dev server:

```bash
npm run dev
```

- Sign out. Confirm the navbar (desktop and mobile) does **not** show "Notes".
- Sign in at `/login` (Blake uses his own credentials). Confirm "Notes" now appears in the navbar and links to `/notes`.
- The `/notes` route doesn't exist yet, so clicking will render a 404 — that's fine for now.

- [ ] **Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "Show Notes navbar link only when signed in"
```

---

## Task 6: Create `/notes` layout with metadata

**Files:**
- Create: `app/notes/layout.tsx`

- [ ] **Step 1: Create the file**

Create `app/notes/layout.tsx`:

```tsx
import { pageMetadata } from "@/lib/metadata";

export const metadata = {
  ...pageMetadata({
    title: "Notes",
    description: "Personal chronological notes.",
    path: "/notes",
  }),
  robots: { index: false, follow: false },
};

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean. (The page itself doesn't exist yet; the layout compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add app/notes/layout.tsx
git commit -m "Add /notes layout with noindex metadata"
```

---

## Task 7: Create `/notes` index page

**Files:**
- Create: `app/notes/page.tsx`

This mirrors `app/guides/page.tsx` structurally: header, count + "New" button, disclosure form, list. Differences from guides:

- Owner-only visibility: signed-out users get a "Sign in" panel instead of the list.
- No slug field — the URL is the note UUID.
- Preview text comes from a fetched first entry (fetched separately, per-note; see below).
- Delete cascades images from Storage before deleting the row.

Because the index needs a preview per note, we fetch `notes` first, then for each note fetch the first `note_entry` (`limit 1`, ordered by `created_at`). A single JOIN would be cleaner but Supabase's PostgREST select syntax makes "first row per parent" awkward — the two-step fetch is clearer and, at Blake's scale, cheap.

- [ ] **Step 1: Create the file**

Create `app/notes/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, Note, NoteEntry } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

const textPreview = (entry: NoteEntry | undefined): string => {
  if (!entry) return "Empty";
  if (entry.kind === "image") return "[image]";
  const line = (entry.content ?? "").split("\n").find((l) => l.trim()) ?? "";
  return line.length > 120 ? `${line.slice(0, 120)}…` : line || "Empty";
};

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [firstEntries, setFirstEntries] = useState<Record<string, NoteEntry | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNotes([]);
      setFirstEntries({});
      setLoading(false);
      return;
    }
    fetchNotes();
  }, [user, authLoading]);

  const fetchNotes = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: noteRows } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });
    const rows = noteRows ?? [];
    setNotes(rows);

    if (rows.length > 0) {
      const { data: entries } = await supabase
        .from("note_entries")
        .select("*")
        .in("note_id", rows.map((n) => n.id))
        .order("created_at", { ascending: true });
      const firstByNote: Record<string, NoteEntry> = {};
      for (const entry of entries ?? []) {
        if (!firstByNote[entry.note_id]) firstByNote[entry.note_id] = entry;
      }
      setFirstEntries(firstByNote);
    } else {
      setFirstEntries({});
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert([{ title, user_id: user.id }])
      .select()
      .single();
    if (error) {
      setActionError(`Couldn't create the note: ${error.message}`);
      setSubmitting(false);
      return;
    }
    if (data) {
      setActionError(null);
      router.push(`/notes/${data.id}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async (note: Note) => {
    if (!confirm("Delete this note and all its entries?")) return;
    const supabase = createClient();

    const { data: imageRows } = await supabase
      .from("note_entries")
      .select("image_path")
      .eq("note_id", note.id)
      .eq("kind", "image");
    const paths = (imageRows ?? [])
      .map((r) => r.image_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from("note-images").remove(paths);
    }

    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) {
      setActionError(`Couldn't delete: ${error.message}`);
      return;
    }
    setActionError(null);
    setNotes(notes.filter((n) => n.id !== note.id));
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-page mx-auto px-6 pb-24">
        <header className="pt-16 pb-10">
          <p className="meta mb-5">Contents</p>
          <h1 className="page-title mb-5">Notes.</h1>
          <p className="lead">
            Personal chronological notes. This section is private — sign in to view.
          </p>
        </header>
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">
            <Link href="/login" className="underline hover:text-[var(--accent)]">
              Sign in
            </Link>{" "}
            to view your notes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-6 pb-24">
      <header className="pt-16 pb-10">
        <p className="meta mb-5">Contents</p>
        <h1 className="page-title mb-5">Notes.</h1>
        <p className="lead">
          Chronological notes for whatever I want to remember later. Text and pasted
          images, one entry at a time.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="meta">
          {String(notes.length).padStart(2, "0")} {notes.length === 1 ? "note" : "notes"}
        </span>
        {user && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-quiet">
            New note
          </button>
        )}
      </div>

      {user && (
        <div className={`disclosure ${showForm ? "disclosure-open" : ""}`}>
          <div>
            <form
              onSubmit={handleCreate}
              className="mb-6 border border-[var(--rule-strong)] bg-[var(--surface)] p-5 space-y-3"
            >
              <p className="meta">New note</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
                placeholder="Title — e.g. Elden Ring boss notes"
                required
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={submitting || !title.trim()} className="btn">
                  {submitting ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setTitle("");
                  }}
                  className="btn-quiet"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionError && (
        <div role="alert" className="alert mb-6">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="index" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="index-row">
              <div className="h-5 skeleton w-1/3 mb-2" />
              <div className="h-3 skeleton w-2/3" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="index">
          <p className="py-16 text-[var(--ink-3)]">No notes yet.</p>
        </div>
      ) : (
        <ol className="index">
          {notes.map((note, i) => {
            const preview = textPreview(firstEntries[note.id]);
            return (
              <li key={note.id}>
                <article className="index-row group sm:grid-cols-[2.5rem_1fr_auto] sm:items-baseline">
                  <span
                    aria-hidden="true"
                    className="data text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <h2 className="row-title">
                      <Link href={`/notes/${note.id}`} className="stretched-link">
                        {note.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-[var(--ink-2)] mt-1 max-w-[60ch]">{preview}</p>
                    {user && (
                      <div className="row-actions mt-2.5">
                        <button onClick={() => handleDelete(note)} className="btn-bare">
                          Delete<span className="sr-only"> {note.title}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="data shrink-0 sm:text-right text-[var(--ink-3)]">
                    {note.updated_at ? formatDate(note.updated_at) : ""}
                  </span>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 3: Manual verification**

Start `npm run dev` and:

- **Signed out:** Navigate to `/notes`. Expected: header renders, plus a "Sign in to view your notes" panel. No list, no create form.
- **Signed in, empty:** Sign in, revisit `/notes`. Expected: "No notes yet."
- **Create flow:** Click "New note", type a title, submit. Expected: routed to `/notes/[uuid]` — that route 404s because we haven't built it yet, but the row is created. Navigate back manually to `/notes` and confirm the new note appears with preview "Empty" and today's date.
- **Delete flow:** Click Delete on a note, confirm the prompt. Expected: row disappears from the list and from the database (verify via Supabase dashboard).

- [ ] **Step 4: Commit**

```bash
git add app/notes/page.tsx
git commit -m "Add /notes index page with owner-only create, list, delete"
```

---

## Task 8: Create `/notes/[id]` layout with noindex metadata

**Files:**
- Create: `app/notes/[id]/layout.tsx`

- [ ] **Step 1: Create the file**

Create `app/notes/[id]/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * Note titles are private (RLS blocks reads without a session), so
 * generateMetadata running server-side with the anon key can never resolve
 * the real title. This is intentional — we always fall back to "Notes" and
 * mark every note route as non-indexable.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const url = absoluteUrl(`/notes/${params.id}`);
  return {
    title: "Notes",
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `Notes — ${SITE_NAME}`,
      url,
    },
    robots: { index: false, follow: false },
  };
}

export default function NoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add app/notes/[id]/layout.tsx
git commit -m "Add /notes/[id] layout with noindex metadata"
```

---

## Task 9: Create `/notes/[id]` page scaffold — read + render + text send

**Files:**
- Create: `app/notes/[id]/page.tsx`

This first pass gets the page rendering end-to-end with the ability to post text entries. Image paste, edit, delete, title rename, and note deletion come in later tasks — but the file structure has to accommodate them, so we set up helpers and refs now.

- [ ] **Step 1: Create the file**

Create `app/notes/[id]/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient, Note, NoteEntry } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

const IMAGE_URL_TTL_SECONDS = 60 * 60;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });

const formatDayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

const isSameDay = (a: string, b: string) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export default function NotePage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [entries, setEntries] = useState<NoteEntry[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: noteRow } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .maybeSingle();
      if (cancelled) return;
      if (!noteRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setNote(noteRow);

      const { data: entryRows } = await supabase
        .from("note_entries")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = entryRows ?? [];
      setEntries(rows);

      const imagePaths = rows
        .filter((r) => r.kind === "image" && r.image_path)
        .map((r) => r.image_path as string);
      if (imagePaths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("note-images")
          .createSignedUrls(imagePaths, IMAGE_URL_TTL_SECONDS);
        if (cancelled) return;
        const byPath: Record<string, string> = {};
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) byPath[s.path] = s.signedUrl;
        }
        const byEntry: Record<string, string> = {};
        for (const r of rows) {
          if (r.kind === "image" && r.image_path && byPath[r.image_path]) {
            byEntry[r.id] = byPath[r.image_path];
          }
        }
        setSignedUrls(byEntry);
      }

      setLoading(false);
      // Defer to next paint so the DOM has heights measured.
      requestAnimationFrame(scrollToBottom);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [noteId, user, authLoading, scrollToBottom]);

  const sendText = async () => {
    const body = draft.trim();
    if (!body || !user || !note) return;
    setSending(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("note_entries")
      .insert([
        {
          note_id: note.id,
          user_id: user.id,
          kind: "text",
          content: body,
        },
      ])
      .select()
      .single();
    if (insertError) {
      setError(`Couldn't send: ${insertError.message}`);
      setSending(false);
      return;
    }
    if (data) {
      setError(null);
      setEntries((prev) => [...prev, data]);
      setDraft("");
      // Bump note.updated_at locally so the index list feels correct on back-nav.
      await supabase
        .from("notes")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", note.id);
      requestAnimationFrame(scrollToBottom);
    }
    setSending(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-text mx-auto px-6 pt-20 pb-24">
        <p className="meta mb-5">Private</p>
        <h1 className="page-title mb-5">This note is private.</h1>
        <p className="lead mb-8">
          Notes are only visible to the owner.{" "}
          <Link href="/login" className="underline hover:text-[var(--accent)]">
            Sign in
          </Link>{" "}
          to view.
        </p>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-text mx-auto px-6 pt-16" aria-busy="true">
        <div className="h-3 skeleton w-24 mb-8" />
        <div className="h-9 skeleton w-2/3 mb-6" />
        <div className="h-4 skeleton w-full mb-2.5" />
        <div className="h-4 skeleton w-5/6" />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="max-w-text mx-auto px-6 pt-20 pb-24">
        <p className="meta mb-5">Not found</p>
        <h1 className="page-title mb-5">No note at this address.</h1>
        <Link href="/notes" className="btn">
          All notes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-text mx-auto px-6 pb-24 flex flex-col min-h-[calc(100vh-4rem)]">
      <nav aria-label="Breadcrumb" className="pt-12 pb-6">
        <ol className="flex items-center gap-2 meta">
          <li>
            <Link href="/notes" className="hover:text-[var(--accent)] transition-colors">
              Notes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--ink-2)] truncate">{note.title}</li>
        </ol>
      </nav>

      <header className="pb-6 border-b border-[var(--rule-strong)]">
        <h1 className="page-title">{note.title}</h1>
        <p className="data mt-3 text-[var(--ink-3)]">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} · updated{" "}
          {new Date(note.updated_at).toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </header>

      <div
        ref={logRef}
        className="flex-1 overflow-y-auto py-6 space-y-4"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <p className="text-[var(--ink-3)] italic py-16 text-center">
            No entries yet. Type below and press Enter.
          </p>
        ) : (
          entries.map((entry, i) => {
            const prev = entries[i - 1];
            const showDay = !prev || !isSameDay(prev.created_at, entry.created_at);
            return (
              <div key={entry.id}>
                {showDay && (
                  <p className="meta py-2 border-b border-[var(--rule)] mb-3">
                    {formatDayLabel(entry.created_at)}
                  </p>
                )}
                <div className="grid grid-cols-[3.5rem_1fr] gap-3">
                  <time
                    dateTime={entry.created_at}
                    className="data text-[var(--ink-3)] pt-0.5"
                  >
                    {formatTime(entry.created_at)}
                  </time>
                  <div className="min-w-0">
                    {entry.kind === "text" ? (
                      <p className="whitespace-pre-wrap break-words text-[var(--ink)]">
                        {entry.content}
                      </p>
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
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div role="alert" className="alert mb-3">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 bg-[var(--bg)] border-t border-[var(--rule)] pt-3 pb-4">
        <label htmlFor="note-input" className="sr-only">
          New entry
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="note-input"
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            className="field-area flex-1 font-serif text-sm"
            placeholder="Write a note, or paste an image (Ctrl+V)…"
          />
          <button
            onClick={sendText}
            disabled={sending || !draft.trim()}
            className="btn"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 3: Manual verification**

- **Signed out:** Navigate to `/notes/<any-uuid>`. Expected: "This note is private" panel.
- **Signed in, unknown id:** Navigate to `/notes/00000000-0000-0000-0000-000000000000`. Expected: "No note at this address."
- **Signed in, real note (create one via `/notes`):** Navigate to it. Expected: title renders, "No entries yet" message, input bar at the bottom.
- **Send text:** Type "hello world" and press Enter. Expected: entry appears in the log with today's date banner and current time. Textarea clears. Send button disables while sending.
- **Newline:** Type "line one", Shift+Enter, "line two", Enter. Expected: entry appears with both lines rendered (whitespace preserved).
- **Reload:** Refresh the page. Expected: entries persist and the log auto-scrolls to the bottom.

- [ ] **Step 4: Commit**

```bash
git add app/notes/[id]/page.tsx
git commit -m "Add /notes/[id] page with read, render, and text send"
```

---

## Task 10: Add image paste + upload to the input bar

**Files:**
- Modify: `app/notes/[id]/page.tsx`

Two additions: a MIME → extension map at the top of the file, an `uploading` state and an `onPaste` handler on the textarea. The handler intercepts clipboard images, uploads them, inserts an entry row, generates a signed URL for local render.

- [ ] **Step 1: Add the MIME map**

Below the existing constants at the top of `app/notes/[id]/page.tsx`, add:

```ts
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};
```

- [ ] **Step 2: Add uploading state**

Inside the component, next to the other `useState` calls:

```ts
const [uploading, setUploading] = useState(false);
```

- [ ] **Step 3: Add the paste handler**

Below `sendText`, add:

```ts
const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  if (!user || !note) return;
  const imageItem = Array.from(e.clipboardData.items).find((item) =>
    item.type.startsWith("image/")
  );
  if (!imageItem) return; // Fall through to default text paste.
  e.preventDefault();
  const blob = imageItem.getAsFile();
  if (!blob) return;

  setUploading(true);
  const supabase = createClient();
  const ext = MIME_TO_EXT[blob.type] ?? "bin";
  const objectPath = `${user.id}/${note.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("note-images")
    .upload(objectPath, blob, { contentType: blob.type, upsert: false });
  if (uploadError) {
    setError(`Upload failed: ${uploadError.message}`);
    setUploading(false);
    return;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("note_entries")
    .insert([
      {
        note_id: note.id,
        user_id: user.id,
        kind: "image",
        image_path: objectPath,
      },
    ])
    .select()
    .single();
  if (insertError || !inserted) {
    setError(`Couldn't attach image: ${insertError?.message ?? "unknown error"}`);
    // Clean up the orphaned upload — we own the folder.
    await supabase.storage.from("note-images").remove([objectPath]);
    setUploading(false);
    return;
  }

  const { data: signed } = await supabase.storage
    .from("note-images")
    .createSignedUrl(objectPath, IMAGE_URL_TTL_SECONDS);
  if (signed?.signedUrl) {
    setSignedUrls((prev) => ({ ...prev, [inserted.id]: signed.signedUrl }));
  }
  setEntries((prev) => [...prev, inserted]);
  setError(null);
  await supabase
    .from("notes")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", note.id);
  requestAnimationFrame(scrollToBottom);
  setUploading(false);
};
```

- [ ] **Step 4: Wire the handler and the uploading indicator into the JSX**

Add `onPaste={handlePaste}` to the `<textarea>` element (next to `onKeyDown`).

Directly above the sticky input bar's inner `<div className="flex items-end gap-2">`, add:

```tsx
{uploading && (
  <p className="data text-[var(--ink-3)] pb-2">Uploading image…</p>
)}
```

- [ ] **Step 5: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 6: Manual verification**

- **Paste PNG:** Take a screenshot with `Win+Shift+S`, then click into the textarea of an open note and press Ctrl+V. Expected: "Uploading image…" appears briefly, then an image entry appears in the log at the current time. Nothing is written into the textarea.
- **Paste alongside typed text:** Type "here's a screenshot", then Ctrl+V an image. Expected: image posts as its own entry; the typed text stays in the textarea untouched. Now press Enter to send the text as a separate entry.
- **Reload:** Refresh the page. Expected: the image entry still renders correctly with a freshly-signed URL. Clicking the image opens the full-size version in a new tab.
- **Read the failure path in the code once:** confirm `handlePaste` removes the just-uploaded object if the row insert fails (the `remove([objectPath])` call). This is the important invariant — no need to simulate the failure.

- [ ] **Step 7: Commit**

```bash
git add app/notes/[id]/page.tsx
git commit -m "Support pasting images into note entries via Ctrl+V"
```

---

## Task 11: Add entry deletion (text + image)

**Files:**
- Modify: `app/notes/[id]/page.tsx`

For image entries, delete the Storage object first (best-effort), then the row. For text entries, just delete the row.

- [ ] **Step 1: Add the delete handler**

Below `handlePaste`, add:

```ts
const deleteEntry = async (entry: NoteEntry) => {
  if (!confirm("Delete this entry?")) return;
  const supabase = createClient();
  if (entry.kind === "image" && entry.image_path) {
    // Best-effort: proceed even if Storage delete fails so the row goes away.
    await supabase.storage.from("note-images").remove([entry.image_path]);
  }
  const { error: deleteError } = await supabase
    .from("note_entries")
    .delete()
    .eq("id", entry.id);
  if (deleteError) {
    setError(`Couldn't delete: ${deleteError.message}`);
    return;
  }
  setError(null);
  setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  setSignedUrls((prev) => {
    if (!(entry.id in prev)) return prev;
    const next = { ...prev };
    delete next[entry.id];
    return next;
  });
};
```

- [ ] **Step 2: Add a hover-revealed Delete control to each entry row**

Inside the `entries.map(...)` block, in the content column (`<div className="min-w-0">`), add a `.row-actions` sibling after the text/image render. The whole entry row already has `group` behavior available via a wrapping `<div>` — replace the current per-entry wrapper:

Find:

```tsx
<div className="grid grid-cols-[3.5rem_1fr] gap-3">
```

Replace with:

```tsx
<div className="group grid grid-cols-[3.5rem_1fr] gap-3">
```

Then inside the content column, after the ternary that renders text/image, add:

```tsx
<div className="row-actions mt-1.5">
  <button onClick={() => deleteEntry(entry)} className="btn-bare">
    Delete<span className="sr-only"> entry</span>
  </button>
</div>
```

- [ ] **Step 3: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 4: Manual verification**

- Hover over a text entry. Expected: "Delete" appears in the row's actions slot.
- Click Delete on a text entry, confirm. Expected: entry disappears from log. Reload — still gone.
- Click Delete on an image entry. Confirm. Expected: entry disappears; verify in Supabase Storage that the object is also gone.

- [ ] **Step 5: Commit**

```bash
git add app/notes/[id]/page.tsx
git commit -m "Add delete control to individual note entries"
```

---

## Task 12: Add inline edit for text entries

**Files:**
- Modify: `app/notes/[id]/page.tsx`

- [ ] **Step 1: Add editing state and handlers**

Next to the other `useState` calls:

```ts
const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
const [editDraft, setEditDraft] = useState("");
const [savingEdit, setSavingEdit] = useState(false);
```

Below `deleteEntry`, add:

```ts
const startEditing = (entry: NoteEntry) => {
  if (entry.kind !== "text") return;
  setEditingEntryId(entry.id);
  setEditDraft(entry.content ?? "");
};

const cancelEditing = () => {
  setEditingEntryId(null);
  setEditDraft("");
};

const saveEdit = async (entry: NoteEntry) => {
  const trimmed = editDraft.trim();
  if (!trimmed) return;
  setSavingEdit(true);
  const supabase = createClient();
  const { data, error: updateError } = await supabase
    .from("note_entries")
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq("id", entry.id)
    .select()
    .single();
  if (updateError) {
    setError(`Couldn't save edit: ${updateError.message}`);
    setSavingEdit(false);
    return;
  }
  if (data) {
    setError(null);
    setEntries((prev) => prev.map((e) => (e.id === data.id ? data : e)));
    setEditingEntryId(null);
    setEditDraft("");
  }
  setSavingEdit(false);
};
```

- [ ] **Step 2: Render the edit UI conditionally**

Inside the entry render, replace the text branch:

```tsx
{entry.kind === "text" ? (
  <p className="whitespace-pre-wrap break-words text-[var(--ink)]">
    {entry.content}
  </p>
) : entry.image_path && signedUrls[entry.id] ? (
```

with:

```tsx
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
```

- [ ] **Step 3: Add Edit button to the row-actions block for text entries**

Replace the delete-only row-actions block from Task 11:

```tsx
<div className="row-actions mt-1.5">
  <button onClick={() => deleteEntry(entry)} className="btn-bare">
    Delete<span className="sr-only"> entry</span>
  </button>
</div>
```

with:

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

- [ ] **Step 4: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 5: Manual verification**

- Hover a text entry, click Edit. Expected: text is replaced by a textarea prefilled with the content, plus Save/Cancel.
- Change the text and click Save. Expected: entry updates in place; a small mono "(edited)" marker appears after the text.
- Reload. Expected: edited text persists; "(edited)" marker still shown.
- Cancel path: click Edit, change text, click Cancel. Expected: original text remains; no DB write.
- Image entry: hover. Expected: only Delete is shown (no Edit).

- [ ] **Step 6: Commit**

```bash
git add app/notes/[id]/page.tsx
git commit -m "Add inline edit for text note entries with (edited) marker"
```

---

## Task 13: Editable note title + note deletion in header

**Files:**
- Modify: `app/notes/[id]/page.tsx`

The header currently shows title + entry count. Add: click-to-edit title, and a "Delete note" button that cascades images.

- [ ] **Step 1: Add title-editing and note-deletion state**

Next to the other `useState` calls:

```ts
const [editingTitle, setEditingTitle] = useState(false);
const [titleDraft, setTitleDraft] = useState("");
const [savingTitle, setSavingTitle] = useState(false);
```

Below `saveEdit`, add:

```ts
const startEditingTitle = () => {
  if (!note) return;
  setTitleDraft(note.title);
  setEditingTitle(true);
};

const saveTitle = async () => {
  if (!note) return;
  const trimmed = titleDraft.trim();
  if (!trimmed || trimmed === note.title) {
    setEditingTitle(false);
    return;
  }
  setSavingTitle(true);
  const supabase = createClient();
  const { data, error: updateError } = await supabase
    .from("notes")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", note.id)
    .select()
    .single();
  if (updateError) {
    setError(`Couldn't rename: ${updateError.message}`);
    setSavingTitle(false);
    return;
  }
  if (data) {
    setError(null);
    setNote(data);
    setEditingTitle(false);
  }
  setSavingTitle(false);
};

const deleteNote = async () => {
  if (!note) return;
  if (!confirm("Delete this note and all its entries?")) return;
  const supabase = createClient();

  const imagePaths = entries
    .filter((e) => e.kind === "image" && e.image_path)
    .map((e) => e.image_path as string);
  if (imagePaths.length > 0) {
    await supabase.storage.from("note-images").remove(imagePaths);
  }

  const { error: deleteError } = await supabase.from("notes").delete().eq("id", note.id);
  if (deleteError) {
    setError(`Couldn't delete note: ${deleteError.message}`);
    return;
  }
  // Hard-nav so the router forgets this URL entirely.
  window.location.href = "/notes";
};
```

- [ ] **Step 2: Replace the header block**

Find the existing header block:

```tsx
<header className="pb-6 border-b border-[var(--rule-strong)]">
  <h1 className="page-title">{note.title}</h1>
  <p className="data mt-3 text-[var(--ink-3)]">
    {entries.length} {entries.length === 1 ? "entry" : "entries"} · updated{" "}
    {new Date(note.updated_at).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}
  </p>
</header>
```

Replace with:

```tsx
<header className="pb-6 border-b border-[var(--rule-strong)]">
  <div className="flex items-start justify-between gap-4">
    {editingTitle ? (
      <div className="flex-1 space-y-2">
        <label htmlFor="note-title" className="sr-only">
          Note title
        </label>
        <input
          id="note-title"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveTitle();
            } else if (e.key === "Escape") {
              setEditingTitle(false);
            }
          }}
          className="field font-serif text-2xl"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={saveTitle}
            disabled={savingTitle || !titleDraft.trim()}
            className="btn"
          >
            {savingTitle ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditingTitle(false)} className="btn-quiet">
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <h1
        className="page-title cursor-text hover:text-[var(--accent)] transition-colors"
        onClick={startEditingTitle}
        title="Click to rename"
      >
        {note.title}
      </h1>
    )}
    {!editingTitle && (
      <button onClick={deleteNote} className="btn-quiet shrink-0">
        Delete note
      </button>
    )}
  </div>
  <p className="data mt-3 text-[var(--ink-3)]">
    {entries.length} {entries.length === 1 ? "entry" : "entries"} · updated{" "}
    {new Date(note.updated_at).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}
  </p>
</header>
```

- [ ] **Step 3: Verify**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both clean.

- [ ] **Step 4: Manual verification**

- **Rename:** Click the title. Expected: title becomes an input with Save/Cancel; input is focused.
- **Save with Enter:** Change the title, press Enter. Expected: title updates in place, breadcrumb updates too.
- **Cancel with Esc:** Click title, type garbage, press Esc. Expected: revert; no DB write.
- **Delete note:** Click "Delete note", confirm. Expected: full-page nav to `/notes`; the note is gone from the index; verify Supabase that both `notes` and `note_entries` rows are gone, and any image objects for that note are removed from Storage.

- [ ] **Step 5: Commit**

```bash
git add app/notes/[id]/page.tsx
git commit -m "Add editable title and delete-note button to /notes/[id]"
```

---

## Task 14: Final walkthrough + build verification

**Files:** none modified.

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: succeeds with no errors. Any type or lint errors here must be fixed before continuing.

- [ ] **Step 2: End-to-end manual walkthrough**

With `npm run dev` running:

1. Sign out. Confirm no "Notes" in navbar. Visiting `/notes` shows the "Sign in" panel.
2. Sign in. Confirm "Notes" appears in the navbar.
3. Create a note titled "Test Note". Route lands on `/notes/<uuid>`.
4. Post three text entries. Confirm they render in order and auto-scroll to the bottom.
5. Take a screenshot with `Win+Shift+S`. Ctrl+V into the input. Confirm image posts as its own entry.
6. Reload. Confirm text and image entries all render (image via signed URL).
7. Edit one text entry to change wording. Confirm "(edited)" marker appears.
8. Delete one text entry. Confirm it disappears.
9. Delete the image entry. Confirm it disappears and the object is gone from the `note-images` bucket in Supabase.
10. Rename the note to "Test Note Renamed". Confirm the breadcrumb and header both update.
11. Navigate back to `/notes`. Confirm the note appears with the renamed title and the preview from the first remaining text entry.
12. Delete the entire note. Confirm route change to `/notes` and the note is gone.
13. Sign out. Confirm `/notes/<the-deleted-note-uuid>` (from browser history) shows the "This note is private" panel — not a leak.

- [ ] **Step 3: Lint one more time for good measure**

```bash
npm run lint
```

Expected: zero warnings.

- [ ] **Step 4: No commit needed unless step 1 forced a fix**

If step 1 required changes, commit those with a message describing the fix (e.g. `Fix production build after notes section`). Otherwise, done.

---

## Notes for the executor

- **Optimistic updates.** Every mutation follows the existing project pattern: check the returned `error`, only mutate local state on success. Do not refetch after a write — the `.select().single()` returns the fresh row.
- **RLS is the security boundary.** Do not add server-side auth checks. The signed-out UI panels are UX polish, not enforcement.
- **No motion library.** Any transitions use plain CSS. Do not reach for framer-motion — CLAUDE.md documents why it was removed.
- **Tokens over utilities.** All colors reference CSS custom properties (`var(--ink)`, `var(--rule)`, `var(--surface)`, `var(--accent)`, etc.). Do not add `dark:` variants — the token layer handles theming.
- **Signed URL TTL is 1 hour.** If Blake reports that images 403 after leaving a note open all day, add a `visibilitychange` listener to refetch signed URLs — not scoped for v1.
