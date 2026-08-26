# Websites & Wishlist card redesign

**Date:** 2026-08-26
**Scope:** `/websites` and `/wishlist` pages
**Status:** Design approved, ready for implementation planning

## Problem

Today `/websites` and `/wishlist` render entries as vertically-stacked rows in the site-wide ruled index (`.index` / `.index-row`). The rows work for text-only records but bury the fact that most entries are visual — a product I want, a tool with a distinctive logo, a website with a screenshot worth remembering. When browsing, the eye has nothing to grab onto.

## Goals

- Make both pages image-forward: each entry becomes a card with an image as its primary visual.
- Zero-friction default: entries without a user-supplied image show the site's favicon automatically. No blank placeholders, no upload prompt.
- Optional override: signed-in owner can paste an image from the clipboard to replace the favicon.
- Preserve every existing capability (search, sort on Wishlist, running price total, edit/delete, whole-card click target, owner-only writes via RLS).

## Non-goals

- Redesigning `/guides`, `/journey`, or `/notes`. The ruled-index pattern stays as the site's default; cards are the deliberate exception for image-heavy content.
- File-upload UI (only clipboard paste is supported for image override).
- URL-hotlinking to third-party images (fragile; skipped).
- Server-side rendering, API routes, or SWR/React Query — pages remain `"use client"` components talking directly to Supabase, per project conventions.

## Design decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Card layout | 4 columns on desktop, 4:3 image on top, text block below |
| Section width | 800 px centered container — narrower than the site's 1080 px `max-w-page`; header, toolbar, and grid all share the narrow column |
| Responsive | 1 col below sm, 2 cols at sm, 4 cols at md+ |
| Card content — Websites | Image · Title · Description (2-line clamp) · Host |
| Card content — Wishlist | Image · Title · Price (mono) · Host |
| Missing image | Favicon from `https://www.google.com/s2/favicons?domain={host}&sz=128`, rendered at ~56 px, centered on a warm-neutral tile |
| Image source | Clipboard paste only, inside the add/edit form (Approach A from brainstorming) |
| Owner controls | Small `edit` / `del` buttons top-right, visible on hover or keyboard focus |
| Click target | Whole card links to the URL in a new tab (`.stretched-link` pattern) |
| Wishlist total | Right-aligned under the grid, inside the 800 px column, same as today |
| Navbar / footer | Stay at 1080 px `max-w-page` — the narrow container only applies inside the two page sections |

## Data model

Add one nullable column to each of the two tables. The column stores the *storage path* (not a full URL) so URLs can be regenerated and cleanup on delete is exact.

```sql
alter table public.websites add column if not exists image_path text;
alter table public.wishlist add column if not exists image_path text;
```

`null` means "use favicon fallback." A non-null value is a path inside the `entry-images` bucket.

Extend the `Website` and `WishlistItem` interfaces in `lib/supabase.ts`:

```ts
export interface Website {
  // …existing fields
  image_path: string | null;
}
export interface WishlistItem {
  // …existing fields
  image_path: string | null;
}
```

No changes to existing columns, indexes, or RLS policies on these tables — the new column is nullable with no default, so the existing insert/update/select paths keep working unchanged.

## Storage bucket

New **public** Supabase Storage bucket `entry-images`. Public (unlike `note-images`) because Websites and Wishlist are publicly readable — anyone visiting the site must be able to render the images.

Path structure:

```
{user.id}/{table}/{row.id}/{uuid}.{ext}
```

`{table}` is literally `"websites"` or `"wishlist"`. The `{row.id}` segment lets us list-and-delete a specific entry's images on row deletion without scanning the whole bucket.

RLS policies (in `supabase-schema.sql`, following the `course-files` pattern):

- `select`: anyone (`bucket_id = 'entry-images'`)
- `insert` / `update` / `delete`: `(storage.foldername(name))[1] = auth.uid()::text` — writes scoped to the caller's own top-level folder, so the anon-key client can't overwrite anyone else's files.

## UX flow — paste to override

1. Owner opens the "Add entry" or "Edit" form (existing disclosure form on each page, no visual restructuring beyond adding a preview slot).
2. The form includes an "Image (optional)" area with two states:
   - **Empty:** shows the favicon preview for the current URL and the hint text *"Paste an image (Ctrl+V) to override."*
   - **Filled:** shows the pasted image preview and a small "Remove image" text button that reverts to the favicon fallback.
