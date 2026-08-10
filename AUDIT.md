# BlakeHub — Phase 1 Audit

**Date:** 2026-08-09
**Branch:** `claude/ui-overhaul-audit-235144`
**Scope:** Audit only. No application code was changed.

## Method

- Read every source file in `app/`, `components/`, `lib/`, `data/`, plus config and `supabase-schema.sql`.
- Ran `npm run build` (Next 14.2.21) and inspected the prerendered HTML in `.next/server/app/*.html` and the emitted client chunks in `.next/static/`.
- Ran `npm run dev` and loaded `/`, `/websites`, `/journey`, `/guides`, `/guides/a`, `/wishlist`, `/login`, and a bogus URL in a real browser, capturing console output and network requests on each.
- Queried the live Supabase project `bcillis-website` (`lamefzddvcefmcinybxn`) for RLS state and security advisors.
- Ran `npm audit --omit=dev`.

### One correction to the brief

The brief describes this as **React + Vite**. It is actually a **Next.js 14 App Router** app (TypeScript + Tailwind), which changes several answers materially — most importantly item A1. There is no Vite anywhere in the project, so the "Vite + React" tab-title check is N/A by definition. Everything below is audited against what is actually in the repo.

Two files were added to the worktree to make the audit runnable; neither is application code and neither is committed: `.env.local` (copied from the main checkout, gitignored) and `.claude/launch.json` (dev-server config).

---

## A. Head & metadata

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| A1 | Rendered HTML empty on view-source? | **PARTIAL FAIL** | Not empty — Next prerenders 6 of 7 routes as static HTML, and `curl http://localhost:3000/` returns the full nav, hero copy and section cards as real markup. **But** `app/template.tsx:8-12` wraps every page in a Framer Motion div whose initial state is serialized into that HTML: `.next/server/app/index.html` contains 12 × `style="opacity:0;transform:translateY(12px)"`, including the outermost wrapper. With JS disabled the entire page is present but invisible. Separately, all *database* content (websites, guides, wishlist, course notes) is fetched client-side in `useEffect`, so none of it is in the HTML. | Drop the mount-time `initial={{opacity:0}}` from `app/template.tsx` (or gate it behind a CSS `@media (scripting: enabled)` / hydration flag), and move data fetching to server components so rows are in the HTML. |
| A2 | Unique `<title>` per route? | **FAIL** | One static `metadata` export at `app/layout.tsx:23-26`; every route returned `BlakeHub — Software Engineering Knowledge Base` in the browser, including `/websites`, `/guides`, `/wishlist` and `/journey`. | Export `metadata` from each `page.tsx`, and `generateMetadata` for `/guides/[slug]` — needs the page split into a server wrapper since client components can't export metadata. |
| A3 | Tab still says "Vite + React"? | **N/A** | Not a Vite project; title is a real custom string (`app/layout.tsx:24`). | — |
| A4 | Meta description present and per-page? | **PARTIAL FAIL** | Present but global only — `app/layout.tsx:25`, confirmed in the built `<head>`. No per-route description. | Same fix as A2. |
| A5 | `og:image` + `og:title` + `og:description`? | **FAIL** | None. Built `<head>` of `.next/server/app/index.html` contains only `charSet`, `viewport`, stylesheet/script preloads, `<title>` and `description`. | Add `openGraph` and `twitter` blocks to the root `metadata`, plus an `app/opengraph-image.tsx` or a static OG image. |
| A6 | Structured data (JSON-LD Person / WebSite)? | **FAIL** | `grep -rn "ld+json" app/ components/` → no matches. | Add a `<script type="application/ld+json">` with `Person` + `WebSite` in `app/layout.tsx`. |
| A7 | Canonical tag? | **FAIL** | No `rel="canonical"` in any built HTML. | Set `metadataBase` + `alternates.canonical` in root `metadata`, and per-route canonicals alongside A2. |
| A8 | `<html lang="en">`? | **PASS** | `app/layout.tsx:30` — `<html lang="en" suppressHydrationWarning …>`. | — |
| A9 | Real favicon, incl. apple-touch-icon? | **FAIL** | No `public/` directory exists at all. `GET /favicon.ico` → 404, `GET /apple-touch-icon.png` → 404. No `<link rel="icon">` in the built `<head>`. | Add `app/icon.svg` (or `.png`) and `app/apple-icon.png`; Next wires the `<link>` tags automatically. The navbar "B" mark at `components/Navbar.tsx:46-55` is a ready-made source. |
| A10 | Exactly one `<h1>` per page? | **PASS** | One `<h1>` in each built page: `index.html`, `guides.html`, `journey.html`, `websites.html`, `wishlist.html`, `login.html`, `_not-found.html`. `/guides/[slug]` renders exactly one in both the loaded state (`app/guides/[slug]/page.tsx:142`) and the not-found state (line 74). | — |

