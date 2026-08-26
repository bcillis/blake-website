# Websites & Wishlist card redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ruled-index rendering on `/websites` and `/wishlist` with a 4-column card grid inside a narrow 800 px section, where each card shows a pasted image (or favicon fallback) as its primary visual.

**Architecture:** Two shared components (`<CardGrid />`, `<EntryCard />`) plus two small helpers (`lib/url.ts`, `lib/favicon.ts`). Both existing pages keep their `"use client"` state, forms, and Supabase CRUD — only the list rendering and forms are modified. Storage-side: one new public bucket `entry-images` and one nullable `image_path` column per table.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase (Postgres + Storage), no test runner (verification is manual via `npm run lint` and `npm run dev` + browser).

**Design spec:** [`docs/superpowers/specs/2026-08-26-websites-wishlist-cards-design.md`](../specs/2026-08-26-websites-wishlist-cards-design.md)

**Note on testing:** the project has no test runner (per CLAUDE.md), so every task ends with a manual verification step and a commit. `npm run lint` must stay at zero warnings.

---

### Task 1: Schema migration

**Files:**
- Modify: `supabase-schema.sql` (append at end)
- Manual: run the appended SQL in the Supabase SQL Editor

- [ ] **Step 1: Append the migration block to `supabase-schema.sql`**

Append this to the end of the file:

```sql

-- =============================================================
-- Cards redesign — image_path columns + entry-images bucket
-- Adds a nullable image_path to websites/wishlist and a public
-- Storage bucket for pasted images. Safe to re-run.
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

-- Writes are scoped to the uploader's own folder. The app uploads to
-- `{user.id}/{table}/{row.id}/{uuid}.{ext}`, so the first segment must
-- equal the caller's uid.
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

- [ ] **Step 2: Apply the migration in Supabase**

Open the Supabase Dashboard → SQL Editor → paste the appended block → Run. Expected: no errors. This is a manual step per project convention (no migration tooling).

- [ ] **Step 3: Verify in Supabase table/storage UI**

- Table editor → `websites` → confirm `image_path` column (type `text`, nullable) exists.
- Table editor → `wishlist` → confirm same.
- Storage → confirm bucket `entry-images` exists and is marked public.

- [ ] **Step 4: Commit**

```bash
git add supabase-schema.sql
git commit -m "Add image_path columns and entry-images storage bucket"
```

---

### Task 2: Extend TypeScript row types

**Files:**
- Modify: `lib/supabase.ts` (extend `Website` and `WishlistItem` interfaces)

- [ ] **Step 1: Add `image_path: string | null` to both interfaces**

In `lib/supabase.ts`, update:

```ts
export interface Website {
  id: string;
  title: string;
  description: string;
  url: string;
  user_id: string;
  created_at: string;
  image_path: string | null;
}
```

```ts
export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  link: string;
  user_id: string;
  created_at: string;
  image_path: string | null;
}
```

- [ ] **Step 2: Verify with lint + typecheck**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "Add image_path field to Website and WishlistItem types"
```

---

### Task 3: Add `max-w-narrow` utility

**Files:**
- Modify: `tailwind.config.ts:35-38` (`maxWidth` block)

- [ ] **Step 1: Add `narrow` to `maxWidth`**

Update the `maxWidth` block in `tailwind.config.ts`:

```ts
      maxWidth: {
        page: "1080px",
        text: "68ch",
        narrow: "800px",
      },
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "Add max-w-narrow (800px) utility for card sections"
```

---

### Task 4: Extract `hostFromUrl` helper to `lib/url.ts`

**Files:**
- Create: `lib/url.ts`
- Modify: `app/websites/page.tsx` (remove local helper, import from lib)
- Modify: `app/wishlist/page.tsx` (remove local helper, import from lib)

- [ ] **Step 1: Create `lib/url.ts`**

```ts
/** Bare host of a URL, with leading `www.` stripped. Falls back to a best-effort
 *  strip when the URL isn't parseable, so we never throw on user input. */
export const hostFromUrl = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
};
```

- [ ] **Step 2: Import from Websites page and delete the local helper**

In `app/websites/page.tsx`:

