# Notes section — design spec

**Date:** 2026-08-25
**Status:** Approved for planning

## Purpose

Add a private, owner-only "Notes" section to BlakeHub that lets Blake keep chronological chat-log-style notes with text and pasted images. Replaces the ad-hoc use of a Discord alt account for tracking game info and screenshots.

## Non-goals (v1)

- No sharing notes with anyone else. No per-note public/private toggle.
- No message reactions, replies, threads, or search.
- No text + image in a single entry. Image entries are always standalone.
- No rich text; text entries are plain text with preserved whitespace.
- No file types other than images.
- No pagination or virtualization (a single note is not expected to exceed a few hundred entries in v1; revisit if it does).

## Routes

- `/notes` — index of all notes.
- `/notes/[id]` — individual note (chat log).
- Both are `"use client"` pages following the existing pattern. Each carries a sibling `layout.tsx` with `pageMetadata()`; `/notes/[id]` uses `generateMetadata` to resolve the note title.
- The note detail route is keyed by the note's UUID (`id`), not a slug — titles can be edited, and rewriting URLs on rename adds cost with no user-visible benefit for a private page.

## Navbar

- Add a "Notes" link to `components/Navbar.tsx`, rendered only when `user` is truthy from `useAuth()`.
- Order in the nav: after "Guides".

## Auth & privacy

- Notes and note entries are **fully private**. RLS gates `select` (not just writes) on `auth.uid() = user_id`.
- Signed-out visitors who hit `/notes` or `/notes/[id]` directly see a "Sign in to view" message. RLS is the real enforcement; this is just UI politeness so the page doesn't render an empty error state.
- The `note-images` Storage bucket is **private** (unlike `course-files`, which is public). Images are served via signed URLs generated on read; signed URLs are short-lived and re-issued when the page loads.

## Data model

### `notes` table

| column        | type          | notes                                       |
|---------------|---------------|---------------------------------------------|
| `id`          | uuid          | pk, default `gen_random_uuid()`             |
| `title`       | text          | not null; required on create                |
| `user_id`     | uuid          | references `auth.users(id)`                 |
| `created_at`  | timestamptz   | default `now()`                             |
| `updated_at`  | timestamptz   | default `now()`; bumped when title edits or entries are added/edited/deleted |

### `note_entries` table

| column        | type          | notes                                       |
|---------------|---------------|---------------------------------------------|
| `id`          | uuid          | pk, default `gen_random_uuid()`             |
| `note_id`     | uuid          | references `notes(id)` **on delete cascade** |
| `user_id`     | uuid          | references `auth.users(id)`                 |
| `kind`        | text          | check constraint: `kind in ('text','image')` |
| `content`     | text          | text entries: message body. image entries: null. |
| `image_path`  | text          | image entries only; Storage object path. Used to (a) generate a fresh signed URL on every read, and (b) hard-delete the object when the entry is deleted. Nullable for text. |
| `created_at`  | timestamptz   | default `now()`; drives chronological order |
| `updated_at`  | timestamptz   | default `now()`; bumped on text edits       |

- Index: `create index on public.note_entries (note_id, created_at);` — every fetch is scoped to a single note in chronological order.

### RLS policies

For both `notes` and `note_entries`, every action is owner-only:

```sql
create policy "Owners can view their notes" on public.notes
  for select using (auth.uid() = user_id);
create policy "Owners can insert their notes" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "Owners can update their notes" on public.notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owners can delete their notes" on public.notes
  for delete using (auth.uid() = user_id);
```

Same shape for `note_entries`.

### Storage bucket `note-images`

- Bucket is **private** (`public: false`).
- Path convention: `{user.id}/{note_id}/{uuid}.{ext}`.
- Storage policies: mirror the `course-files` owner-scoped pattern for `insert`/`update`/`delete`. For `select`, require `(storage.foldername(name))[1] = auth.uid()::text` (owner-only, unlike `course-files` which is public-read).
- Images are read via `createSignedUrl` from the client at fetch time; URL TTL: 1 hour. The signed URL is held only in component state, never persisted.

## Note index page (`/notes`)

Mirrors `/guides` structurally.

- Header: `.meta` label "Contents", `.page-title` "Notes.", lead paragraph.
- Count row: `NN notes` on the left, "New note" button on the right (owner-only, hidden when signed out).
- "New note" opens a `.disclosure` with a single title input and Create/Cancel buttons. On submit: insert into `notes`, route to `/notes/[id]`.
- List: `.index` / `.index-row` with three columns on `sm+`: index number, title + preview, updated date.
  - Preview text: first line of the first text entry (truncated to 120 chars) — or `[image]` if the first entry is an image — or `Empty` if the note has no entries.
  - Whole row is a `.stretched-link`; delete button in `.row-actions` under the title.
- Loading: three skeleton rows.
- Empty: "No notes yet."
- Signed-out state: renders only the header and a "Sign in to view your notes" message. No count, no list, no form.

## Note detail page (`/notes/[id]`)

### Header

- Editable title: click the title (or a small edit icon) → replaces with a `.field` input; Enter or blur commits, Esc cancels.
- "Delete note" button in the header, gated on `user`. Confirmation: `confirm("Delete this note and all its entries?")`.
- Small mono line under the title: `NN entries · updated <date>`.

### Entry log

