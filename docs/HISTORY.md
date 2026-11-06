# GradSnap — Full history & decision log

> Not auto-loaded. This is the complete pre-2026-10 CLAUDE.md, kept verbatim
> as the decision log (why things are the way they are). The short working
> guide is `CLAUDE.md` at the repo root; read sections here only when a task
> needs the background. Append new long-form history at the end.

Photo-booking marketplace connecting graduation photographers with clients.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| Deployment | Vercel |
| Package manager | pnpm 11 |

## Project structure

```
src/
  app/
    (auth)/           # Auth pages — shared centered layout, no /auth/ URL prefix
      login/
      register/
      verify-email/
    auth/
      callback/       # Route handler for OAuth + email confirmation redirects
    onboarding/
      select-role/    # Google OAuth new users choose photographer | client
      photographer/
        contract/     # Photographers accept commission terms (required before dashboard)
    dashboard/
      photographer/   # Server component, requires role=photographer + has_signed_contract
      client/         # Server component, requires role=client
    layout.tsx        # Root layout (fonts, metadata)
    page.tsx          # Public landing page (composes components/landing/*)
  components/
    auth/             # LoginForm, RegisterForm (client components)
    landing/          # Marketing landing page sections (see below)
    ui/               # shadcn/ui primitives (never edit these manually)
  lib/
    supabase/
      client.ts       # createClient() — browser (client components)
      server.ts       # createClient() — server (Server Components, Route Handlers)
  proxy.ts            # Auth-based route protection + role-based redirects (Next.js 16: renamed from middleware.ts, export is "proxy" not "middleware")
  types/
    database.ts       # TypeScript types mirroring the Supabase schema
supabase/
  schema.sql          # Run this in the Supabase SQL Editor to set up the database
```

## Database schema

### `profiles`
Linked 1:1 to `auth.users`. Created automatically by the `on_auth_user_created` trigger on email signup, or manually in `/onboarding/select-role` for Google OAuth users.

| column | type | notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| role | text | `'photographer'` or `'client'` |
| full_name | text? | |
| created_at | timestamptz | |

### `photographer_profiles`
Extra data for photographers. A row is inserted at registration (email flow trigger) or at `/onboarding/select-role` (OAuth flow).

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → profiles.id | unique |
| display_name | text? | set in Sprint 2 profile setup |
| bio | text? | |
| city | text? | |
| base_price | numeric? | |
| has_signed_contract | boolean | false until /onboarding/photographer/contract; only settable via `sign_photographer_contract()` |
| contract_signed_at | timestamptz? | set by `sign_photographer_contract()` |
| created_at | timestamptz | |

### `portfolio_photos` (Sprint 2)
| column | type |
|---|---|
| id | uuid PK |
| photographer_id | uuid FK → photographer_profiles.id |
| image_url | text |
| caption | text? |
| sort_order | integer |

### `availability_slots` (Sprint 2)
Unique constraint on `(photographer_id, date, start_time)`.

| column | type |
|---|---|
| id | uuid PK |
| photographer_id | uuid FK |
| date | date |
| start_time | time |
| end_time | time |
| is_booked | boolean |

### `bookings` (Sprint 2)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| slot_id | uuid FK → availability_slots.id | |
| client_id | uuid FK → profiles.id | |
| status | text | `pending` / `confirmed` / `cancelled` |
| created_at | timestamptz | |

## Marketing landing page (`src/app/page.tsx`)

Visually redesigned (2026-09) on top of the same IA, copy, routes and
analytics events. `page.tsx` is a Server Component composing
`src/components/landing/*`; each Framer Motion user is an isolated client leaf:

- `landing-nav.tsx` (server) - floating pill nav, anchors `#how-it-works` /
  `#gallery`, "Log in" + "Get started". One label per intent: the hero CTA is
  also "Get started".
- `landing-hero.tsx` - asymmetric split: word-reveal headline, two overlapping
  photos with scroll parallax (`useScroll`/`useTransform`), CTA -> `/register`.
- `style-marquee.tsx` (server) - the ONE marquee on the page, fed by
  `PHOTOGRAPHER_SPECIALTIES`. Pure CSS (`.gs-marquee-*` in `globals.css`);
  wraps statically under `prefers-reduced-motion`.
- `how-it-works.tsx` - 3-cell bento (photo / brand-violet / tinted), reveal
  on scroll.
