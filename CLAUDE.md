# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm start` — serve the production build
- `npm run lint` — run `next lint`

There is no test runner configured in this project. `npm run lint` uses `.eslintrc.json` (`next/core-web-vitals`) and should stay at zero warnings.

Required env vars (in `.env.local`, not committed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

When the schema changes, the canonical SQL lives in `supabase-schema.sql` and must be re-run in the Supabase SQL Editor — there are no migration files.

## Architecture

BlakeHub is a Next.js 14 App Router site (TypeScript + Tailwind) backed by Supabase. It is a single-author personal knowledge base with a single owner who can write. **Only Home and Journey are public**; Websites, Guides, Wishlist, and Notes are all owner-only reads under RLS. There is no API layer — every page is a `"use client"` component that talks to Supabase directly via the anon key.

### Auth & write model

- `lib/supabase.ts` exports `createClient()` (a `createBrowserClient` from `@supabase/ssr`) plus the row types (`Website`, `Guide`, `CourseNote`, `WishlistItem`). All callers create a fresh client per call.
- `components/AuthProvider.tsx` wraps the tree, exposes `useAuth()` (`user`, `loading`, `signOut`), and listens to `onAuthStateChange`. The owner signs in at `/login` with email/password; there is no signup flow — the user is created manually in the Supabase dashboard.
- Authorization is enforced entirely by Postgres RLS (see `supabase-schema.sql`). `course_notes` (Journey) is public-read; every other table requires `auth.uid() = user_id` for `select`, `insert`, `update`, and `delete`. Private pages gate their fetch on `user` and swap the body for `<SignInRequired>` when logged out. Don't add server-side auth checks — there is no server.

### Data shape

Four tables, all with `user_id` for RLS:
- `websites` — flat list of links with title/description/url
- `guides` — Markdown documents, addressed by `slug` (unique). Created via `/guides`, edited at `/guides/[slug]` with a Write/Preview toggle using `react-markdown` + `remark-gfm`.
- `course_notes` — keyed by `course_code` (unique); paired with the static `data/journey.ts` curriculum to attach notes/description/file to each course
- `wishlist` — title/price/link entries

Plus a `course-files` Storage bucket for PDFs/docs uploaded from the Journey page (path: `{user.id}/{course_code}/{filename}`).

### Page conventions

- `app/layout.tsx` composes `ThemeProvider` (next-themes, `defaultTheme="light"`, class strategy) → `AuthProvider` → `Navbar` + `<main id="main">` + footer, with a skip link ahead of it.
- Pages are `"use client"`, so they can't export `metadata`. Each route carries a sibling `layout.tsx` that calls `pageMetadata()` from `lib/metadata.ts`; `/guides/[slug]` uses `generateMetadata` to resolve the real guide title. Absolute URLs come from `lib/site.ts` — never hardcode the origin.
- Supabase mutations must check the returned `error` before updating local state. Optimistically applying a write that RLS rejected makes a failed delete look successful.
- Pages follow the same shape: `useState` for rows + form state, `useEffect` to `fetchX()` on mount and on `user` change, optimistic local-state updates after Supabase mutations (no refetch). Keep this pattern when adding features — don't introduce SWR/React Query.
- `data/journey.ts` is the static source of truth for the 4-year curriculum (`Year` → `Term` → `Course`). The Journey page joins it with `course_notes` rows in memory.

### Styling

Design direction is **editorial minimalism with industrial precision** — warm neutrals, a ruled index instead of card grids, mono for data and serif for prose.

- **Tokens over utilities.** All colour lives in CSS custom properties at the top of `app/globals.css`: `--bg`, `--surface`, `--rule`, `--rule-strong`, `--ink`, `--ink-2`, `--ink-3`, `--accent`, `--accent-ink`, `--accent-wash`. Light is the default theme; `.dark` re-declares the same names. Because both themes go through one set of names, surfaces do **not** need `dark:` variants — write `text-[var(--ink-2)]`, not `text-slate-600 dark:text-slate-300`.
- **One accent** (vermilion `#B4432A` light / `#E4714F` dark), roughly 2% of surface area. Don't add global colours — the four per-year hues on the Journey page were removed for this reason.
- **No gradients and no shadows.** Depth is hairline rules (`--rule`) and space. Radii are 2px.
- **Two faces, split semantically.** Lora carries headings and body; DM Mono carries anything that is *data* — labels, counts, course codes, prices, dates, slugs. Use `.meta` for uppercase mono labels and `.data` for mono values.
- **Contrast is a constraint, not a preference.** Every text token clears WCAG AA (4.5:1) against `--bg` in both themes; `--ink-3` sits at ~4.9:1 precisely because `.meta` labels are small and informative. If you introduce a new text colour, measure it.
- Component classes live in `@layer components` in `app/globals.css`: `.index` / `.index-row` / `.row-title` (the primary layout device), `.meta`, `.data`, `.display`, `.page-title`, `.lead`, `.btn`, `.btn-quiet`, `.btn-bare`, `.field`, `.field-area`, `.tag`, `.disclosure`, `.alert`, `.skeleton`, `.prose`, `.stretched-link` / `.row-actions`, `.skip-link`. Prefer these over re-deriving utility chains.
- **Animation is CSS only — there is no animation library.** `framer-motion` was removed: its mount-time `initial` state serialized into the prerendered HTML as `style="opacity:0"`, hiding content from non-JS clients and delaying LCP. Accordions and form reveals use `.disclosure` (the `grid-template-rows: 0fr → 1fr` technique); entrances use `.fade-up` / `.page-enter`. Don't reintroduce a motion library without a concrete reason.
- **Whole-card click targets** use `.stretched-link` on a single anchor with `.row-actions` on sibling controls. Never nest a `<button>` inside an `<a>`.

### Path aliases

`@/*` maps to the repo root (see `tsconfig.json`). Imports use `@/lib/...`, `@/components/...`, `@/data/...`.