- Chronological order (oldest → newest). Newest at the bottom.
- Auto-scroll to bottom on initial load and after every new entry the user just posted (do not auto-scroll if the user has scrolled up — check `scrollTop` before deciding).
- Layout per entry: a row with mono timestamp (`HH:MM`; date shown when the entry is the first of a new day) on the left, content on the right. No bubbles.
- Text entries: preserve whitespace (`white-space: pre-wrap`), wrap at reading width (~72ch), plain body text.
- Image entries: bordered image with `--rule` border and 2px radius; `object-fit: contain`; max-height around 400px; wrapped in an anchor to the full-size image opening in a new tab.
- Hover any entry: reveals `.row-actions` on the right with "Edit" (text only) and "Delete" controls.
- Text edit: clicking Edit replaces the text with a `.field-area` (auto-grown textarea) and Save/Cancel. Save calls `update` on the entry, sets `updated_at`, and re-renders inline. Edited entries show a tiny `(edited)` mono marker after the timestamp.
- Delete: `confirm("Delete this entry?")`, then delete row. For image entries, also delete the Storage object at `image_path`.

### Input bar

- Sticky at the bottom of the viewport (`position: sticky; bottom: 0;`) inside the page container.
- Textarea (`.field-area`) that auto-grows up to ~6 lines, then scrolls.
- Enter sends; Shift+Enter inserts a newline. Send button on the right as the explicit fallback.
- Send flow (text): insert row with `kind='text'`, `content=<textarea value>`, clear textarea, optimistically append to local state, re-check bottom-scroll.
- **Paste handler:** on `paste` in the textarea, inspect `event.clipboardData.items`. If any item is `image/*`:
  1. `preventDefault()` — image bytes never touch the textarea.
  2. Show a small "Uploading…" line above the input.
  3. Upload the blob to `note-images` at `{user.id}/{note_id}/{crypto.randomUUID()}.{ext}` where `ext` is inferred from the blob's MIME type: `png` for `image/png`, `jpg` for `image/jpeg`, `gif` for `image/gif`, `webp` for `image/webp`, and `bin` for anything else (Storage still serves it correctly via the stored MIME type).
  4. On success: insert a row with `kind='image'`, `image_path`, `content=null`. Call `createSignedUrl` (1h TTL) and attach the signed URL to the in-memory entry only. Optimistically append. Clear the uploading indicator.
  5. On failure: show an `.alert` above the input with the error message; do not clear the textarea (whatever text was there is preserved).
  - Any text the user had typed stays in the textarea — image paste is an out-of-band action and does not consume it.
- If clipboard contains no image, default paste behavior runs (text goes into the textarea).

### Signed-out state

- Renders only the "Sign in to view this note" message. No fetch is attempted.

## Cascading deletes

- Deleting an entry via UI:
  - Text entries: single row delete.
  - Image entries: Storage delete first (best-effort; log failures but proceed), then row delete. If Storage delete fails, the row is still deleted — leaving an orphaned file is preferable to leaving a broken entry in the UI. Orphans are inherently owner-scoped and low-cost.
- Deleting a note via UI:
  - Fetch all image entries for the note (`select image_path from note_entries where note_id = ? and kind = 'image'`).
  - `remove` all paths from Storage in a single bulk call.
  - Delete the note row; the FK cascade removes `note_entries` rows.

## Types (add to `lib/supabase.ts`)

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

The signed URL for image entries is not part of this type — it's computed on demand and held in local component state (e.g. a `Record<entryId, string>` map).

## Metadata

- `/notes` layout: `pageMetadata({ title: "Notes", description: "Personal chronological notes." })`. The description is intentionally generic; nothing about the notes themselves should leak into public metadata since the section is private.
- `/notes/[id]` layout: uses `generateMetadata`. It runs server-side with the anon key and no session, so RLS blocks the read and the fetch returns no row — the title always falls back to `"Notes"`. This is intentional; note titles are private.
- Both notes routes set `robots: { index: false, follow: false }` in their metadata so search engines don't try to index the URLs even though RLS would block any content.

## Styling checklist

- Use token classes only: `.index`, `.index-row`, `.row-title`, `.meta`, `.data`, `.page-title`, `.lead`, `.btn`, `.btn-quiet`, `.btn-bare`, `.field`, `.field-area`, `.disclosure`, `.alert`, `.skeleton`, `.stretched-link`, `.row-actions`.
- No new colors. Timestamps use `text-[var(--ink-3)]` with `.data`. `(edited)` marker uses same treatment.
- No motion library. If the input bar or disclosures need transitions, use the existing `.disclosure` CSS technique or plain CSS `transition`.
- Image borders use `border-[var(--rule)]`; 2px radius comes from the design system default.

## Schema file

- Append all four blocks (two tables, RLS, Storage bucket, Storage policies) to `supabase-schema.sql`. The file must remain safe to re-run: use `create table if not exists`, `drop policy if exists`, and `insert ... on conflict do nothing` for the bucket.
- After the schema is appended, it must be executed in the Supabase SQL Editor by the user. There is no migration runner.

## Open risks

- **Signed URL expiry on long-open pages:** if a user leaves a note open for over an hour, image URLs will 403. Acceptable for v1; if it becomes annoying, refetch signed URLs on window focus.
- **Concurrent edits from multiple tabs:** the app uses optimistic local state, so two tabs editing the same note will diverge until refresh. Same tradeoff as guides. Acceptable for a single-user app.
- **Large image pastes:** no client-side size cap in v1. Supabase Storage has a default 50 MB per object, which is fine for screenshots. If the user starts pasting phone photos, add a cap.
