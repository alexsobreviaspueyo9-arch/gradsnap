# GradSnap — working guide

Marketplace where graduating students (clients) book graduation photographers.
Live: **https://gradsnap.vercel.app** (Vercel, auto-deploys every push to
`master` on GitHub `alexsobreviaspueyo9-arch/gradsnap`, private).

Full decision log (why, sprint history, rejected options): **`docs/HISTORY.md`**,
not auto-loaded; read the relevant section only when a task needs it.

**Code map:** graphify graph in `graphify-out/` (local). To locate code, run
`graphify query "<question>"` before reading many files (overview:
`GRAPH_REPORT.md`); refresh after big changes with `/graphify . --update`.

## Stack & commands

Next.js 16 (App Router, TS strict) · Tailwind v4 + shadcn/ui v2 (`@base-ui/react`)
· Supabase (Postgres, Auth, Storage, Realtime) · Resend · PostHog + Vercel
Analytics · Framer Motion · pnpm 11 · Vitest.

`pnpm dev | build | lint | test`. If pnpm fails with `ERR_PNPM_IGNORED_BUILDS`
(core-js), call `node_modules/.bin/{tsc,eslint,next,vitest}` directly.

## Version gotchas (training data is older than this stack)

- Middleware is **`src/proxy.ts`**, exported function `proxy`.
- shadcn Button has **no `asChild`**: use `<Link className={cn(buttonVariants(...))}>`.
- Tailwind v4: no `tailwind.config.ts`; tokens live in `globals.css` (`@theme inline`).
- `src/types/database.ts`: `type` not `interface`, `Relationships: []` per table,
  `{ [_ in never]: never }` for empty sections. Update it by hand with schema changes.
- lucide-react 1.x has no brand icons (no `Instagram`): use `AtSign`/`Link`.

## File map

```
src/app/
  page.tsx                  landing (composes components/landing/*)
  (auth)/                   login, register, verify-email (split-screen layout)
  auth/callback/route.ts    OAuth + email-confirmation exchange -> dashboard
  onboarding/               select-role (Google users), photographer/contract
  dashboard/client/         overview, photographers (search), photographers/[id], messages
  dashboard/photographer/   overview, profile, portfolio, availability, bookings, messages
  booking/balance-paid/     Stripe return page (dormant, see Payments)
  api/stripe/webhook/       dormant Stripe webhook (service-role client)
  template.tsx (+ per dashboard)  page fade, see Motion
  robots.ts sitemap.ts opengraph-image.tsx error.tsx not-found.tsx
src/components/
  ui/                       shadcn primitives: NEVER edit; restyle via globals.css
  landing/ auth/ brand/ dashboard/ client/ photographer/ chat/ motion/ analytics/
src/lib/
  supabase/{client,server,service}.ts   date.ts  price.ts  url.ts  site.ts  chat.ts
  email-templates.ts  resend.ts  posthog.ts  stripe.ts  actions/auth.ts
supabase/schema.sql         whole schema, run by hand in the SQL Editor
supabase/migrations/        newer changes (e.g. leads), run by hand like schema.sql
supabase/tests/launch-hardening.sql   rolled-back RLS/trigger attack suite
src/app/admin/leads/        admin-only (404 otherwise) outreach list, ADMIN_EMAILS
src/app/fotografos/         photographer landing; ?src= -> profiles.signup_src
scripts/find-leads.mjs      weekly lead finder: headless `claude -p` (Haiku, WebSearch+WebFetch
                            only, hard limits 8 searches/15 fetches/15 leads, $0.50 cap), checks
                            emails/handles on the public site, dedupes, `--dry-run` prints only.
                            Runs Mondays 13:00 UTC in `.github/workflows/find-leads.yml` (secrets
                            CLAUDE_CODE_OAUTH_TOKEN + SUPABASE_SERVICE_ROLE_KEY)
docs/HISTORY.md             full history (not auto-loaded)
```

## Supabase: how data flows