- Add `import { hostFromUrl } from "@/lib/url";` under the existing imports.
- Delete lines 7-14 (the local `hostFromUrl` function and its comment).

- [ ] **Step 3: Import from Wishlist page and delete the local helper**

In `app/wishlist/page.tsx`:

- Add `import { hostFromUrl } from "@/lib/url";` under the existing imports.
- Delete lines 10-17 (the local `hostFromUrl` function and its comment). Keep `formatPrice`.

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: zero warnings.
Run: `npm run dev`, open `/websites` and `/wishlist`, confirm the host still shows on each row identically to before.

- [ ] **Step 5: Commit**

```bash
git add lib/url.ts app/websites/page.tsx app/wishlist/page.tsx
git commit -m "Extract hostFromUrl helper to lib/url"
```

---

### Task 5: Add favicon helper

**Files:**
- Create: `lib/favicon.ts`

- [ ] **Step 1: Create `lib/favicon.ts`**

```ts
/** Public favicon URL from Google's endpoint. `sz` is the requested pixel size;
 *  Google returns the closest match. Used as the default image on Websites and
 *  Wishlist cards when the entry has no user-supplied image. */
export const faviconFor = (host: string, sz: number = 128): string =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`;
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add lib/favicon.ts
git commit -m "Add faviconFor helper for card image fallbacks"
```

---

### Task 6: Create `<CardGrid />` component

**Files:**
- Create: `components/CardGrid.tsx`

- [ ] **Step 1: Create `components/CardGrid.tsx`**

```tsx
"use client";

import { ReactNode } from "react";

/** Responsive card grid: 1 col below sm, 2 at sm, 4 at md+. Matches the
 *  4-column density chosen for the Websites and Wishlist redesigns. */
export default function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add components/CardGrid.tsx
git commit -m "Add CardGrid responsive wrapper component"
```

---

### Task 7: Add `.entry-card` styles to globals.css

**Files:**
- Modify: `app/globals.css` (add a new block inside `@layer components`)

- [ ] **Step 1: Find the `@layer components` block**

Open `app/globals.css`. Locate the `@layer components { ... }` block that contains `.index`, `.index-row`, `.meta`, etc.

- [ ] **Step 2: Append the entry-card styles inside that layer**

Add this block inside `@layer components` (just before its closing `}`):

```css
  /* ============================================================
     Entry card — image-forward tile used on /websites and /wishlist.
     Whole card is a link via .stretched-link; owner controls sit as
     .entry-card-actions siblings inside the card, positioned top-right.
     ============================================================ */
  .entry-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--rule);
    overflow: hidden;
    transition: border-color 0.12s;
  }
  .entry-card:hover {
    border-color: var(--rule-strong);
  }
  .entry-card-image {
    aspect-ratio: 4 / 3;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-bottom: 1px solid var(--rule);
  }
  .entry-card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .entry-card-image.is-fallback img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    border-radius: 2px;
  }
  .entry-card-body {
    padding: 10px 12px 12px;
  }
  .entry-card-title {
    font-family: var(--font-lora), ui-serif, Georgia, serif;
    font-size: 0.9375rem;
    line-height: 1.3;
    color: var(--ink);
    letter-spacing: -0.005em;
  }
  .entry-card:hover .entry-card-title {
    color: var(--accent);
  }
  .entry-card-desc {
    font-size: 0.8125rem;
    color: var(--ink-2);
    margin-top: 4px;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .entry-card-price {
    font-family: var(--font-dm-mono), ui-monospace, monospace;
    font-size: 0.8125rem;
    color: var(--ink);
    margin-top: 4px;
    font-variant-numeric: tabular-nums;
  }
  .entry-card-host {
    font-family: var(--font-dm-mono), ui-monospace, monospace;
    font-size: 0.6875rem;
    color: var(--ink-3);
    margin-top: 6px;
  }
  .entry-card-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.12s;
    z-index: 2;
  }
  .entry-card:hover .entry-card-actions,
  .entry-card:focus-within .entry-card-actions {
    opacity: 1;
  }
  .entry-card-actions button {
    font-family: var(--font-dm-mono), ui-monospace, monospace;
    font-size: 0.6875rem;
    padding: 2px 6px;
    border: 1px solid var(--rule-strong);
    background: var(--surface);
    color: var(--ink-2);
    cursor: pointer;
  }
  .entry-card-actions button:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