3. On `paste`, the form:
   - Reads the first image from `e.clipboardData.items`.
   - For **Add**: generates a client-side UUID (`crypto.randomUUID()`) up front, uses it as the storage path segment, and passes it explicitly as `id` on the DB insert (Postgres's `default gen_random_uuid()` only fires when no id is supplied, so this is safe).
   - For **Edit**: uses the existing row `id` as the path segment. If the row already had an `image_path`, delete the old storage object after the new save succeeds (same best-effort semantics as row-delete).
   - Sets `image_path` in the form state so the save writes the path atomically with the rest of the row.
4. On save, the row's `image_path` is persisted like any other column. If the upload succeeded but the DB write failed, the orphaned image is a leak (acceptable — rare, and small).

**Why paste-only, not upload button:** matches the paste-driven pattern already used by the notes section, keeps the form small, and covers the "I just saw it on a site" case that motivates this whole feature.

## UX flow — delete cleanup

When an entry is deleted:

1. Delete the DB row first.
2. If the row had `image_path`, best-effort delete the storage object (`supabase.storage.from('entry-images').remove([image_path])`).
3. Do not block or reverse the row delete if storage cleanup fails — a leaked image is preferable to a leaked row.

## Component architecture

Two new components in `components/`:

- **`<EntryCard />`** — the visual card, no data logic. Props:
  ```ts
  type EntryCardProps = {
    title: string;
    href: string;
    imagePath: string | null;
    host: string;
    body?: ReactNode;         // description slot for Websites, price slot for Wishlist
    ownerControls?: ReactNode; // edit/delete buttons rendered by parent
  };
  ```
  Responsibilities: resolve `imagePath` → public URL, fall back to favicon, apply the `.stretched-link` pattern, position hover-only owner controls, clamp description to 2 lines.

- **`<CardGrid />`** — the responsive grid wrapper. Applies `.max-w-narrow`, 4/2/1 column responsive rules, and the 10 px gap. Accepts children.

Both pages keep their own state, forms, search/sort, and CRUD handlers. They render a `<CardGrid>` containing `<EntryCard>` children.

The `hostFromUrl` helper is currently duplicated in `app/websites/page.tsx` and `app/wishlist/page.tsx`. Extract it to `lib/url.ts` (or similar) so both pages and `<EntryCard />` can import it — the card needs it to derive both the display host and the favicon domain from `href`.

New utility class in `tailwind.config.ts`:

```ts
maxWidth: {
  page: "1080px",
  narrow: "800px",
}
```

## Loading and empty states

- **Loading:** the grid renders 8 skeleton cards, each a plain `<div>` with the same aspect-ratio image slot and two short skeleton bars below. Uses the existing `.skeleton` class.
- **Empty:** unchanged copy (`"No entries yet."` for Websites, `"Wishlist is empty."` for Wishlist), rendered inside a single grid cell that spans all columns and centers vertically.

## Favicon URL helper

Single helper in `lib/favicon.ts`:

```ts
export const faviconFor = (host: string) =>
  `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
```

Called only when `image_path` is null. Google's endpoint is stable, free, and returns a reasonable-quality favicon for essentially every domain.

## Accessibility

- Whole-card link uses `.stretched-link`; card is a single anchor with a `<span class="sr-only">(opens in a new tab)</span>` appended to the title. No nested interactive elements inside the anchor.
- Owner controls sit outside the stretched-link (`.row-actions` sibling pattern already used elsewhere).
- Favicon and pasted images get `alt=""` because the title text next to them already describes the entry.
- All text tokens continue to clear WCAG AA against the surface color; no new colors introduced.

## Out of scope for this design

- Cropping or resizing pasted images (whatever the user pastes is stored as-is).
- Bulk operations (multi-select, bulk delete).
- Drag-and-drop reordering on these two pages.
- Any change to `/guides`, `/journey`, `/notes`, or the ruled-index style overall.
- Migrating existing entries: on release, every row has `image_path = null` and shows the favicon — no backfill needed.

## Migration

Single idempotent block appended to `supabase-schema.sql`:

```sql
-- =============================================================
-- Cards redesign — image_path columns + entry-images bucket
-- Safe to re-run.
-- =============================================================

alter table public.websites add column if not exists image_path text;
alter table public.wishlist add column if not exists image_path text;

insert into storage.buckets (id, name, public)
values ('entry-images', 'entry-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view entry images"   on storage.objects;
drop policy if exists "Owners can upload entry images" on storage.objects;
drop policy if exists "Owners can update entry images" on storage.objects;
drop policy if exists "Owners can delete entry images" on storage.objects;

create policy "Anyone can view entry images" on storage.objects
  for select using (bucket_id = 'entry-images');
create policy "Owners can upload entry images" on storage.objects
  for insert with check (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owners can update entry images" on storage.objects
  for update using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Owners can delete entry images" on storage.objects
  for delete using (
    bucket_id = 'entry-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

Applied via the Supabase SQL editor once, in line with the project's no-migration-files convention.
