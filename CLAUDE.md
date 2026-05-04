# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm start` — serve the production build
- `npm run lint` — run `next lint`

There is no test runner configured in this project.

Required env vars (in `.env.local`, not committed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

When the schema changes, the canonical SQL lives in `supabase-schema.sql` and must be re-run in the Supabase SQL Editor — there are no migration files.

## Architecture

BlakeHub is a Next.js 14 App Router site (TypeScript + Tailwind) backed by Supabase. It is a single-author personal knowledge base with public read access and a single owner who can write. There is no API layer — every page is a `"use client"` component that talks to Supabase directly via the anon key.

### Auth & write model

- `lib/supabase.ts` exports `createClient()` (a `createBrowserClient` from `@supabase/ssr`) plus the row types (`Website`, `Guide`, `CourseNote`, `WishlistItem`). All callers create a fresh client per call.
- `components/AuthProvider.tsx` wraps the tree, exposes `useAuth()` (`user`, `loading`, `signOut`), and listens to `onAuthStateChange`. The owner signs in at `/login` with email/password; there is no signup flow — the user is created manually in the Supabase dashboard.
- Authorization is enforced entirely by Postgres RLS (see `supabase-schema.sql`): everyone can `select`, but `insert`/`update`/`delete` require `auth.uid() = user_id`. Pages mirror this in the UI by gating buttons on `user`. Don't add server-side auth checks — there is no server.

### Data shape

Four tables, all with `user_id` for RLS:
- `websites` — flat list of links with title/description/url
- `guides` — Markdown documents, addressed by `slug` (unique). Created via `/guides`, edited at `/guides/[slug]` with a Write/Preview toggle using `react-markdown` + `remark-gfm`.
- `course_notes` — keyed by `course_code` (unique); paired with the static `data/journey.ts` curriculum to attach notes/description/file to each course
- `wishlist` — title/price/link entries

Plus a `course-files` Storage bucket for PDFs/docs uploaded from the Journey page (path: `{user.id}/{course_code}/{filename}`).

### Page conventions

- `app/layout.tsx` composes `ThemeProvider` (next-themes, `defaultTheme="dark"`, class strategy) → `AuthProvider` → `Navbar` + `<main>` + footer.
- Pages follow the same shape: `useState` for rows + form state, `useEffect` to `fetchX()` on mount and on `user` change, optimistic local-state updates after Supabase mutations (no refetch). Keep this pattern when adding features — don't introduce SWR/React Query.
- `data/journey.ts` is the static source of truth for the 4-year curriculum (`Year` → `Term` → `Course`). The Journey page joins it with `course_notes` rows in memory.

### Styling

Design direction is intentionally **clean, not themed** — a previous P3-color experiment was reverted. Stick to the existing system:
- Single accent color (`accent` palette in `tailwind.config.ts` = indigo). Don't introduce new global colors.
- Reusable component classes are defined as `@layer components` in `app/globals.css`: `.card`, `.card-interactive`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input-field`, `.textarea-field`, `.section-title`, `.tag`, and `.prose-content *` for rendered Markdown. Prefer these over re-deriving Tailwind utility chains.
- Dark mode is `class`-based; every surface needs `dark:` variants.

### Path aliases

`@/*` maps to the repo root (see `tsconfig.json`). Imports use `@/lib/...`, `@/components/...`, `@/data/...`.