- `gallery-strip.tsx` (server) - horizontal scroll-snap strip (replaced
  `gallery-masonry.tsx`, deleted). Do NOT add `justify-center` to it: with
  overflow the first photo becomes unreachable.
- `final-cta.tsx` - asymmetric 1.35fr/1fr pair; keeps the `signup_started`
  events and `?role=` hrefs.
- `landing-footer.tsx` (server), shared `components/brand/wordmark.tsx`
  (also used by the auth layout and `DashboardHeader`).

**Design system.** Tokens in `globals.css`: one neutral family tinted to the
brand violet (hue 285), `--font-heading` is now Bricolage Grotesque
(`--font-bricolage`, display) over Geist (body). Dark mode follows
`prefers-color-scheme` via CSS only (`@custom-variant dark` is a media query,
tokens live in `@media (prefers-color-scheme: dark)`), there is no toggle and
no `.dark` class any more. Extra tokens: `--brand-glow`, `--shadow-tint`.
Radius rule: marketing buttons are pills (`rounded-full`), images/cards are
`rounded-3xl`; app UI keeps shadcn radius from `--radius` (0.75rem).
The `(auth)` layout is now a split screen (form + photo on `lg+`).

Photos are the 8 verified Unsplash IDs already used before (2 hero, 1 bento,
5 gallery); the auth panel reuses the hero photo. More photos need the same
`images.remotePatterns` entry in `next.config.ts`.

## Dashboards redesign (2026-09)

Same tokens/fonts as the landing (see above). Structure:

- `app/dashboard/{client,photographer}/layout.tsx` wrap every page in
  `components/dashboard/dashboard-shell.tsx` (sticky `DashboardHeader` with a
  per-role tab nav via `dashboard-nav.tsx`). Pages therefore no longer render
  their own header, `min-h-screen` wrapper or "Back to dashboard" buttons.
- Shared building blocks in `components/dashboard/`: `PageHeader`, `StatTile`,
  `ActionTile`, `WelcomeBanner`.
- Overview screens and the public photographer profile are presentational
  components (`client-overview`, `photographer-overview`,
  `client/photographer-detail-view`); the `page.tsx` files only fetch from
  Supabase and pass props. Queries, redirects and analytics events are
  unchanged from before the redesign.
- Global shape rule lives in `globals.css` (unlayered `[data-slot='button']`
  = pill, `[data-slot='input']` = min-height 2.5rem) so `components/ui/*` stay
  untouched. `--radius` is 0.875rem; cards/panels use `rounded-3xl`.
- `onboarding/*` and `booking/balance-paid` use `brand/centered-shell.tsx`.
  The contract legal copy was NOT edited, only its container.
- `select-role` icons were swapped (client had the camera); fixed.

**`RegisterForm` now reads a `role` query param** (`?role=client` /
`?role=photographer`) to preselect its role toggle, defaulting to `client` for
any other/missing value. Because it uses `useSearchParams()`, `register/page.tsx`
wraps it in `<Suspense>`.