---

## B. Site-level files & routes

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| B1 | Custom 404? | **FAIL** | No `app/not-found.tsx`. Loading `/this-page-does-not-exist` renders Next's stock page — title `404: This page could not be found.`, body `404 / This page could not be found.`, and `.next/server/app/_not-found.html` shows the built-in `class="next-error-h1"` inline-styled heading. | Add `app/not-found.tsx` using `.card` / `.btn-primary` with links back to the four sections. |
| B2 | `robots.txt` present, blocks AI crawlers? | **FAIL** | `GET /robots.txt` → 404. Nothing to block anything. | Add `app/robots.ts`. Decide deliberately on AI crawlers (`GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `PerplexityBot`) — for a public portfolio you may actively *want* them. |
| B3 | `sitemap.xml`? | **FAIL** | `GET /sitemap.xml` → 404. | Add `app/sitemap.ts` listing the 5 static routes plus one entry per guide slug from Supabase. |
| B4 | `llms.txt`? | **FAIL** | `GET /llms.txt` → 404. | Add `app/llms.txt/route.ts` (or a static `public/llms.txt`) summarising who you are and what each section holds. |
| B5 | Privacy policy page? | **FAIL** | `GET /privacy` → 404; no such route in `app/`. Lower priority than it looks: there is no analytics, no third-party tracking, and no public signup — the only account is yours. | Add a short `/privacy` stating the site sets a Supabase auth cookie for the owner only and runs no analytics. |
| B6 | Terms & conditions page? | **FAIL** | `GET /terms` → 404. | Optional for a non-commercial personal site. Add a brief `/terms` if you want the link in the footer. |
| B7 | One long page, or real routed pages? | **PASS** | Seven real routes in the build manifest: `/`, `/websites`, `/journey`, `/guides`, `/guides/[slug]`, `/wishlist`, `/login`, each its own file under `app/`. | — |

---

## C. Content integrity

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| C1 | Fake reviews / testimonials | **PASS** | None anywhere in the codebase. | — |
| C2 | Fake visitor counters / metrics / client counts | **PASS** | Every number shown is computed from live data: `01 GUIDES` from `guides.length` (`app/guides/page.tsx:89`), `30 ENTRIES` from `filteredWebsites.length` (`app/websites/page.tsx:123`), `07 ITEMS · $1,340.00` summed from real rows (`app/wishlist/page.tsx:179`). | — |
| C3 | AI-generated / generic stock imagery | **N/A** | Zero images in the project — `grep -rn "<img\|next/image" app/ components/` returns nothing, and no `public/` directory exists. | — |
| C4 | Vague hero copy | **PASS** | `app/page.tsx:59-62` names the specific thing: "I'm a Software Engineering graduate from Western University… four years of studying and building software." Nothing in the "building the future of…" register. | — |
| C5 | "Made with \<tool\>" badge | **PARTIAL** | No tool badge. But the footer at `app/layout.tsx:42` reads `v1 · made with care` — filler that occupies badge position and says nothing. | Replace with something real (last-updated date, a link to the repo) or delete it. |
| C6 | Placeholder-grade content live in production | **FAIL** | The single published guide is titled **"A"**, slug `a`, and its body is the literal scaffold string from `app/guides/page.tsx:48`: *"Start writing your guide here…"*. It is publicly visible at `/guides` and `/guides/a`, and it is the only thing the Guides section contains. | Write the guide or delete the row. Do not ship the Guides section with a scaffold row as its sole content. |
| C7 | Copy that reads as unedited LLM output | **PARTIAL FAIL** | Listed in full below. | See below. |

### C7 — every instance, verbatim (not rewritten, per instructions)

1. `app/page.tsx:9-11` — "A curated collection of powerful tools, resources, and websites every developer should know about." — "curated collection of powerful" is the signature phrasing; "every developer should know about" is an unearned universal claim.
2. `app/websites/page.tsx:107-109` — "A growing collection of powerful tools and resources for developers — handpicked, with a sentence on why each one earns its spot." — **the copy contradicts the data.** Live descriptions include `More Components`, `React components`, `Components For Websites`, `UI Library` — two-word labels, not "a sentence on why each one earns its spot."
3. `app/page.tsx:33-35` and `app/wishlist/page.tsx:151-153` — "Gear, gadgets, and the occasional dream purchase." appears **verbatim in both places**.
4. `app/page.tsx:17-19` ("every course, every topic") and `app/journey/page.tsx:174` ("Every course, every topic, organized as a timeline.") — same construction duplicated across home card and page header.
5. `app/page.tsx:25-27` — "Written for future me." then `app/guides/page.tsx:76` — "Guides for future me." — the same joke twice, one click apart.
6. `app/layout.tsx:42` — "v1 · made with care" — see C5.
7. `app/page.tsx:67` — "Built for me. Kept public for anyone who finds it useful." — this one reads as genuinely yours; noted only because it sits in the same block.

### C8 — data-quality issues found in the live content (not code)

- **Duplicate row:** `ReactBits` appears twice on `/websites`, described once as "React components" and once as "React Components".
- **Thin descriptions:** at least 7 of 30 website entries are 1–3 word labels rather than descriptions.
- **Likely typo:** `Anime Javascript` — presumably Anime.js.

---

## D. Design tells

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| D1 | Gradient-heavy sections | **PARTIAL FAIL** | Three gradient uses. Two are restrained and on-system: the body radial glow (`app/globals.css:23-27`) and the navbar logo tile (`components/Navbar.tsx:49-51`), both accent-derived. The third breaks the system: `app/journey/page.tsx:10-15` introduces **four non-accent hues** — `sky-500`, `violet-500`, `emerald-500`, `amber-500` — as year badges. `CLAUDE.md` explicitly says "Single accent color… Don't introduce new global colors." Purple is in there. | Re-derive the four year badges from `--accent` at varying opacity/lightness, or use a neutral border + numeral. |
| D2 | Hero text that cycles/animates color | **PASS** | Hero accent is a static `text-[var(--accent)] italic` span (`app/page.tsx:53`). No cycling, no gradient text, no typewriter. | — |
| D3 | Scroll-triggered animations applied indiscriminately | **PARTIAL FAIL** | Technically these are *mount*-triggered, not scroll-triggered — `FadeUp` uses `initial`/`animate`, not `whileInView` (`components/Motion.tsx:13-24`). But they are applied indiscriminately: the home page alone has 12 nested motion wrappers, one per line of copy (`app/page.tsx:46,50,57,65,71,85`), each with its own hand-tuned delay (`0.05`→`0.25`), on top of a page-level wrapper in `app/template.tsx` and a nav wrapper in `components/Navbar.tsx:32-35`. Every heading, every paragraph and every eyebrow animates in separately. This is also the direct cause of the A1 no-JS failure. | Keep one page-level transition; delete the per-element `FadeUp` chain. Staggering individual paragraphs of body copy adds latency to first read without adding meaning. |
| D4 | Emoji used as icons | **PARTIAL** | No colour emoji. What's there is Unicode typographic glyphs standing in as icons: `✦ ↗ § ♢` for the four home sections (`app/page.tsx:13,21,28,37`), `§` again on guide cards (`app/guides/page.tsx:158`), `⤓` for file download (`app/journey/page.tsx:411`), `✓` on the login success card (`app/login/page.tsx:23`). These render in the body font and are inconsistent in weight and baseline with the real SVG icons used elsewhere (`components/Navbar.tsx:107-113`, `components/ThemeToggle.tsx:28-57`). | Replace the glyph set with SVG icons matching the existing 1.8–2px stroke style, or commit to no icons on the section cards. |
| D5 | Cursive/script display fonts | **PASS** | Fraunces (`app/layout.tsx:15-21`) is a variable serif display face, not a script/cursive font. Paired with Inter for body. | — |
| D6 | Text-only logo where a mark exists | **PASS** | The logo is a mark **plus** wordmark — a gradient-filled rounded "B" tile with shadow, then "BlakeHub" (`components/Navbar.tsx:45-59`). | — |

---

## E. Technical health

### E1 — Console errors/warnings per route — **PASS**

Loaded each route in a real browser and read the console. Zero errors and zero React warnings on all of `/`, `/websites`, `/journey`, `/guides`, `/guides/a`, `/wishlist`, and the 404 route. The only output was `[info] Download the React DevTools…` and `[log] [Fast Refresh] rebuilding/done`, both dev-only noise. No hydration mismatch, no key warnings, no failed requests.

### E2 — Production bundle — **PARTIAL FAIL**

`npm run build` output:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    1.78 kB         136 kB
├ ○ /_not-found                          873 B          88.1 kB
├ ○ /guides                              4.55 kB         200 kB
├ ƒ /guides/[slug]                       45.2 kB         241 kB
├ ○ /journey                             7.03 kB         196 kB
├ ○ /login                               1.74 kB         190 kB
├ ○ /websites                            4.36 kB         193 kB
└ ○ /wishlist                            4.83 kB         193 kB
+ First Load JS shared by all            87.2 kB
```

Totals across `.next/static`: **1,251 KB raw / 364 KB gzipped**.

Largest chunks (gzipped):

| Chunk | gz | raw | Contents |
|---|---|---|---|
| `fd9d1056-…` | 52.4 KB | 168.8 KB | shared vendor (in every route's first load) |
| `619-…` | 48.2 KB | 174.1 KB | vendor |
| `framework-…` | 43.8 KB | 136.7 KB | React |
| `366-…` | 42.0 KB | 142.2 KB | `react-markdown` + `remark-gfm` — correctly isolated to `/guides/[slug]` only |
| `247-…` | 39.3 KB | 121.2 KB | `framer-motion` |
| `polyfills-…` | 38.6 KB | 110.0 KB | legacy polyfills |
| `44530001-…` | — | 52.8 KB | `@supabase/supabase-js` |

The shape of the problem: `/_not-found` is 88 kB while every real route is 190–241 kB. The ~105 kB delta is `framer-motion` + `supabase-js`, pulled into every single route because every page is `"use client"` and every page imports `Motion.tsx`. Markdown is well split — that part is fine.

**Imported but unused (dead code):**

| What | Where | Note |
|---|---|---|
| `hostFromUrl()` | `app/websites/page.tsx:9-15` | Defined, never called |
| `hostFromUrl()` | `app/wishlist/page.tsx:12-18` | Defined, never called — duplicate of the above |
| `StaggerList` | `components/Motion.tsx:26-40` | Exported, zero call sites |
| `StaggerItem` | `components/Motion.tsx:42-60` | Exported, zero call sites |
| `fade-up` keyframe + animation | `tailwind.config.ts:43-46,53` | `grep -rn "fade-up" app/ components/` → no matches |
| `loading` from `useAuth()` | `components/AuthProvider.tsx:9,24,33` | Computed and exposed; **no consumer destructures it** — all 6 call sites take only `{ user }` (or `{ user, signOut }`). Consequence: because `user` starts as `null`, a signed-in owner sees the navbar render "Sign in" and then flip to "Sign out" once auth resolves. |
| `guide.icon` | `app/guides/page.tsx:49`, `lib/supabase.ts:25`, `supabase-schema.sql:24` | Written as `"default"` on every insert, never read anywhere |
| `.tag` component class | `CLAUDE.md` styling section | Documented as existing in `app/globals.css`; **it does not exist**. Also `CLAUDE.md` says the accent palette is indigo — `app/globals.css:19,45` is teal (`#2dd4bf` / `#0f766e`). Doc drift. |

**Fix:** delete the dead code; drop `framer-motion` from routes that only need a page transition (or replace `FadeUp` with a CSS animation), which removes ~39 KB gz from every route.

### E3 — Broken buttons, dead links, no-op handlers — **FAIL**

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| **High** | **Deletes report success even when the database rejects them.** All three delete handlers `await` the Supabase call, ignore the returned `error`, and unconditionally mutate local state. A blocked delete looks like a successful one until reload. | `app/websites/page.tsx:71-72`, `app/wishlist/page.tsx:107-108`, `app/guides/page.tsx:65-66` | Destructure `error`, only update state on success, surface failures. |
| **Medium** | **Case-sensitive slugs presented uppercased.** The guide card renders `/{guide.slug}` inside a `uppercase` span, so slug `a` *displays* as `/A`. `/guides/A` renders "Guide not found" while `/guides/a` works — verified both. Anyone typing what they see gets a dead page. | `app/guides/page.tsx:160-162`; lookup is `.eq("slug", slug)` at `app/guides/[slug]/page.tsx:31` | Drop `uppercase` from the slug chip, and/or lowercase the slug on lookup and force lowercase on create. |
| **Medium** | **Nested interactive elements (invalid HTML + a11y).** Edit/Delete `<button>`s live inside the card's `<a href>`. They work via `preventDefault`/`stopPropagation`, but `<button>` inside `<a>` is invalid and confuses screen readers and keyboard tab order. | `app/websites/page.tsx:186-218`, `app/wishlist/page.tsx:255-287` | Move the controls outside the anchor — a header row above it, or an overlay sibling. |
| **Medium** | **Topic chips are keyboard-inaccessible.** Course topic filters are `<span onClick>` inside a `<button>` — not focusable, no keyboard activation, and again nested interactives. | `app/journey/page.tsx:326-336` | Move the chips out of the accordion `<button>` and make them real `<button>`s. |
| **Low** | **Empty flex wrapper for signed-out visitors.** `<div className="flex items-center justify-center">` renders with no children when `user` is null, and `justify-center` centers the owner-only Edit/Delete row when they are present — odd placement for card actions. | `app/websites/page.tsx:200-217`, `app/wishlist/page.tsx:269-286` | Render the wrapper only when `user` is truthy. |
| **Low (latent)** | **One `fileInputRef` shared by all courses.** A single ref is assigned by every rendered file input. Only one course body mounts at a time, so it currently works — but during the `AnimatePresence` exit animation two inputs can coexist, and `fileInputRef.current` points at whichever rendered last. | `app/journey/page.tsx:35,447,458` | Key the ref per course, or use a local ref inside a course-row subcomponent. |

### E4 — Missing/placeholder alt text — **N/A**

There are no `<img>` or `next/image` elements in the project. All graphics are inline SVG. Two SVGs carry no accessible name but are inside labelled controls (`components/Navbar.tsx:102-114` has `aria-label="Toggle menu"`, `components/ThemeToggle.tsx:21-24` has a dynamic `aria-label`), so this is handled correctly. The delete icon at `app/guides/page.tsx:175-184` has `aria-label="Delete guide"`. Good as-is — but this will need attention the moment images are added.

### E5 — Lighthouse-style issues — **PARTIAL FAIL**

| Issue | Result | Evidence |
|---|---|---|
| Render-blocking assets | **PASS** | Fonts are self-hosted via `next/font/google` with `display: "swap"` (`app/layout.tsx:8-21`); network trace shows three local `.woff2` files from `/_next/static/media/`, no external font or CDN requests. Theme flash is prevented by `next-themes`' inline pre-hydration script. |
| Unoptimized images | **N/A** | No images. |
| Layout shift | **PARTIAL FAIL** | `ThemeToggle` reserves its exact 36×36 box before mount (`components/ThemeToggle.tsx:13-15`) — correctly done. But the three-card skeleton block on `/websites`, `/guides` and `/wishlist` is a fixed 3 placeholders that gets replaced by 1, 7 or 30 real cards (`app/websites/page.tsx:156-164` and equivalents), which is a guaranteed CLS event on every load. |
| LCP | **FAIL** | Compounded: all content is client-fetched after hydration, and `app/template.tsx:8-12` starts the whole page at `opacity: 0`. Nothing is visible until React mounts, animates in, *then* Supabase responds. |
| Reduced motion | **PASS** | `app/globals.css:429-436` collapses all animation and transition durations under `prefers-reduced-motion: reduce`. |
| Focus visibility | **PASS** | `app/globals.css:96-100` sets a 2px accent `:focus-visible` outline globally. |

---

## F. Supabase safety

| # | Item | Result | Evidence | Fix |
|---|---|---|---|---|
| F1 | Service-role key or secret in the client bundle? | **PASS** | Scanned the production `.next/static/` output: no `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret` or `SUPABASE_JWT_SECRET`. (A dev-build scan hits `service_role` only inside `@supabase/supabase-js`' own JSDoc — "Never expose your `service_role` key in the browser" — which is a comment, not a value.) The key in the bundle decodes to `{"iss":"supabase","ref":"lamefzddvcefmcinybxn","role":"anon"}` — correct. `.env*.local` is gitignored (`.gitignore:24`), and `lib/supabase.ts:4-7` reads only `NEXT_PUBLIC_*`. | — |
| F2 | RLS enabled on every table the client touches? | **PASS** | Queried the live project: `public.websites`, `public.guides`, `public.course_notes`, `public.wishlist` — **`rls_enabled: true` on all four**, matching `supabase-schema.sql:58-61`. Policies are `select using (true)` for everyone and `auth.uid() = user_id` for insert/update/delete. | — |
| F3 | Storage bucket policies | **FAIL** | `supabase-schema.sql:139-144`: upload/update/delete on `course-files` require only `auth.role() = 'authenticated'` — **not** ownership of the path. Any authenticated user could overwrite or delete any file in the bucket. Low practical risk today (you are the only account), but it is the one policy that doesn't match the ownership model the rest of the schema enforces. | Scope to the owner's folder: `and (storage.foldername(name))[1] = auth.uid()::text`. |
| F4 | `update` policies missing `with check` | **PARTIAL FAIL** | Every update policy has `using (auth.uid() = user_id)` but no `with check` — e.g. `supabase-schema.sql:73-74`. A row's owner can update it and reassign `user_id` to someone else, permanently losing write access to their own row. | Add `with check (auth.uid() = user_id)` to all four update policies. |
| F5 | Auth hardening (from Supabase advisors) | **PARTIAL FAIL** | Security advisor `auth_leaked_password_protection`: **disabled**. The HaveIBeenPwned check is off for the one account that can write to the entire site. Eight other advisor warnings are all `pg_graphql_*_table_exposed` for the four tables — expected and by design for a public-read site, no action needed. | Enable leaked-password protection in Dashboard → Authentication → Policies. |
| F6 | Dependency vulnerabilities | **FAIL** | `npm audit --omit=dev` → **4 vulnerabilities (1 critical, 3 high)** in production deps: `next` (**CRITICAL**, `0.9.9 – 16.3.0-preview.10`), `nanoid` (high), `postcss` (high), `ws` (high). npm also warns on install: *"next@14.2.21: This version has a security vulnerability."* | Patch `next` within the 14.x line first (least disruptive); `npm audit fix` clears `ws`. A `next@16` jump is a separate, deliberate piece of work — don't fold it into the UI overhaul. |

---

## Summary

**28 checks: 12 PASS · 11 FAIL · 8 PARTIAL · 3 N/A**

The site is in better shape than the checklist total suggests. The content is genuine — real links you actually use, a real curriculum, a real wishlist — with no fake metrics, no stock imagery and no hollow hero copy. There are zero console errors on any route, RLS is correctly enabled on all four tables, no secret is exposed in the bundle, and reduced-motion and focus-visible are handled properly. Those are the expensive things to fix, and they're already right.

What's missing is almost entirely the layer *around* the app: no favicon, no OG tags, no per-route titles, no `robots.txt`, no sitemap, no custom 404. None of it is hard.

Three findings are worth pulling forward:

1. **`app/template.tsx` renders every page at `opacity: 0` in the served HTML.** It is the single highest-leverage fix — it degrades no-JS rendering, delays LCP, and is one line.
2. **The only guide on the site is titled "A" and its body is the scaffold placeholder.** It is publicly visible right now.
3. **Deletes silently report success when RLS rejects them** (three files). A correctness bug, not a polish item.

---

# Phase 2 — Hygiene fixes (completed 2026-08-10)

Every FAIL and PARTIAL FAIL in sections A, B, E and F was addressed, except where noted under "Deliberately deferred". Sections C and D were left alone — they are content and design, and belong to Phase 3.

Verification after the pass: `npm run build` compiles successfully, `npx next lint` reports **zero warnings**, and all 14 routes return their expected status with **no console errors on any route** (the only console "error" anywhere is the 404 page correctly returning a 404 status).

## A. Head & metadata

| # | Was | Now | Where |
|---|---|---|---|
| A1 | Whole page serialized at `opacity:0` | **Fixed.** Prerendered HTML now contains **0** `opacity:0` occurrences on every page (was 12 on `/`). Framer's mount-time `initial` was the cause in three places — the page template, the navbar, and the per-element `FadeUp`/`Stagger` chain — all three are now CSS keyframes that ship visible markup. | [app/template.tsx](app/template.tsx), [components/Motion.tsx](components/Motion.tsx), [components/Navbar.tsx:32](components/Navbar.tsx:32), [app/globals.css](app/globals.css) |
| A2 | One title everywhere | **Fixed.** Unique title per route via a `layout.tsx` per segment (pages are client components and can't export metadata themselves). `/guides/[slug]` resolves the real guide title server-side. | [lib/metadata.ts](lib/metadata.ts), `app/*/layout.tsx` |
| A4 | Global description only | **Fixed.** Per-route descriptions through the same helper. | [lib/metadata.ts](lib/metadata.ts) |
| A5 | No OG tags or image | **Fixed.** Full `openGraph` + `twitter` blocks, plus a real 1200×630 `opengraph-image.png` with alt text. | [app/layout.tsx](app/layout.tsx), [app/opengraph-image.png](app/opengraph-image.png) |
| A6 | No structured data | **Fixed.** `Person` + `WebSite` JSON-LD graph. Deliberately limited to facts already on the site — no invented job title, employer, or social profiles. | [app/layout.tsx](app/layout.tsx) |
| A7 | No canonical | **Fixed.** `metadataBase` + per-route `alternates.canonical`. | [lib/site.ts](lib/site.ts) |
| A9 | No favicon at all | **Fixed.** `icon.svg` and a 180×180 `apple-icon.png`, both the existing "B" monogram. | [app/icon.svg](app/icon.svg), [app/apple-icon.png](app/apple-icon.png) |

## B. Site-level files

All six now exist and return 200: [robots.ts](app/robots.ts) (allows AI crawlers per your call, disallows `/login`, points at the sitemap), [sitemap.ts](app/sitemap.ts) (static routes + one entry per guide, hourly revalidate, degrades to static-only if Supabase is down), [llms.txt](app/llms.txt/route.ts), [privacy](app/privacy/page.tsx), [terms](app/terms/page.tsx), and a custom [not-found.tsx](app/not-found.tsx) that explains the lowercase-slug rule and offers the four sections.

The privacy page describes only what the code actually does. Both legal pages carry a marked `TODO(blake)` — a contact address on privacy, a content licence on terms — rather than inventing either.

## E. Technical health

- **Deletes no longer lie.** All three handlers check the returned `error` and surface it in a `role="alert"` region instead of optimistically mutating state. [websites:71](app/websites/page.tsx:71), [wishlist:107](app/wishlist/page.tsx:107), [guides:65](app/guides/page.tsx:65)
- **Dead `/guides/A` link fixed**, both ends: the slug chip no longer renders through `uppercase`, slugs are normalised on create, and lookups lowercase the param — so `/guides/A` and `/guides/a` both resolve. Verified: both return 200.
- **No more nested interactives.** Website, wishlist and guide cards now use a stretched-link pattern — one anchor, real sibling buttons — so the whole card stays clickable with valid HTML and correct tab order. Each control has an `sr-only` name.
- **Journey topic chips are real buttons** with `aria-pressed`, moved out of the disclosure button. The accordion got `aria-expanded`/`aria-controls`.
- **Shared `fileInputRef` removed** in favour of a per-course `<label htmlFor>` — no ref, no last-rendered-wins hazard.
- **Dead code deleted:** `hostFromUrl` ×2, `StaggerList`, `StaggerItem`, the `fade-up` keyframe, `guide.icon` (also dropped from the insert and the TS type; the column is marked deprecated in the schema).
- **`loading` is now consumed** — the navbar reserves its auth slot instead of flashing "Sign in" at a signed-in owner.
- **ESLint now works.** `next lint` previously dropped into an interactive setup prompt because no config existed. Added `.eslintrc.json` (`next/core-web-vitals`) and the missing `eslint` devDependency; fixed the one warning it surfaced (a stale-closure-prone `useEffect` in the guide page, now with proper cleanup).
- **Skeletons** widened from 3 to 6 placeholders on the grid pages and marked `aria-busy` — closer to real counts, less shift.
- **Bundle:** `/` fell from **136 kB → 97.7 kB** first-load JS and `/login` from 190 kB → 150 kB, because those routes no longer pull Framer Motion at all. `/guides/[slug]` fell 241 kB → 203 kB. Routes still using `AnimatePresence` for forms and accordions (websites, wishlist, guides, journey) are unchanged at ~193–202 kB; trimming those is Phase 3 work.

## F. Supabase

- **Storage writes are now owner-scoped** — `(storage.foldername(name))[1] = auth.uid()::text` on insert/update/delete, matching the `{user.id}/{course_code}/{filename}` path the app uploads to. The old permissive policies are explicitly dropped **by their original names**, so re-running the file doesn't leave them active alongside the new ones. [supabase-schema.sql](supabase-schema.sql)
- **`with check` added to all four update policies**, closing the reassign-`user_id` hole.
- **`next` patched 14.2.21 → 14.2.35**, clearing the CRITICAL advisory. `npm audit fix` cleared `ws` and `nanoid`.

> **Two items need you — I can't do either from here.**
> 1. **Run the updated `supabase-schema.sql`** in the Supabase SQL Editor. The policy changes above are only in the file until you do; the live database still has the permissive storage rules. Say the word and I'll apply it via the Supabase MCP instead.
> 2. **Enable leaked-password protection** in Dashboard → Authentication → Policies (advisor `auth_leaked_password_protection`).

## Deliberately deferred

- **`next@16`.** Two HIGH advisories remain (`next` itself, and the `postcss` bundled inside it). Neither is fixable within 14.x — `npm audit fix --force` wants `next@16`, which is two majors and pulls in React 19. Doing that immediately before a UI overhaul would churn everything at once. It should be its own piece of work.
- **Server-side data fetching (part of A1).** Content is still fetched client-side, so rows aren't in the served HTML and LCP still waits on hydration. Converting to server components contradicts the "there is no server" pattern documented in `CLAUDE.md` and is an architectural change, not hygiene.
- **The OG image has an awkward vertical gap** between the wordmark and the headline. It's legible and honest, and it gets regenerated in Phase 3 anyway once the type system changes.

---

# Phase 3 — UI/UX overhaul (completed 2026-08-10)

Direction: editorial minimalism with industrial precision. Warm neutrals, a single vermilion accent, Lora + DM Mono, flat components, and **the index as the site's primary layout device** in place of card grids.

## Sections C and D — resolved

| # | Was | Now |
|---|---|---|
| C5 | Footer filler "v1 · made with care" | Removed; footer is a ruled meta row with legal links |
| C7 | Seven instances of LLM-flavoured copy | Rewritten. The Websites lead no longer promises "a sentence on why each one earns its spot"; the duplicated "Gear, gadgets…" line and the twice-told "future me" joke are gone; home section blurbs describe what the pages contain |
| D1 | Four non-accent year hues (`sky`/`violet`/`emerald`/`amber`) + gradients | All gradients removed sitewide. Years are told apart by a large mono numeral |
| D3 | 12 nested motion wrappers on the home page alone | One hero entrance, hover states, page transition. Nothing scroll-triggered |
| D4 | `✦ ↗ § ♢ ⤓ ✓` as icons | Replaced by mono numerals and real SVG; no glyph-as-icon remains |
| D2, D6 | Already passing | Unchanged |

## Verified after the final pass

- `npm run build` compiles clean; `npx next lint` → **zero warnings**
- **0** `style="opacity:0"` across all 9 prerendered pages
- Exactly **one `<h1>`** on every page
- All 17 routes return expected status, including `/guides/A` and `/guides/a` (both 200) and `/nope-404` (404)
- Unique `<title>` on every route; `og:*`, `twitter:*`, canonical, `icon`, `apple-touch-icon` and JSON-LD all present
- **Contrast measured on rendered colours, both themes** — every text token clears AA:

  | Token | Light | Dark |
  |---|---|---|
  | `--ink` | 16.26 | 15.72 |
  | `--ink-2` | 7.16 | 7.04 |
  | `--ink-3` | 4.95 | 4.85 |
  | `--accent` | 4.98 | 6.02 |

  `--ink-3` originally measured **3.41 / 3.29** and failed. It styles `.meta` labels ("30 ENTRIES", "FILTER BY TOPIC") which are small and informative, so both values were darkened/lightened until they cleared 4.5:1.

## Bundle

`framer-motion` is uninstalled — every animation is CSS.

| Route | Phase 1 | Now |
|---|---|---|
| `/` | 136 kB | **96.2 kB** |
| `/websites` | 193 kB | **151 kB** |
| `/journey` | 196 kB | **154 kB** |
| `/guides` | 200 kB | **160 kB** |
| `/wishlist` | 193 kB | **152 kB** |
| `/login` | 190 kB | **150 kB** |
| `/guides/[slug]` | 241 kB | **203 kB** |
| Total gzipped JS | 364 KB | **322 KB** |

`/guides/[slug]` remains the heaviest route: that's `react-markdown` + `remark-gfm` doing real work, correctly code-split to the one route that needs it.

## Supabase — applied and verified 2026-08-10

The schema was run against `bcillis-website` (`lamefzddvcefmcinybxn`) and confirmed by querying `pg_policies` directly:

- Storage insert/update/delete on `course-files` now carry
  `((bucket_id = 'course-files') AND ((storage.foldername(name))[1] = (auth.uid())::text))`.
  The three old `"Authenticated users can …"` policies are gone — important, because permissive policies are OR-ed, so leaving them would have silently nullified the restriction.
- All four `public` update policies (`websites`, `guides`, `course_notes`, `wishlist`) now have `with_check`.
- Security advisors are down to the eight `pg_graphql_*_table_exposed` warnings, which are expected and correct for a public-read site.

**`auth_leaked_password_protection` remains disabled — the setting is Pro-plan only, so it stays open by plan limitation, not oversight.** Practical mitigation: there is one account and no public signup, RLS is what actually guards the data, and a long generated password from a password manager is stronger than the HaveIBeenPwned check this would have added.

## Still outstanding — yours, not mine

1. **The guide titled "A"** whose body is the scaffold string. A numbered contents list makes it the whole Guides section. Write it or delete the row.
2. **Seven thin website descriptions** ("More Components" ×2, "React components", …). The index gives descriptions more prominence than the card grid did.
3. **Two `TODO(blake)` markers** — a contact address on `/privacy`, a content licence on `/terms`.
4. **`next@16`** — the two remaining HIGH advisories both live inside `next` and need a two-major jump plus React 19. Deliberately kept separate from this work.

---

### Original Phase 2 ordering (for reference)

1. `app/template.tsx` opacity, delete the guide placeholder, fix the three delete handlers.
2. Metadata layer: favicon, per-route titles/descriptions, OG, canonical, JSON-LD.
3. Site files: `not-found.tsx`, `robots.ts`, `sitemap.ts`, `llms.txt`, `/privacy`.
4. Design system: pull the journey year badges back to the accent palette; thin the `FadeUp` chain; replace glyph icons with SVGs.
5. Dead code + bundle: remove the eight unused items, reconcile `CLAUDE.md` (indigo→teal, `.tag` doesn't exist), drop `framer-motion` from routes that don't need it.
6. Supabase: storage path scoping, `with check` on update policies, leaked-password protection, `next` patch.