```

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Add .entry-card component styles"
```

---

### Task 8: Create `<EntryCard />` component

**Files:**
- Create: `components/EntryCard.tsx`

- [ ] **Step 1: Create `components/EntryCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: zero warnings.

- [ ] **Step 3: Commit**

```bash
git add components/EntryCard.tsx
git commit -m "Add EntryCard component with image, title, body slot, and owner controls"
```

---

### Task 9: Rewrite Websites page to use CardGrid + EntryCard

**Files:**
- Modify: `app/websites/page.tsx`

Scope: swap the list rendering only. Forms, state, CRUD handlers, search, add/edit disclosure logic all stay the same. Image paste is added in Task 11.

- [ ] **Step 1: Change the outer container to `max-w-narrow`**

In `app/websites/page.tsx`, change the root `<div>`:

```tsx
<div className="max-w-narrow mx-auto px-6 pb-24">
```

(from `max-w-page`).

- [ ] **Step 2: Import the new components**

Add near the top:

```tsx
import CardGrid from "@/components/CardGrid";
import EntryCard from "@/components/EntryCard";
```

- [ ] **Step 3: Replace the loading skeleton block**

Replace the `loading` branch (the `<div className="index" aria-busy="true">` block with 8 skeleton rows) with:

```tsx
{loading ? (
  <CardGrid>
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="entry-card" aria-busy="true">
        <div className="entry-card-image skeleton" />
        <div className="entry-card-body">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2 mt-2" />
        </div>
      </div>
    ))}
  </CardGrid>
) : filteredWebsites.length === 0 ? (
```

- [ ] **Step 4: Replace the empty-state block**

Replace the current empty state (`<div className="index"><p className="py-16 …">…</p></div>`) with:

```tsx
<div className="py-16 text-center text-[var(--ink-3)]">
  {search ? `No entries match “${search}”.` : "No entries yet."}
</div>
```

- [ ] **Step 5: Replace the list rendering with `<CardGrid>` + `<EntryCard>`**

Replace the `<ul className="index">…</ul>` block (the `filteredWebsites.map(...)` branch) with:

```tsx
) : (
  <CardGrid>
    {filteredWebsites.map((website) =>
      editingId === website.id ? (
        <form
          key={website.id}
          onSubmit={handleEdit}
          className="border border-[var(--rule-strong)] bg-[var(--surface)] p-3 space-y-2 col-span-full"
        >
          <p className="meta">Editing</p>
          <input
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="field"
            aria-label="Title"
            required
          />
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="field-area min-h-[5rem]"
            aria-label="Description"
            rows={2}
            required
          />
          <input
            value={editData.url}
            onChange={(e) => setEditData({ ...editData, url: e.target.value })}
            className="field"
            aria-label="URL"
            type="url"
            required
          />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn">
              Save
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="btn-quiet">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <EntryCard
          key={website.id}
          title={website.title}
          href={website.url}
          imagePath={website.image_path}
          body={<p className="entry-card-desc">{website.description}</p>}
          ownerControls={
            user ? (
              <>
                <button onClick={() => startEdit(website)}>
                  edit<span className="sr-only"> {website.title}</span>
                </button>
                <button onClick={() => handleDelete(website.id)}>
                  del<span className="sr-only"> {website.title}</span>
                </button>
              </>
            ) : undefined
          }
        />
      )
    )}
  </CardGrid>
)}
```

- [ ] **Step 6: Verify in the browser**

Run: `npm run dev`
Open http://localhost:3000/websites. Confirm:
- Cards render in a 4-col grid on desktop (narrows to 2 then 1 as you shrink the window).
- Whole card is clickable and opens the URL in a new tab.
- Signed-in: hovering a card reveals `edit` / `del` in the top-right; both work.
- Signed-out: no owner controls visible.
- All entries show favicons (since `image_path` is null for every existing row).
- The page section is narrower than the navbar above it (800 px vs 1080 px).

Run: `npm run lint` → zero warnings.

- [ ] **Step 7: Commit**

```bash
git add app/websites/page.tsx
git commit -m "Rewrite Websites list as CardGrid of EntryCard components"
```

---

### Task 10: Rewrite Wishlist page to use CardGrid + EntryCard

**Files:**
- Modify: `app/wishlist/page.tsx`

Same scope as Task 9. Preserve the search + sort dropdown + running total.

- [ ] **Step 1: Change outer container to `max-w-narrow`**

Change the root `<div>` to `max-w-narrow mx-auto px-6 pb-24`.

- [ ] **Step 2: Import the new components**

```tsx
import CardGrid from "@/components/CardGrid";
import EntryCard from "@/components/EntryCard";
```

- [ ] **Step 3: Replace loading skeleton block**

Replace the loading branch (currently 5 skeleton rows) with 8 grid-shaped skeletons:

```tsx
{loading ? (
  <CardGrid>
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="entry-card" aria-busy="true">
        <div className="entry-card-image skeleton" />
        <div className="entry-card-body">
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-1/2 mt-2" />
        </div>
      </div>
    ))}
  </CardGrid>
) : sortedItems.length === 0 ? (
```

- [ ] **Step 4: Replace empty state block**

```tsx
<div className="py-16 text-center text-[var(--ink-3)]">
  {search ? `Nothing matches “${search}”.` : "Wishlist is empty."}
</div>
```

- [ ] **Step 5: Replace list + preserve totals row**

Replace the `<ul className="index">…</ul>` and its wrapping `<>…</>` with:

```tsx
) : (
  <>
    <CardGrid>
      {sortedItems.map((item) =>
        editingId === item.id ? (
          <form
            key={item.id}
            onSubmit={handleEdit}
            className="border border-[var(--rule-strong)] bg-[var(--surface)] p-3 space-y-2 col-span-full"
          >
            <p className="meta">Editing</p>
            <input
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="field"
              aria-label="Title"
              required
            />
            <input
              value={editData.price}
              onChange={(e) => setEditData({ ...editData, price: e.target.value })}
              className="field"
              aria-label="Price in CAD"
              type="number"
              step="0.01"
              min="0"
              required
            />
            <input
              value={editData.link}
              onChange={(e) => setEditData({ ...editData, link: e.target.value })}
              className="field"
              aria-label="Link"
              type="url"
              required
            />
            {formError && (
              <div role="alert" className="alert">
                {formError}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setEditingId(null);
                }}
                className="btn-quiet"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <EntryCard
            key={item.id}
            title={item.title}
            href={item.link}
            imagePath={item.image_path}
            body={<p className="entry-card-price">{formatPrice(Number(item.price))}</p>}
            ownerControls={
              user ? (
                <>
                  <button onClick={() => startEdit(item)}>
                    edit<span className="sr-only"> {item.title}</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)}>
                    del<span className="sr-only"> {item.title}</span>
                  </button>
                </>
              ) : undefined
            }
          />
        )
      )}
    </CardGrid>

    {/* Ledger total */}
    <div className="flex items-baseline justify-between gap-4 pt-4 mt-6 border-t border-[var(--rule-strong)]">
      <span className="meta">
        {String(filteredItems.length).padStart(2, "0")}
        {search ? ` of ${items.length}` : ""} items
      </span>
      <span className="font-mono text-base tabular-nums text-[var(--ink)]">
        {formatPrice(totalPrice)}
      </span>
    </div>
  </>
)}
```

- [ ] **Step 6: Verify**

Run: `npm run dev`, open http://localhost:3000/wishlist. Confirm:
- Cards render in 4-col grid, narrow container.
- Price appears in mono under the title on each card.
- Sort dropdown still works (date / alpha / price).
- Search still works.
- Total row still appears under the grid, inside the narrow column.
- Signed-in: edit/del work; signed-out: no controls.

Run: `npm run lint` → zero warnings.

- [ ] **Step 7: Commit**

```bash
git add app/wishlist/page.tsx
git commit -m "Rewrite Wishlist list as CardGrid of EntryCard components"
```

---

### Task 11: Add paste-to-image on Websites forms

**Files:**
- Modify: `app/websites/page.tsx`

Adds an image preview area to both the Add form and the Edit form, with `onPaste` handling that uploads to `entry-images` and stores the resulting path.

- [ ] **Step 1: Extend form state to carry `imagePath` and add upload/replace helpers**

At the top of the component, extend `formData` and `editData`:

```tsx
const [formData, setFormData] = useState({
  title: "",
  description: "",
  url: "",
  imagePath: null as string | null,
});
```

```tsx
const [editData, setEditData] = useState({
  title: "",
  description: "",
  url: "",
  imagePath: null as string | null,
});
```

Also add near the other state:

```tsx
const [addRowId, setAddRowId] = useState<string>(() => crypto.randomUUID());
```

Update `startEdit` to include `imagePath`:

```tsx
const startEdit = (w: Website) => {
  setEditingId(w.id);
  setEditData({
    title: w.title,
    description: w.description,
    url: w.url,
    imagePath: w.image_path,
  });
};
```

- [ ] **Step 2: Add a shared upload helper inside the component**

```tsx
const uploadPastedImage = async (
  file: File,
  rowId: string
): Promise<string | null> => {
  if (!user) return null;
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "png").toLowerCase();
  const path = `${user.id}/websites/${rowId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("entry-images")
    .upload(path, file, { upsert: false });
  if (error) {
    setActionError(`Couldn't upload image: ${error.message}`);
    return null;
  }
  return path;
};