**`next.config.ts` now has `images.remotePatterns` for `images.unsplash.com`.**
The old landing page used raw `<img>` tags specifically because this wasn't
configured (there's an eslint-disable comment to that effect in the old code);
without this, `next/image` throws at runtime for any Unsplash URL. Any future
image source domain needs the same treatment added here.

`scroll-booking-demo.tsx` was deleted (2026-09, unused). `icon-chip.tsx` is
kept: `onboarding/select-role` still uses it.

## Photographer profile (Fase 2 additions)

`photographer_profiles` grew new columns beyond the original Sprint 2 set —
run the "FASE 2" section of `supabase/schema.sql` (idempotent, uses
`add column if not exists`) to pick these up on an existing database:

- `instagram_url text`, `social_links jsonb` (array of `{label, url}`) — the
  "otras redes" from the brief live in `social_links`, Instagram gets its own
  column since the brief names it specifically.
- `price_max numeric` — `base_price` is now "price from", `price_max` is the
  optional "up to" for a range. `ProfileForm` validates `price_max >= base_price`
  when both are set. The booking/Stripe flow is untouched — it still only
  reads `base_price` for the deposit calculation.
- `session_duration_minutes integer`.
- `specialty text` + `specialty_other text` — single-select from
  `PHOTOGRAPHER_SPECIALTIES` (`src/types/database.ts`) or `'Other'` with the
  free-text description in `specialty_other`.
- `weekly_availability jsonb` — object keyed by `'mon'..'sun'`
  (`WeeklyAvailability` type), each a `{start, end}` "HH:MM" range. Edited via
  `WeeklyAvailabilityPicker.tsx`. **This is reference info only** — it does
  NOT generate rows in `availability_slots`. The real bookable calendar
  (Sprint 3, `AvailabilityManager`) is untouched and stays the source of
  truth for what a client can actually book. If a future ask wants the
  weekly pattern to bulk-generate real slots, that's new work in
  `AvailabilityManager`, not something this field already does.

**`PortfolioManager` now previews before uploading.** Selecting files no
longer uploads immediately — it stages them (with `URL.createObjectURL`
thumbnails, individually removable) behind a "Upload N photos" confirm step.
Enforces a 20-photo max (upload button disables at the cap) and shows a
non-blocking banner below 3 photos ("Add at least 3 photos…") — this is a
soft nudge, not a hard gate; the rest of the profile still saves fine below
3 photos.

Both `PortfolioManager`'s saved-photo grid and the public profile page
(`dashboard/client/photographers/[id]/page.tsx`) now use `next/image`
instead of raw `<img>` for Supabase Storage URLs, which needed
`*.supabase.co` (path `/storage/v1/object/public/**`) added to
`next.config.ts`'s `images.remotePatterns` alongside the Unsplash one from
Fase 1. The pending-upload previews in `PortfolioManager` stay raw `<img>`
on purpose — `next/image` doesn't accept `blob:` object URLs.

The public profile page now also surfaces specialty, price range, session
duration, Instagram/other links, and a compact "usually available" weekly
summary. Note: this page still requires a signed-in client
(`if (!user) redirect('/login')`) — making it genuinely public is Sprint 5
("Public marketplace listing"), not part of this pass.

lucide-react's installed version (`^1.25.0`) has no brand/logo icons
(no `Instagram`, etc.) — use a generic icon (`AtSign`, `Link`) for social
links instead of reaching for a brand-named icon that doesn't exist in this
package version.

## External payment links (photographer-managed, no Stripe Connect)

At the user's explicit request, GradSnap does not intermediate booking
payments at all — the platform never touches the money, so it never needs
Stripe Connect, PCI scope, or to justify holding other people's session
fees. Instead:

- `photographer_profiles.payment_link` (any URL — a Stripe Payment Link,
  PayPal.me, etc.) and `.payment_terms` (short free text, e.g. "50% deposit
  to confirm, rest on session day") are set in `ProfileForm.tsx`, right
  after the price fields.
- `payment_terms` shows on the public profile
  (`dashboard/client/photographers/[id]/page.tsx`) right under the price/
  specialty line.
- After a client books a slot, `BookingWidget.tsx` shows a "Pay deposit /
  Complete payment" button (only if the photographer set a `payment_link`)
  that opens it in a new tab. GradSnap has no way to know whether that
  external payment actually happened.
- `bookings.payment_status` (`'pending' | 'paid'`, default `'pending'`) is
  set **manually** by the photographer from `BookingsManager.tsx` ("Mark as
  paid" / "Mark unpaid") — there is no webhook or verification for it, by
  design, since the money movement is entirely outside this app.

`photographer_profiles.deposit_policy` (`'deposit_50' | 'cash_on_session'`,
nullable — `null` = not chosen yet) is a structured, separate choice from
the free-text `payment_terms` above: whether the photographer collects a
50% deposit through their `payment_link` before the session (rest in cash
after) or takes the full amount in cash after the session with no deposit
at all. Options/labels live in `DEPOSIT_POLICIES`/`DEPOSIT_POLICY_LABELS`
(`src/types/database.ts`) so `ProfileForm.tsx`'s selector and the public
profile's badge never drift out of sync on wording. Explained in full in
`/onboarding/photographer/contract` (section 2, rewritten — it used to
describe GradSnap processing payouts itself, which stopped being true the
moment this external-payment-link model replaced it).

**This is a second, independent payment mechanism, not a replacement for
Sprint 4's Stripe Checkout deposit/balance columns** (`deposit_amount`,
`stripe_checkout_session_id`, `finalize_paid_booking`, etc.) — those stay
fully in place and dormant behind `PAYMENTS_ENABLED=false`. The two systems
don't share any code, and a booking made through this external-link flow
never populates the Stripe-specific columns. If `PAYMENTS_ENABLED` is ever
flipped to `true`, `BookingWidget` will route bookings through the old
Stripe Checkout flow instead (see `useBookSlot`), and the payment-link
button described here simply won't render for those bookings (no
`successMessage` state is set on that path today) — worth a real product
decision (keep both? retire one?) before that flag is ever flipped, not
something to silently reconcile later.

## Auth flows

### Email / password
1. `/register` → `supabase.auth.signUp({ data: { role, full_name } })`
2. Supabase sends confirmation email → user clicks link → `/auth/callback?code=…`
3. Callback exchanges code for session, reads `profiles.role`, redirects to dashboard
4. If `role = 'photographer'` and `has_signed_contract = false` → `/onboarding/photographer/contract`

### Google OAuth
1. `/login` or `/register` → `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. After OAuth → `/auth/callback?code=…`
3. If no `profiles` row → `/onboarding/select-role` (new user)
4. If `profiles` row exists → direct to dashboard (returning user)

## Supabase clients

Always use the correct client for the rendering context:

```ts
// Client component (browser)
import { createClient } from '@/lib/supabase/client'

// Server Component / Route Handler / Server Action
import { createClient } from '@/lib/supabase/server'
// const supabase = await createClient()
```

Never import the server client into a Client Component — it will throw.

## Proxy (Next.js 16 middleware)

`src/proxy.ts` runs on every non-static request and:

1. Refreshes the Supabase session (required by `@supabase/ssr`)
2. Redirects unauthenticated users away from `/dashboard/**` and `/onboarding/**`
3. Redirects authenticated users away from `/login` and `/register`
4. Enforces role-based access to `/dashboard/photographer` vs `/dashboard/client`

The role is read from `profiles.role` (one query, only on `/dashboard/**`,
`/login` and `/register`), **never from `user_metadata.role`**: users can
rewrite their own metadata with `supabase.auth.updateUser()`, while
`profiles.role` is locked by the `guard_profile` trigger.

`getUser()` is capped at 5s (`AUTH_TIMEOUT_MS`): with Supabase unreachable
and a stored session, auth-js retries the refresh for ~26s and every
navigation looked frozen (seen 2026-09-27 while the project was paused).
Past the cap the request is treated as signed out.

Contract check (`has_signed_contract`) is NOT done in middleware (requires a DB query per request). Instead it is checked inside the photographer dashboard Server Component, which redirects to `/onboarding/photographer/contract` if needed.

## Security model (launch hardening, 2026-09)

**Product rule: one account = one role, forever.** Someone who wants to be
both a photographer and a client signs up twice with two different emails.
There is intentionally no "switch role" feature.

RLS alone let browser users write more than they should, so the
"LAUNCH HARDENING" section of `supabase/schema.sql` adds:

- **Bookings are only created by `book_slot()`** (the client INSERT policy is
  dropped). `book_slot()` requires `profiles.role = 'client'` and a slot
  that hasn't started yet, and keeps its `for update` race protection.
  Slot times are wall-clock times in **Europe/Madrid**: `APP_TIME_ZONE` +
  `isUpcomingSlot()` in `src/lib/date.ts` hide started slots in the UI, and
  `book_slot()` hardcodes the same zone. Change both together.
- **Guard triggers** that only restrict direct browser requests
  (`current_user` = `authenticated`/`anon`); security-definer RPCs and the
  service-role webhook are unaffected:
  - `guard_booking_update`: a photographer may only change `status`,
    `payment_status` and the refund columns of a booking.
  - `guard_slot_update`: a booked slot can't be reopened while its booking
    is `pending`/`confirmed` (cancel the booking first, as `cancelBooking`
    does).
  - `guard_photographer_profile`: `has_signed_contract`/`contract_signed_at`
    can't be set directly (use the `sign_photographer_contract()` RPC), and
    only photographer accounts can create a photographer profile.
  - `guard_profile`: `role` and `email` can't change after creation; on
    insert the email is taken from the session JWT, not the request body.
- **Links are http(s) only**: `normalizeHttpUrl()` (`src/lib/url.ts`) in
  `ProfileForm` and when rendering, plus the `photographer_links_http_only`
  check constraint.
- **Emails escape user text** with `escapeHtml()` (`src/lib/email-templates.ts`).

To verify on a real database, run `supabase/tests/launch-hardening.sql` in
the SQL Editor: it creates throwaway users, tries each attack as a browser
user, and rolls everything back. It must end with `ALL CHECKS PASSED`.

## Booking flow & UI polish (2026-09-27)

- **Access rule (user decision, do not change):** a client must have an
  account BEFORE browsing the photographer listing or any calendar. The
  listing/profile stay behind `/dashboard/client` + `proxy.ts`.
- **Calendars show only bookable slots.** Clients never saw booked ones;
  the photographer's month grid (`AvailabilityManager`) now hides them too,
  but the selected-day list still shows them with a "Booked" badge.
- **Weekly repeat** in `AvailabilityManager`: "Repeat every <weekday>" for
  4/8/12 weeks (`weeklyDates()` in `lib/date.ts`). Inserted with
  `upsert(..., { ignoreDuplicates: true })` so weeks that already have a slot
  at that start time are skipped, not errors. It creates real
  `availability_slots` rows; unrelated to the reference-only
  `weekly_availability` profile field.
- **Booking confirmation** (`client/booking-confirmation.tsx`): after
  `book_slot()` succeeds, `useBookSlot` stores a `BookingSummary` and both
  `BookingWidget` and `CalendarSearch` swap their calendar for the summary
  (photographer, date, time, price, next payment step by `deposit_policy`).
  The payment link opens in a new tab and nothing clears the summary except
  "Book another session".
- **Skeletons:** `PortfolioImage` (next/image + pulse until loaded) for
  portfolio photos; route `loading.tsx` for the listing and the profile.
  Portfolio tiles are `aspect-square` everywhere (the profile bento's big
  tile is 2x2 squares, so don't switch one place to 4/5 alone).
- **Motion:** "How it works" uses parent `staggerChildren`. Page fades are
  `template.tsx` + `components/motion/page-transition.tsx` (root and each
  dashboard). AnimatePresence exit animations are NOT used: in the App
  Router they need a hack on Next's internal `LayoutRouterContext`. The first
  server-rendered load never fades (content must be visible pre-hydration).
- **Accent colour rule:** violet (`bg-primary`) only for the one main action
  per context (Book, Confirm, Save, Upload, Get started); secondary actions
  use `outline`/`ghost`. Primary buttons get a hover lift + glow from an
  unlayered rule in `globals.css` (`.group\/button.bg-primary`), which uses
  the CSS `scale` property so it composes with Tailwind `translate` utilities.

## Launch checklist (PENDING, as of 2026-09-27)

Code-side hardening is done (see "Security model" above) but NOT committed.
The user wants to review the site and tweak some features before any of
this; don't start these items without asking.

1. ~~Apply the DB hardening~~ **DONE 2026-09-27**: applied to
   `nrokuqgrjrkfxqbkcyyi` and `supabase/tests/launch-hardening.sql` returned
   `ALL CHECKS PASSED` in the Supabase SQL Editor.
2. **Email**: `src/lib/resend.ts` still sends from `onboarding@resend.dev`
   (only delivers to the account owner). Supabase's built-in auth SMTP is
   rate-limited to a few emails/hour, so signup confirmations would fail
   at launch. Proposed: buy a domain, verify it in Resend, and set Resend
   as custom SMTP in Supabase (Auth → SMTP).
3. **Legal**: no privacy policy / terms pages; PostHog sets cookies with no
   consent. Proposed: PostHog cookieless mode (Vercel Analytics already is)
   + draft privacy/terms pages. Needs from the user: owner name/entity,
   country, contact email. Recommend a lawyer review.
4. **Production config** (after the domain exists): `APP_URL` (also drives
   robots/sitemap/OG), Supabase Site URL + Redirect URLs, Google OAuth
   consent screen published + redirect URI, all env vars in Vercel.
5. **Repo + deploy**: no git remote yet. Proposed: private GitHub repo +
   Vercel Git integration (auto deploy on push).
6. **Time zone assumption**: slots are treated as Europe/Madrid (because
   prices are EUR). Confirm with the user.
7. **Supabase free-tier pausing**: on 2026-09-27 the project
   (`nrokuqgrjrkfxqbkcyyi`) stopped resolving in DNS, most likely paused
   after a week of inactivity (fix: dashboard → Restore project). Free
   projects pause after ~7 idle days, which would take the live site down.
   Decide before launch: Pro plan, or rely on real traffic keeping it awake.
   Restored 2026-09-27. Note: this project lives in the separate `+alias`
   Supabase account; the user's main account (alexsobreviaspueyo9@gmail.com)
   also has an OLD `gradsnap` project (`qkcjnksxqhhotqrkelld`, outdated
   schema, shows "Unhealthy") that the app does NOT use. Don't confuse them.

8. **Booking confirmation email to the client (NOT implemented, user
   decision 2026-09-27)**: "Enviar email de confirmación automático al
   cliente tras completar una reserva, con resumen de fecha, hora,
   fotógrafo y precio (requiere integrar Resend o similar para envío
   transaccional)". Note: Resend is already wired up (`src/lib/resend.ts`,
   `src/lib/email-templates.ts`), so this is mostly a new template + a call
   after `book_slot()` succeeds, but it only reaches real users once item 2
   (verified sending domain) is done.

9. **Photographer recruitment, after phase 1** (2026-11: `leads` table,
   `/admin/leads`, `/fotografos?src=`):
   - **Weekly agent**: finds new photographer leads and drafts the message.
   - **Email sending**: send the outreach emails instead of copy-pasting drafts.
   - **Concierge**: hands-on onboarding for the first photographers.

Open questions for the user: which domain, who the legal owner is and in
which country, and when to commit/push.

## Code conventions

- **Language**: English for all code, variable names, comments, and git messages
- **Components**: PascalCase files, named exports (e.g. `export function LoginForm()`)
- **Route segments**: lowercase kebab-case (e.g. `select-role/`, `verify-email/`)
- **No default exports from lib files** — only `page.tsx`, `layout.tsx`, `route.ts` use default exports
- **Server Actions**: defined inline in Server Components with `'use server'` directive
- **No comments** unless the WHY is non-obvious
- **TypeScript strict**: always type function parameters and return values

## Environment variables

| variable | used in |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server |

Never put `SUPABASE_SERVICE_ROLE_KEY` in any frontend file.

## Supabase setup checklist (one-time)

1. Run `supabase/schema.sql` in the **SQL Editor** of your Supabase project —
   this also enables Realtime on `availability_slots` (needed for live slot
   removal, see "Availability calendar" below)
2. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` (dev) / `https://gradsnap.vercel.app` (prod)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your prod URL
3. In **Authentication → Providers**, enable **Google** and add your OAuth
   credentials (the Client ID/Secret from Google Cloud Console — add this
   project's own `<project-ref>.supabase.co/auth/v1/callback` to that OAuth
   client's authorized redirect URIs in Google Cloud Console)
4. Email confirmation is **ON** (default) — do not disable it

**Project moved to a new Supabase account (2026-09).** The original project
(`qkcjnksxqhhotqrkelld`) hit the free-tier "2 active projects" cap shared
with the personal-use `pData` project on the same account. Rather than pay
for Pro, GradSnap now lives under its own separate Supabase account (a
Gmail `+` alias, its own free-tier project quota, unrelated to pData
entirely) — new project ref `nrokuqgrjrkfxqbkcyyi`. The old project was
never migrated (it was still pre-launch dev data, not worth transferring);
this new project was seeded from scratch by running the full
`schema.sql` top to bottom. `.env.local` points here now. If a schema
change ever needs applying to "the live database," confirm which Supabase
project is currently referenced in `.env.local` first — don't assume it's
still the original one.

## Running locally

```bash
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint       # ESLint
pnpm test       # Vitest unit tests (src/**/*.test.ts)
```

Also: robots.txt, sitemap.xml and the Open Graph image are generated from
`src/app/{robots,sitemap}.ts` and `opengraph-image.tsx`, all based on
`SITE_URL` (`src/lib/site.ts`, from `APP_URL`). Set `APP_URL` to the real
domain in production or they point to the wrong place.

## Sprint roadmap

| Sprint | Scope |
|---|---|
| ✅ 1 | Project setup, Supabase, auth (email + Google), role dashboards, photographer contract |
| ✅ 2 | Photographer profile setup, portfolio photo upload (Supabase Storage) |
| ✅ 3 | Availability calendar, booking flow |
| ✅ 4 | Booking management, email notifications. Payments ended up as **external payment links** (photographer's own Stripe Payment Link / PayPal.me), not platform-processed Stripe Checkout — see "External payment links" below. The original Stripe Checkout deposit/balance code (`lib/stripe.ts`, `finalize_paid_booking`, etc.) still exists behind `PAYMENTS_ENABLED=false` but is not the live payment path. |
| ✅ 5 | Public marketplace listing, search & filters (price/location/style — see "Availability calendar" below). Photographer profiles still require a signed-in client to view (`redirect('/login')`); a genuinely logged-out-public listing page would be new scope, not part of what's built. |

## Analytics (Vercel Analytics + PostHog)

- **Vercel Analytics**: `<Analytics />` from `@vercel/analytics/next` in
  `layout.tsx`. Zero config — in dev it just logs to the console instead of
  sending anything (confirmed: `[Vercel Web Analytics] Debug mode is
  enabled by default in development`).
- **PostHog**: `src/lib/posthog.ts` calls `posthog.init(...)` **at module
  top-level**, guarded by `typeof window !== 'undefined'` — not inside a
  component's `useEffect`. This matters: React runs a child's effects
  before its parent's, so if init lived in a `PostHogProvider`'s
  `useEffect`, a page-level "track on mount" child component (e.g.
  `TrackLandingViewed`) could fire its own effect and call
  `posthog.capture()` *before* the parent's init effect ever ran. Top-level
  module init sidesteps the ordering question entirely — it runs the
  instant the module is first imported in the browser, before React starts
  committing anything.
  `trackEvent(name, properties)` (same file) is the only way any component
  should fire an event — it's a safe no-op (never throws) when
  `NEXT_PUBLIC_POSTHOG_KEY` isn't set, so every call site fires
  unconditionally without its own env check. Both env vars
  (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) are blank in
  `.env.local` until a real PostHog project exists — create one free at
  posthog.com and paste them in, then restart `pnpm dev` (env vars are
  read at process start).
  `src/components/analytics/posthog-provider.tsx` just wraps children in
  `posthog-js/react`'s `PostHogProvider` using that same already-initialized
  client — needed for `usePostHog()` to work anywhere later, though nothing
  currently uses that hook (every call site uses the plain `trackEvent`
  helper instead).
  `capture_pageview: false` is set deliberately — this app tracks specific
  named funnel events (below), not a blanket "every route change" pageview
  stream.

**Events tracked** (exact names/properties, don't rename without updating
both the call site and whatever PostHog funnel/insight references them):

| Event | Fired from | Properties |
|---|---|---|
| `landing_viewed` | `TrackLandingViewed` (mounted in `app/page.tsx`) | — |
| `signup_started` | The two final-CTA links in `landing/final-cta.tsx` | `role: 'client' \| 'photographer'` |
| `signup_completed` | `RegisterForm.tsx` (email/password, after `signUp()` succeeds) **and** `onboarding/select-role/page.tsx` (Google OAuth new users, after role is saved) — both paths converge on the same event name so a funnel doesn't need to know which auth method was used | `role` |
| `photographer_profile_completed` | `ProfileForm.tsx`, after every successful save (not gated to "first time only" — that distinction wasn't asked for and isn't tracked anywhere in the data model) | — |
| `availability_slot_added` | `AvailabilityManager.tsx`, after a slot insert succeeds | — |
| `booking_started` | `use-book-slot.ts` (shared by `BookingWidget` and `CalendarSearch` — the one place both booking entry points funnel through), right before the booking call | `slotId`, `photographerId` |
| `booking_completed` | Same file, right after `bookSlotFree()` succeeds | `slotId`, `photographerId` |

**Known gap, by design, not an oversight**: `booking_completed` only fires
on the free-booking path (`PAYMENTS_ENABLED=false`, the currently-live
path — see the external-payment-links section above for why this project
doesn't process payments itself). If `PAYMENTS_ENABLED` is ever flipped
back on, `startDepositCheckout` redirects out to Stripe and back via a
webhook (`api/stripe/webhook`) — true "booking completed" for that path
would need a **server-side** PostHog capture (`posthog-node`, a different
package) called from the webhook route, not `use-book-slot.ts`. Not built
now since that path is dormant; flag it as real work if payments ever go
live again.

**pnpm build-script gate note**: `pnpm install`/`pnpm exec` may hard-fail
with `[ERR_PNPM_IGNORED_BUILDS]` over a transitive dep's (`core-js`, via
`posthog-js`) blocked postinstall script, needing `pnpm approve-builds`
(interactive) to clear. If you hit this in a non-interactive context, run
`node_modules/.bin/tsc` / `node_modules/.bin/eslint .` /
`node_modules/.bin/next build` directly instead of through `pnpm exec` —
same result, they just don't trigger pnpm's dependency-freshness check.

## Availability calendar (Fase 3 rebuild: react-big-calendar + Realtime)

The original Sprint 3 calendar used `react-day-picker` (a single-date picker
highlighting which days had slots). Rebuilt on explicit request to use
**`react-big-calendar`** instead — a real month-grid with slots rendered as
events inside day cells, not just a highlighted date.

- `src/components/availability-calendar.tsx` — shared wrapper
  (`AvailabilityCalendar`), month view only (`views={['month']}`, matching
  the literal ask for a "calendario mensual" — no week/day view toggle).
  Uses `dateFnsLocalizer` (this project already depends on `date-fns`, no
  need for `moment`). Selecting a day (`onSelectSlot`) or an event
  (`onSelectEvent`) both just report that day's `Date` back to the parent —
  which day is "selected" (for the panel below the calendar) is entirely
  the consuming component's own state, decoupled from which month the
  calendar is currently showing (that's `react-big-calendar`'s own internal
  navigation state, left uncontrolled on purpose — simpler than syncing two
  sources of truth for "current month" when nothing actually needs to
  control it from outside).
  Themed via `availability-calendar.css` (scoped under `.gs-calendar`) to
  use this app's shadcn tokens (`--primary`, `--border`, `--muted`, etc.)
  instead of `react-big-calendar`'s default blue/gray look.
- **Photographer's `AvailabilityManager.tsx`**: one event per real slot,
  labeled with its time range, styled muted/gray (`.gs-event-booked`, via
  `eventPropGetter`) when `is_booked`. Clicking a day still drives the same
  add-slot form / per-day slot list below the calendar as before — only the
  calendar widget itself changed, the add/delete Supabase calls are
  untouched.
- **Client's `CalendarSearch.tsx`** (photographer search/listing) and
  **`BookingWidget.tsx`** (one photographer's own page): one event per day
  labeled "Available" (not per-slot — a real client-facing month grid
  showing every slot's exact time inline would be too cramped to be
  useful), then the exact times for the selected day render as buttons
  below, same as before.
- **Search filters** (`CalendarSearch.tsx`, new): location (substring match
  on `city`), max price (`base_price`), and style (`specialty`, exact match
  against `PHOTOGRAPHER_SPECIALTIES` or the custom `specialty_other` value)
  — all client-side over the already-fetched slot list, no new queries.
  "Available date" is the calendar itself. This required widening the
  photographer fields selected in
  `dashboard/client/photographers/page.tsx` (`price_max`, `specialty`,
  `specialty_other` added alongside the existing `city`/`base_price`).
- **Realtime** (new — this genuinely didn't exist anywhere in the app
  before): `CalendarSearch.tsx` and `BookingWidget.tsx` both open a
  `supabase.channel(...).on('postgres_changes', ...)` subscription on
  `availability_slots` (`BookingWidget` filters `photographer_id=eq.…`,
  `CalendarSearch` has no single-photographer filter to key off so it
  subscribes unfiltered and checks the row size locally) and drop a slot
  from local state the instant it's `UPDATE`d to `is_booked=true` or
  `DELETE`d — so a slot someone else just booked disappears live for every
  other client looking at the same calendar, no refresh needed. Requires
  `availability_slots` to be added to the `supabase_realtime` publication —
  done in `schema.sql` (idempotent `pg_publication_tables` check, same
  pattern as enabling Realtime on any Supabase table). Only listens for
  removal; a brand-new slot a photographer just opened does **not** appear
  live for someone already browsing (would need a join back to
  `photographer_profiles` that the raw `postgres_changes` payload doesn't
  carry) — out of scope for what was actually asked ("que desaparezca
  cuando se reserva", not "que aparezca cuando se crea").
- **Concurrency** (the two-clients-race requirement) was already correctly
  handled *before* this rebuild and needed no changes: `book_slot()` (the
  RPC `bookSlotFree` calls) does `select ... for update` inside a
  transaction before checking `is_booked`, so two near-simultaneous booking
  attempts on the same slot serialize at the database level — only one can
  ever succeed. This is a real transactional guarantee, not just a UNIQUE
  constraint.
- `src/components/booking-calendar.tsx` (the old `react-day-picker` wrapper)
  was deleted outright once nothing referenced it anymore — don't
  resurrect it. The underlying shadcn `ui/calendar.tsx` primitive (and its
  `react-day-picker` dependency) was left in place since it's a generic
  primitive that could still serve some other single-date-picker need
  later; only the booking-specific wrapper was dead code.
