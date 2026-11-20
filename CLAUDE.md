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
  auth/callback/route.ts    OAuth + email-confirmation exchange -> dashboard (admins -> /admin)
  onboarding/               select-role (Google users), photographer/contract (= "Photographer terms")
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
src/app/admin/              admin area (ADMIN_EMAILS; requireAdmin() in layout AND every page, 404 otherwise)
  page.tsx                  admin home (tiles); layout = DashboardShell + AdminHeader (Preview, Leads)
  leads/                    outreach list (?estado=, import, concierge)
  preview/{photographer,client}/**  read-only previews mirroring the dashboard routes;
                            sample data in preview/preview-data.ts
src/components/admin/       admin-header, preview-bar, leads-table, import-leads
src/components/preview/preview-mode.tsx  PreviewModeProvider / usePreviewMode / useDashboardBase
src/lib/routing.ts          homePath, redirectFor (proxy), afterSignInPath (callback), toPreviewHref
src/lib/admin-email.ts      isAdminEmail (pure; proxy-safe). lib/admin.ts = requireAdmin()
src/app/fotografos/         photographer landing; ?src= -> profiles.signup_src
src/app/photographers/      PUBLIC guest browsing: list + [id] (indexable), data via public_* RPCs
src/lib/public-photographers.ts  loadPublicListing / loadPublicPhotographer / loadViewerRole
src/app/dashboard/client/bookings/  client bookings: timeline, .ics (`[id]/calendar` route), review form
src/app/admin/reviews/      review moderation (remove for personal data/abuse; logged)
src/app/api/cron/reminders/ daily Vercel Cron (vercel.json, CRON_SECRET): 48h + day-of reminder emails
src/lib/ics.ts booking-timeline.ts photographer-cards.ts booking-steps.ts client-bookings.ts
src/components/client/      BookingWidget (3 steps), CalendarSearch (date-first cards), favorite/share
                            buttons, profile-reviews, review-form, client-bookings-list
src/components/photographer/packages-editor.tsx  up to 3 packages (photographer_packages)
src/app/api/calendar/[token]/  private photographer iCal feed (token from reset_calendar_feed)
src/lib/photographer-dashboard.ts  checklist %, 48h request countdown, median reply time, unread
src/lib/photographer-today.ts      loads the "Today" panel; src/lib/reorder.ts (portfolio order)
src/components/dashboard/photographer-today.tsx  TodayPanel + OnboardingChecklist; calendar-feed-card.tsx
src/components/chat/message-templates-manager.tsx  saved replies (message_templates)
src/lib/campus-spots.ts     Virginia Tech photo spots (APPROXIMATE lat/lng, TODO-verify), cleanSpotIds, shootsAt
src/components/client/campus-map.tsx  Leaflet + OSM tiles (no key), loaded client-side only
src/app/contact/            contact page (hola@gradsnap.app, "who is behind GradSnap" TODO)
src/lib/gallery.ts          landing gallery photos + credits (null credit = "Example photo"; never invent)
src/lib/ref-code.ts         personal link ?ref= (gs_ref cookie, 30 days), countBySource
src/lib/booking-emails.ts   booking request / confirmed emails via claim_booking_email (idempotent)
src/lib/suggested-policy.ts "Use suggested policy" text for payment_terms
src/components/brand/pilot-note.tsx  "Free during our launch pilot..." (only while PAYMENTS_ENABLED != true)
src/components/dashboard/personal-link-card.tsx  photographer link + copy + link/GradSnap counters
src/lib/fees.ts             client fee 6% (min $6), commission 15%/0%, deposit 50% + fee, balance -72h, payout +48h
src/lib/cancellation-policy.ts  refundFor / refundAmounts / photographerPenalty / freeCancellationDeadline
src/components/fees/fee-tables.tsx  shared fee/policy copy (numbers from the two modules above)
src/components/client/fee-summary.tsx  checkout/confirmation total, breakdown, schedule, free-cancel date
src/app/tarifas/ src/app/politica-de-cancelacion/  static fee + policy pages (404 unless PAYMENTS_ENABLED)
src/lib/photographer-terms.ts  PHOTOGRAPHER_TERMS_VERSION (= DB photographer_terms_version()), needsTermsAcceptance
src/components/photographer/terms-text.tsx  full terms: 2026-10 sections verbatim + lawyer placeholders
docs/legal/                 archived legal text for lawyer review
src/lib/guest-booking.ts    guest Book -> /register?role=client&next=/photographers/<id>?date=&slot=
src/components/client/book-button.tsx  Book action per viewer (client | guest | photographer)
src/components/brand/public-shell.tsx  header + footer for public pages
src/app/reclamar/[token]/   concierge claim page (get/claim_photographer_invite RPCs)
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
  `service.ts` (service role) is only for the Stripe webhook, `/admin/leads`
  (after `requireAdmin()` checks `ADMIN_EMAILS`) and the server-only email
  senders `lib/chat-notify.ts` / `lib/booking-emails.ts` (after the caller's
  ownership is checked); never use it elsewhere.
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
  `/photographers/**` without a Supabase auth cookie skips the proxy entirely.
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
  No "switch role" feature. Admins (ADMIN_EMAILS) are a third kind: no profile, no role.
- **Guests browse, accounts book** (2026-11, replaces "account before browsing").
  Anon reads ONLY via `public_photographers` / `public_open_slots` /
  `public_portfolio` (security definer, claimed + contracted, fixed public
  columns, capped). Never add anon SELECT policies or expose payment
  link/terms, emails, ids of auth users, bookings, messages or drafts.
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
photographers, `photographer_profiles`. Photographers must accept the
**Photographer terms** at `/onboarding/photographer/contract` (URL kept) before
any photographer page: plain-language summary, full text, one checkbox, one
primary button; RPC `accept_photographer_terms(PHOTOGRAPHER_TERMS_VERSION)`
(only the current version; `sign_photographer_contract()` still works and
accepts the current one). Every photographer page checks
`needsTermsAcceptance()` server-side (`has_signed_contract` AND
`terms_version` = current), so bumping the version (TS constant + SQL function
together) asks everyone again. Legal copy is not to be edited casually;
sections 6-9 are marked lawyer placeholders.

**Client overview (`/dashboard/client`).** Welcome banner and stats
(upcoming bookings). All dashboards share `DashboardShell` (sticky header +
role tabs); pages don't render their own header.

**Guest browsing (`/photographers`, `/photographers/[id]`).** Public, indexable
(canonical www, in `sitemap.ts`), `PublicShell` chrome. Same `CalendarSearch` /
`PhotographerDetailView` with `viewer`: `guest` (no realtime, no payment info,
no Message button; "Book HH:MM" links to `/register?role=client&next=...`),
`photographer` (Book disabled: "Photographer accounts cannot book sessions").
A signed-in client is redirected to the dashboard page with `?date=&slot=`,
where `BookingWidget` preselects the slot (they still press Book; a gone slot
shows a notice). Login/signup/Google/select-role keep the `next`. Landing
client CTAs point here.

**Client UX (2026-11-20).** Date-first: "When is your graduation?" on the
landing hero (GET `/photographers?date=`) and in `CalendarSearch`; with a date,
only photographers free that day show, badged "Available on your date"; without
one, every photographer with their next open slot. Cards (cover = first
portfolio photo, "from $X" = lowest package else base price, rating only if
reviews exist, style tags, response badge from the median request->answer time
with 3+ samples) come from `public_photographer_cards()`. Booking happens on
the profile in `BookingWidget`: package (skipped without packages) -> time ->
review, progress bar, sticky CTA on phones, one primary per step;
`book_slot(slot, ref, package)` checks the package and snapshots name/price.
Clients get `/dashboard/client/bookings` (timeline requested -> confirmed ->
session day -> delivered, "Add to calendar" .ics, one review per completed
booking via `submit_review`, same neutral prompt for everyone), favorites
(Save on profiles, list on the overview) and a Share button. Reviews show on
profiles ("No reviews yet" when none); photographers can't edit/delete them;
admins remove only for personal data/abuse (`/admin/reviews`, logged in
`review_moderation_log`). Photographers mark photos delivered; reminders go
out daily via cron.

**Photographer UX (2026-11-20).** Overview starts with "Today" (requests to
confirm with time left, unread chats, sessions today in New York, photos to
deliver, median reply time once 3+ requests were answered), a completeness
checklist ("Profile 75%: add 1 more photo", hidden at 100%) and the private
calendar feed (`/api/calendar/<64-hex token>`, Replace link revokes the old
one). Requests expire 48h after booking: `expire_stale_bookings()` runs
computed-on-read (listings, dashboards, client bookings) plus the daily cron
backstop; it cancels with `expired_at` and reopens the slot, and an expiry
never counts as a reply. Profile page has "Preview as client" (public page).
Chat has saved templates (photographer messages page, insert from a select).
Portfolio: drag or arrow buttons to reorder; first photo = cover ("Make cover").

**Campus map (2026-11-20).** `CalendarSearch` has a "Pick a spot" select (the
accessible control) and a Leaflet map whose pins mirror it; picking a spot
shows only photographers whose `photo_spots` include it. Photographers tick
"Where you shoot" in `ProfileForm`; profiles list their spots. Spot ids live in
`lib/campus-spots.ts` (DB checks only the id format, max 12). Coordinates are
approximate (3 decimals) and marked TODO-verify; the UI says so. Leaflet is
imported dynamically in an effect (it needs `window`); `isolate z-0` keeps its
panes under the sticky header.

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

**Fall 2026 free pilot.** GradSnap charges nothing; clients pay photographers
directly (`PilotNote` on the landing hero, `/photographers`, next to prices and
in `BookingWidget`). `ProfileForm` "Use suggested policy" appends an editable
cancellation template to `payment_terms` (multi-line, 600 chars), shown to
signed-in clients on the photographer page as "Set by the photographer"
(guests never get `payment_terms`). `/contact` is linked from the footer and
the booking confirmation; the landing gallery captions come from
`lib/gallery.ts`.

**Booking source + emails.** Each photographer has a fixed `ref_code`
(guard-locked); the overview shows `/photographers/<id>?ref=<code>` with a
copy button and "Bookings from your link / from GradSnap". The proxy keeps a
valid `?ref=` in the httpOnly `gs_ref` cookie (30 days) on photographer pages;
the guest `next` carries it too. `bookSlotFree` passes it to
`book_slot(p_slot_id, p_ref_code)`, which sets `bookings.source`
('photographer_link' only if the code is that slot's photographer's, else
'marketplace'; browsers can't change it). After a booking, `after()` sends the
client request email + the photographer's "new booking request"; confirming
sends the client "confirmed". `claim_booking_email` (service role) sets the
`*_notified_at` flag first, so each email goes at most once; failures are
logged with the booking id only and never affect the booking.

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

**Admin (`/admin/**`).** For the emails in `ADMIN_EMAILS` only; there is no
admin role: admins have no `profiles` row, and `profiles.role` stays
client|photographer. `requireAdmin()` (cached per render) runs in the admin
layout and in every admin page; everyone else gets a 404. `proxy.ts`
(`redirectFor`) sends admins from `/login`, `/register`, `/dashboard/**` and
`/onboarding/**` to `/admin`; the auth callback (`afterSignInPath`) does too and
follows `?next=` only inside `/admin`. The admin header (`AdminHeader` in
`DashboardShell`) has Preview and Leads tabs (44px). **Preview** renders the REAL
dashboard components with the hard-coded sample data in
`app/admin/preview/preview-data.ts` (one photographer, slots, two bookings, one
chat), routes mirroring `/dashboard/<role>/**` under `/admin/preview/<role>/**`,
with a "Preview mode" badge and a Photographer/Client toggle (`PreviewBar`).
`PreviewModeProvider` (only in `app/admin/preview/layout.tsx`) makes those
components skip every DB write, server action, realtime subscription and
`trackEvent`; they change local state only (booking shows the confirmation,
chat shows the message, profile save only validates, portfolio upload is
disabled). In-app links use `useDashboardBase()` (client components) or a
`basePath` prop defaulting to the real dashboard (server components). Without
the provider, real users get the exact old behaviour. Admin accounts are created
by hand in Supabase Auth (never via `/register`, whose trigger would create a profile).

## Payments

GradSnap does not touch money. Photographers set `payment_link` +
`payment_terms` + `payment_method` + `requires_deposit`; clients pay them directly and the
photographer marks bookings paid. The old Stripe Checkout code
(`lib/stripe.ts`, webhook, `finalize_*` RPCs, `booking/balance-paid`) is dormant
behind `PAYMENTS_ENABLED=false`; enabling it needs a product decision first.

**Fees and policy disclosure (built 2026-11, dormant).** Everything about
fees, deposits, refunds and penalties renders ONLY when
`PAYMENTS_ENABLED=true`; with it false the site is unchanged. Rules live in
the pure, string-free `lib/fees.ts` and `lib/cancellation-policy.ts` (dates
via `zonedDateTime()` in `lib/date.ts`, America/New_York); UI copy reads the
constants, never repeats numbers. When on: all-in prices (session + fee,
rounded up in lists, exact at checkout, "Includes GradSnap service fee"),
`FeeSummary` in `BookingWidget`/`CalendarSearch`/`BookingConfirmation`,
exact refund + penalty in the photographer cancel prompt, "How you get paid"
on `/fotografos`, footer links and sitemap entries for `/tarifas` and
`/politica-de-cancelacion`. No Stripe/payment code was added. Those pages are
static, so flipping the variable needs a redeploy. Founding-photographer
terms are a TODO (no numbers).

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
   (`status` draft|claimed, client listings show only claimed), concierge: "Crear perfil
   borrador" on `respondio` leads -> one-time `/reclamar/<token>` link (14 days); the claim
   is the `claim_photographer_invite` RPC (merges into the user's profile, uses the token
   up, marks the lead `cuenta_creada`). Login/register/callback/select-role keep a safe
   `?next=` (`safeNextPath`). Pending: sending the outreach emails.