const removeStoredImage = async (path: string) => {
  const supabase = createClient();
  await supabase.storage.from("entry-images").remove([path]);
};

const extractImageFromPaste = (e: React.ClipboardEvent): File | null => {
  for (const item of Array.from(e.clipboardData.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
};
```

- [ ] **Step 3: Wire paste into the Add form**

On the Add `<form>` add `onPaste`:

```tsx
<form
  onSubmit={handleAdd}
  onPaste={async (e) => {
    const file = extractImageFromPaste(e);
    if (!file) return;
    e.preventDefault();
    const path = await uploadPastedImage(file, addRowId);
    if (path) setFormData((f) => ({ ...f, imagePath: path }));
  }}
  className="mb-6 border border-[var(--rule-strong)] bg-[var(--surface)] p-5 space-y-3"
>
```

Add an image preview slot near the top of the form body (right under the `<p className="meta">New entry</p>` line):

```tsx
<div className="flex items-center gap-3 border border-dashed border-[var(--rule)] p-3">
  {formData.imagePath ? (
    <>
      <img
        src={createClient().storage.from("entry-images").getPublicUrl(formData.imagePath).data.publicUrl}
        alt=""
        className="w-16 h-12 object-cover border border-[var(--rule)]"
      />
      <button
        type="button"
        onClick={async () => {
          if (formData.imagePath) await removeStoredImage(formData.imagePath);
          setFormData((f) => ({ ...f, imagePath: null }));
        }}
        className="btn-bare"
      >
        Remove image
      </button>
    </>
  ) : (
    <p className="text-xs text-[var(--ink-3)]">
      Optional — paste an image (Ctrl+V) to replace the favicon.
    </p>
  )}
</div>
```

- [ ] **Step 4: Pass `image_path` + explicit `id` on Add insert; regenerate `addRowId` after success**

Update `handleAdd`:

```tsx
const handleAdd = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  setSubmitting(true);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("websites")
    .insert([
      {
        id: addRowId,
        title: formData.title,
        description: formData.description,
        url: formData.url,
        image_path: formData.imagePath,
        user_id: user.id,
      },
    ])
    .select()
    .single();
  if (error) {
    setActionError(`Couldn't add: ${error.message}`);
    setSubmitting(false);
    return;
  }
  if (data) {
    setActionError(null);
    setWebsites([data, ...websites]);
    setFormData({ title: "", description: "", url: "", imagePath: null });
    setAddRowId(crypto.randomUUID());
    setShowForm(false);
  }
  setSubmitting(false);
};
```

Also: when the user closes the form via Cancel with a pasted image still in state, clean up the orphan. Update the Cancel button on the Add form:

```tsx
<button
  type="button"
  onClick={async () => {
    if (formData.imagePath) await removeStoredImage(formData.imagePath);
    setFormData({ title: "", description: "", url: "", imagePath: null });
    setAddRowId(crypto.randomUUID());
    setShowForm(false);
  }}
  className="btn-quiet"
>
  Cancel
</button>
```

- [ ] **Step 5: Wire paste + preview into the Edit form (grid-embedded)**

In the edit-form branch inside `<CardGrid>` (from Task 9 Step 5), add `onPaste` on the `<form>`:

```tsx
onPaste={async (e) => {
  const file = extractImageFromPaste(e);
  if (!file) return;
  e.preventDefault();
  const path = await uploadPastedImage(file, website.id);
  if (path) setEditData((d) => ({ ...d, imagePath: path }));
}}
```

Add the same preview slot near the top of the form body (right under `<p className="meta">Editing</p>`):

```tsx
<div className="flex items-center gap-3 border border-dashed border-[var(--rule)] p-3">
  {editData.imagePath ? (
    <>
      <img
        src={createClient().storage.from("entry-images").getPublicUrl(editData.imagePath).data.publicUrl}
        alt=""
        className="w-16 h-12 object-cover border border-[var(--rule)]"
      />
      <button
        type="button"
        onClick={async () => {
          if (editData.imagePath) await removeStoredImage(editData.imagePath);
          setEditData((d) => ({ ...d, imagePath: null }));
        }}
        className="btn-bare"
      >
        Remove image
      </button>
    </>
  ) : (
    <p className="text-xs text-[var(--ink-3)]">
      Optional — paste an image (Ctrl+V) to replace the favicon.
    </p>
  )}
</div>
```

- [ ] **Step 6: Persist `image_path` in `handleEdit` and delete old image on replace**

Update `handleEdit`:

```tsx
const handleEdit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingId) return;
  const original = websites.find((w) => w.id === editingId);
  const previousImage = original?.image_path ?? null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("websites")
    .update({
      title: editData.title,
      description: editData.description,
      url: editData.url,
      image_path: editData.imagePath,
    })
    .eq("id", editingId)
    .select()
    .single();
  if (error) {
    setActionError(`Couldn't save: ${error.message}`);
    return;
  }
  if (data) {
    setActionError(null);
    setWebsites(websites.map((w) => (w.id === editingId ? data : w)));
    setEditingId(null);

    // Best-effort cleanup: if the image changed (including cleared),
    // delete the old storage object. Don't block or roll back on failure.
    if (previousImage && previousImage !== data.image_path) {
      await removeStoredImage(previousImage);
    }
  }
};
```

- [ ] **Step 7: Verify**

Run: `npm run dev`, sign in, go to `/websites`.
- Click Add, paste a small image from your clipboard, confirm preview appears. Fill in fields, submit — new card should show the pasted image (not the favicon).
- Click Add again but Cancel this time after pasting — reopen and confirm state is clean.
- Hover an existing entry, click edit, paste a new image, save — card should show the new image.
- Edit again, click "Remove image", save — card falls back to favicon.

Run: `npm run lint` → zero warnings.

- [ ] **Step 8: Commit**

```bash
git add app/websites/page.tsx
git commit -m "Wire clipboard paste to entry-images bucket for Websites forms"
```

---

### Task 12: Add paste-to-image on Wishlist forms

**Files:**
- Modify: `app/wishlist/page.tsx`

Same shape as Task 11, adapted for Wishlist's form fields. Table segment in the storage path is `"wishlist"`.

- [ ] **Step 1: Extend form state**

```tsx
const [formData, setFormData] = useState({
  title: "",
  price: "",
  link: "",
  imagePath: null as string | null,
});
```

```tsx
const [editData, setEditData] = useState({
  title: "",
  price: "",
  link: "",
  imagePath: null as string | null,
});
```

```tsx
const [addRowId, setAddRowId] = useState<string>(() => crypto.randomUUID());
```

Update `startEdit`:

```tsx
const startEdit = (item: WishlistItem) => {
  setEditingId(item.id);
  setEditData({
    title: item.title,
    price: String(item.price),
    link: item.link,
    imagePath: item.image_path,
  });
};
```

- [ ] **Step 2: Add upload/remove/extract helpers**

Same three helpers as Task 11 Step 2, but the storage path uses `"wishlist"`:

```tsx
const uploadPastedImage = async (
  file: File,
  rowId: string
): Promise<string | null> => {
  if (!user) return null;
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || file.type.split("/")[1] || "png").toLowerCase();
  const path = `${user.id}/wishlist/${rowId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("entry-images")
    .upload(path, file, { upsert: false });
  if (error) {
    setFormError(`Couldn't upload image: ${error.message}`);
    return null;
  }
  return path;
};