- **Clients:** browser components use `@/lib/supabase/client`; Server
  Components / actions / route handlers use `await createClient()` from
  `@/lib/supabase/server`. Never import the server client in a client file.
  `service.ts` (service role) is only for the Stripe webhook and `/admin/leads`
  (after `requireAdmin()` checks `ADMIN_EMAILS`); never use it elsewhere.
- **Pattern:** `page.tsx` (server) fetches with the user's session and passes
  props to a presentational or client component; client components write
  directly with the browser client and update local state optimistically.
- **Security lives in the DB, not the UI.** RLS + guard triggers in the
  "LAUNCH HARDENING" section of `schema.sql`. Guards only restrict direct
  browser requests (`current_user` = `authenticated`/`anon`); security-definer
  RPCs and service_role bypass them. Bookings are created ONLY via
  `rpc('book_slot')`; contracts ONLY via `rpc('sign_photographer_contract')`.
- **Realtime:** `availability_slots` and `booking_messages` are in
  `supabase_realtime`; client calendars remove slots live when booked/deleted
  (they don't add new ones live); chat threads receive new messages live.
- **Role** comes from `profiles.role` (locked by trigger), never from
  `user_metadata` (users can edit that). `proxy.ts` looks it up for
  `/dashboard/**`, `/login`, `/register`; `getUser()` is capped at 5s.
- **Schema changes:** append an idempotent section to `schema.sql`
  (`if not exists`, `drop ... if exists`, `create or replace`), update
  `types/database.ts`, then the USER runs it in the SQL Editor of the project
  in `.env.local` (ref `nrokuqgrjrkfxqbkcyyi`, in a separate `+alias` Supabase
  account; the main account's `gradsnap` project `qkcjnksx...` is an old, unused one).

## Rules that matter

- **Never run tests or experiments against the real database.** Unit tests
  (Vitest) must not touch Supabase. Validate SQL locally with PGlite +
  Supabase stubs (auth/storage schemas, roles), as done for the hardening.
  `supabase/tests/launch-hardening.sql` is only run by the user in the SQL
  Editor; it's one transaction ending in `rollback`, helpers live in a
  throwaway `hardening_test` schema (temp tables/`pg_temp` break there).
- **Never commit secrets.** `.env*` is ignored. Vercel env holds only:
  Supabase URL + anon key, `RESEND_API_KEY`, PostHog key/host,
  `PAYMENTS_ENABLED=false`, `APP_URL`, plus (server-only, for `/admin/leads`)
  `ADMIN_EMAILS` and `SUPABASE_SERVICE_ROLE_KEY`.
- **One account = one role, forever.** Both roles = two accounts, two emails.
  No "switch role" feature.
- **Clients need an account before browsing** photographers or calendars
  (user decision). Don't make the listing public.
- **Market: Virginia, USA.** Prices are **US dollars** (`$`, `formatPriceRange()` in
  `lib/price.ts`; dormant Stripe code uses `usd`).
- **Time zone:** slot date/time are wall-clock **America/New_York** (Virginia market):
  `APP_TIME_ZONE`/`isUpcomingSlot()` in `lib/date.ts` and `book_slot()` must agree.
- **CSS:** custom global classes use the **`gs-`** prefix (`gs-calendar`,
  `gs-glass`, `gs-bleed-x`, `gs-scrollbar-none`); third-party styles are scoped
  under a `gs-` wrapper. Global overrides of shadcn go unlayered in `globals.css`
  (capsule buttons, press state, focus outline, 44px fields) keyed on
  `.group\/button` / `[data-slot]`, never by editing `components/ui`.
- **Design (2026-10, Apple HIG pass via the `apple-design` skill):**
  - Tokens in `globals.css` are hex with their measured contrast in comments.
    Neutral surfaces (`--background` grouped grey, `--card` white; black /
    `#1c1c1e` in dark), one typeface (system font on Apple devices, Geist
    elsewhere), headings `font-semibold`. Dark mode = `prefers-color-scheme` only.
  - **One colour, one meaning:** violet (`primary`/`accent`) = the ONE primary
    action per view and selection; green (`success`) = available / confirmed /
    paid; amber (`warning`) = pending; red = destructive. Icons, avatars and
    info chips are neutral (`bg-muted`). No Tailwind palette colours in app code.
  - **Glass (`gs-glass`) only on floating chrome** (landing bar, dashboard bar,
    profile save bar), never on cards or content. It turns opaque under
    `prefers-contrast: more` / `prefers-reduced-transparency`.
  - No text over photographs (measured down to 1.5:1). `--input` (3.6:1) is
    for control edges, `--border` for decorative separators.
  - Touch: buttons get a 44px hit region on coarse pointers; fields are 44px.
    Don't dim text with `opacity-*` (it broke 4.5:1); change the surface.
  - Cards/images `rounded-3xl`, buttons are capsules, portfolio tiles `aspect-square`.
  - Motion: "How it works" stagger and the page fade only; wrap Framer trees
    that react to reduced motion in `<MotionConfig reducedMotion="user">`
    (branching on `useReducedMotion()` for `initial` causes hydration errors).
  - Re-check after UI work with a contrast/overflow/target script (text >= 4.5:1,
    no overflow at 320px, controls >= 28px); sentence case for all labels.
- **Images:** new remote hosts need `images.remotePatterns` in `next.config.ts`
  (Unsplash and `*.supabase.co` storage are configured). `blob:` previews stay `<img>`.
- **Analytics:** fire events only through `trackEvent()` (`lib/posthog.ts`);
  don't rename events (`landing_viewed`, `signup_started`, `signup_completed`,
  `photographer_profile_completed`, `availability_slot_added`,
  `booking_started`, `booking_completed`) without updating PostHog.
- **Conventions:** English code/comments/commits (conventional commits);
  PascalCase component names with named exports (newer files use kebab-case
  filenames); default exports only for Next route files; comments only for
  non-obvious "why". Run tsc + eslint + `pnpm test` + build before committing.

## Views (one paragraph each)

**Landing (`/`).** Server page composing `components/landing/*`: glass
capsule nav, hero (headline on the surface, portrait photo beside it),
"How it works" (photo + numbered list with Framer stagger), horizontal
gallery strip of 4/5 tiles (never add `justify-center`, it hides the first
photo), two equal role cards whose buttons fire `signup_started` and link
to `?role=`, footer.

**Auth (`/login`, `/register`, `/verify-email`).** Split-screen layout.
Email+password or Google. `RegisterForm` preselects role from `?role=` and
needs `<Suspense>`. Email signup creates `profiles` (+ `photographer_profiles`)
via the `handle_new_user` trigger; Google users get no profile and are sent
to `/onboarding/select-role`. Don't change this flow without being asked.

**Onboarding.** `select-role` (Google users) inserts `profiles` and, for
photographers, `photographer_profiles`. Photographers must accept
`/onboarding/photographer/contract` (RPC `sign_photographer_contract`)
before any photographer page; each photographer page checks
`has_signed_contract` server-side. Contract legal copy is not to be edited casually.

**Client overview (`/dashboard/client`).** Welcome banner and stats
(upcoming bookings). All dashboards share `DashboardShell` (sticky header +
role tabs); pages don't render their own header.

**Find a photographer (`/dashboard/client/photographers`).** `CalendarSearch`:
filters (city substring, max price, style) client-side over upcoming open
slots of contracted photographers; month calendar (react-big-calendar,
"Available" per day); per photographer a `SlotPicker` (choose a time) and
one primary "Book HH:MM" button. Has a `loading.tsx` skeleton.

**Photographer profile, client view (`.../photographers/[id]`).**
`PhotographerDetailView`: bio, specialty, price range, links (always through
`normalizeHttpUrl`), weekly "usually available" summary, portfolio bento
(`PortfolioImage` skeletons) and `BookingWidget` (calendar, `SlotPicker`,
then one primary Book button: choosing a time never books by itself).

**Booking confirmation.** After `book_slot()` succeeds, `useBookSlot` stores a
`BookingSummary` and the widget/search swaps to `BookingConfirmation`
(photographer, date, time, price, next payment step from `nextPaymentStep()` in `lib/payment.ts`,
payment link in a new tab). Stays until "Book another session".

**Photographer overview (`/dashboard/photographer`).** Stats and action tiles;
redirects to the contract if unsigned.

**Profile (`.../profile`).** `ProfileForm`: name, bio, city, price from/up to,
session length, specialty (or Other), Instagram + social links (http(s) only,
DB check constraint too), payment link, payment terms, `payment_method` (stripe|cash) + `requires_deposit` (stripe needs a link; `deposit_policy` is a dead legacy column),
`weekly_availability`, which DOES create bookable slots: the DB trigger
`sync_weekly_slots` fills the next 12 weeks (one slot per weekday window,
skipped where a slot already overlaps, so the same hours entered here and
with "Repeat every…" stay one slot) and removes open, never-booked future
slots when a weekday is dropped or changed. `rpc('refresh_weekly_slots')` on
the availability page and client search keeps the window rolling.

**Portfolio (`.../portfolio`).** `PortfolioManager`: stage files with previews,
then "Upload N photos" to Storage bucket `portfolio-photos` under
`{auth.uid()}/...`; max 20, soft nudge below 3; captions; delete.

**Availability (`.../availability`).** `AvailabilityManager`: month grid of
open slots (booked ones only appear in the day list, badged), add a slot or
"Repeat every <weekday>" for 4/8/12 weeks (upsert with `ignoreDuplicates`),
delete open slots.

**Bookings (`.../bookings`).** `BookingsManager` + server actions: confirm,
mark completed, mark paid/unpaid (manual: money moves outside GradSnap),
cancel (cancels the booking, then reopens the slot, in that order).
Confirmed/completed bookings link to their chat.

**Messages (`.../messages`, both roles).** One chat per booking
(`booking_messages`), opened when the photographer confirms; writable while
confirmed or completed, read-only once cancelled (RLS via
`can_use_booking_chat`). `lib/chat.ts` loads conversations and threads;
`MessagesView` (list + thread, `?booking=` selects) and `ChatThread`
(realtime insert subscription, Enter sends). No unread badges or email
notifications yet (emails need the domain).

## Payments

GradSnap does not touch money. Photographers set `payment_link` +
`payment_terms` + `payment_method` + `requires_deposit`; clients pay them directly and the
photographer marks bookings paid. The old Stripe Checkout code
(`lib/stripe.ts`, webhook, `finalize_*` RPCs, `booking/balance-paid`) is dormant
behind `PAYMENTS_ENABLED=false`; enabling it needs a product decision first.

## Open items before the official launch

Details and reasoning in `docs/HISTORY.md` ("Launch checklist").
1. Domain `gradsnap.app` (Cloudflare) is live; canonical `https://www.gradsnap.app`,
   `APP_URL` and Supabase Auth URLs updated, verified in Resend (sender
   `no-reply@gradsnap.app`). Still to confirm: Resend as Supabase custom SMTP.
2. Legal: privacy/terms pages + PostHog cookieless. Needs owner, country, contact email.
3. Supabase free tier pauses after ~7 idle days (DNS stops resolving): Pro plan or accept the risk.
4. Booking confirmation email to the client (not built; the domain is ready now).
5. Photographer recruitment (phase 1 built: `leads`, `/admin/leads`, `/fotografos?src=`;
   weekly agent built: `scripts/find-leads.mjs` + GitHub Actions). Phase 2 in progress:
   import box in `/admin/leads` (`lib/leads/parse.ts`), local enrichment
   (`scripts/enrich-leads.mjs`, shares `scripts/lib/leads-shared.mjs`), draft profiles
   (`status` draft|claimed, client listings show only claimed). Pending: concierge
   claim flow (`/reclamar/<token>`), sending the outreach emails.