const removeStoredImage = async (path: string) => {
  const supabase = createClient();
  await supabase.storage.from("entry-images").remove([path]);
};

const extractImageFromPaste = (e: React.ClipboardEvent): File | null => {
  for (const item of Array.from(e.clipboardData.items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
};
```

- [ ] **Step 3: Wire the Add form (onPaste + preview slot)**

Add `onPaste` to the Add `<form>`:

```tsx
onPaste={async (e) => {
  const file = extractImageFromPaste(e);
  if (!file) return;
  e.preventDefault();
  const path = await uploadPastedImage(file, addRowId);
  if (path) setFormData((f) => ({ ...f, imagePath: path }));
}}
```

Insert the same preview slot (adapted names) under `<p className="meta">New item</p>`:

```tsx
<div className="flex items-center gap-3 border border-dashed border-[var(--rule)] p-3">
  {formData.imagePath ? (
    <>
      <img
        src={createClient().storage.from("entry-images").getPublicUrl(formData.imagePath).data.publicUrl}
        alt=""
        className="w-16 h-12 object-cover border border-[var(--rule)]"
      />
      <button
        type="button"
        onClick={async () => {
          if (formData.imagePath) await removeStoredImage(formData.imagePath);
          setFormData((f) => ({ ...f, imagePath: null }));
        }}
        className="btn-bare"
      >
        Remove image
      </button>
    </>
  ) : (
    <p className="text-xs text-[var(--ink-3)]">
      Optional — paste an image (Ctrl+V) to replace the favicon.
    </p>
  )}
</div>
```

- [ ] **Step 4: Pass `id` and `image_path` on Add insert; regenerate rowId on success/cancel**

Update `handleAdd`:

```tsx
const handleAdd = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  const priceNum = parseFloat(formData.price);
  if (Number.isNaN(priceNum) || priceNum < 0) {
    setFormError("Please enter a valid price.");
    return;
  }
  setFormError(null);
  setSubmitting(true);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wishlist")
    .insert([
      {
        id: addRowId,
        title: formData.title,
        price: priceNum,
        link: formData.link,
        image_path: formData.imagePath,
        user_id: user.id,
      },
    ])
    .select()
    .single();
  if (error) {
    setFormError(error.message);
  } else if (data) {
    setItems([data, ...items]);
    setFormData({ title: "", price: "", link: "", imagePath: null });
    setAddRowId(crypto.randomUUID());
    setShowForm(false);
  }
  setSubmitting(false);
};
```

Update the Cancel button on the Add form to clean up orphaned images:

```tsx
<button
  type="button"
  onClick={async () => {
    if (formData.imagePath) await removeStoredImage(formData.imagePath);
    setFormData({ title: "", price: "", link: "", imagePath: null });
    setAddRowId(crypto.randomUUID());
    setFormError(null);
    setShowForm(false);
  }}
  className="btn-quiet"
>
  Cancel
</button>
```

- [ ] **Step 5: Wire paste + preview into the grid-embedded Edit form**

Add `onPaste` to the edit `<form>`:

```tsx
onPaste={async (e) => {
  const file = extractImageFromPaste(e);
  if (!file) return;
  e.preventDefault();
  const path = await uploadPastedImage(file, item.id);
  if (path) setEditData((d) => ({ ...d, imagePath: path }));
}}
```

Insert the same preview slot under `<p className="meta">Editing</p>` (same JSX as Add's preview but reading/writing `editData`).

- [ ] **Step 6: Persist `image_path` in `handleEdit` and delete old on replace**

```tsx
const handleEdit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingId) return;
  const priceNum = parseFloat(editData.price);
  if (Number.isNaN(priceNum) || priceNum < 0) {
    setFormError("Please enter a valid price.");
    return;
  }
  setFormError(null);
  const original = items.find((i) => i.id === editingId);
  const previousImage = original?.image_path ?? null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("wishlist")
    .update({
      title: editData.title,
      price: priceNum,
      link: editData.link,
      image_path: editData.imagePath,
    })
    .eq("id", editingId)
    .select()
    .single();
  if (error) {
    setFormError(error.message);
  } else if (data) {
    setItems(items.map((i) => (i.id === editingId ? data : i)));
    setEditingId(null);
    if (previousImage && previousImage !== data.image_path) {
      await removeStoredImage(previousImage);
    }
  }
};
```

- [ ] **Step 7: Verify**

Run: `npm run dev`, sign in, go to `/wishlist`.
- Add item with a pasted image → card shows the image.
- Add + Cancel (with pasted image) → reopen, form is clean.
- Edit item, paste new image, save → card updates.
- Edit, Remove image, save → card falls back to favicon.

Run: `npm run lint` → zero warnings.

- [ ] **Step 8: Commit**

```bash
git add app/wishlist/page.tsx
git commit -m "Wire clipboard paste to entry-images bucket for Wishlist forms"
```

---

### Task 13: Delete stored image on row delete (both pages)

**Files:**
- Modify: `app/websites/page.tsx` (`handleDelete`)
- Modify: `app/wishlist/page.tsx` (`handleDelete`)

- [ ] **Step 1: Update `handleDelete` in Websites**

Update to capture the row's `image_path` before deletion and best-effort clean up storage after:

```tsx
const handleDelete = async (id: string) => {
  if (!confirm("Delete this website?")) return;
  const target = websites.find((w) => w.id === id);
  const supabase = createClient();
  const { error } = await supabase.from("websites").delete().eq("id", id);
  if (error) {
    setActionError(`Couldn't delete: ${error.message}`);
    return;
  }
  setActionError(null);
  setWebsites(websites.filter((w) => w.id !== id));
  if (target?.image_path) await removeStoredImage(target.image_path);
};
```

- [ ] **Step 2: Update `handleDelete` in Wishlist**

```tsx
const handleDelete = async (id: string) => {
  if (!confirm("Delete this wishlist item?")) return;
  const target = items.find((i) => i.id === id);
  const supabase = createClient();
  const { error } = await supabase.from("wishlist").delete().eq("id", id);
  if (error) {
    setFormError(`Couldn't delete: ${error.message}`);
    return;
  }
  setFormError(null);
  setItems(items.filter((i) => i.id !== id));
  if (target?.image_path) await removeStoredImage(target.image_path);
};
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, sign in.
- Delete an entry that has a pasted image. Then in Supabase Dashboard → Storage → `entry-images`, confirm the file at the entry's path is gone.
- Delete an entry with no image (favicon-only). Confirm the row is gone and no storage errors appear in the console.

Run: `npm run lint` → zero warnings.

- [ ] **Step 4: Commit**

```bash
git add app/websites/page.tsx app/wishlist/page.tsx
git commit -m "Delete stored image on row delete for Websites and Wishlist"
```

---

### Task 14: Final verification pass

**Files:** none

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: zero warnings and zero errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no type errors, no missing-dependency warnings.

- [ ] **Step 3: Browser sweep**

Run: `npm run dev`. In the browser, walk through:

Signed out at `/websites`:
- Grid renders, favicons visible, whole cards click through to URLs.
- No edit/del controls anywhere.
- Search filters correctly.
- Resize window: 4 cols → 2 cols (at sm) → 1 col (below sm).
- Dark mode toggle: card borders, image tile background, and text all remain WCAG-legible.

Signed in at `/websites`:
- Add entry (with paste) → shows image.
- Add entry (without paste) → shows favicon.
- Edit entry (add image / replace image / remove image).
- Delete entry with image → row gone, storage object gone.
- Delete entry without image → row gone, no errors.

Repeat the signed-in flow at `/wishlist`, plus:
- Sort dropdown still works across all three modes (date, alpha, price).
- Running total updates correctly when items are added/removed.

- [ ] **Step 4: No commit — this is a verification step only.**

If issues found, fix inline and commit per the affected task's granularity. When all checks pass, this plan is complete.
