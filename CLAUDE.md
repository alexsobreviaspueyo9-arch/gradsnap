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
  dashboard/client/         overview, photographers (search), photographers/[id]
  dashboard/photographer/   overview, profile, portfolio, availability, bookings
  booking/balance-paid/     Stripe return page (dormant, see Payments)
  api/stripe/webhook/       dormant Stripe webhook (service-role client)
  template.tsx (+ per dashboard)  page fade, see Motion
  robots.ts sitemap.ts opengraph-image.tsx error.tsx not-found.tsx
src/components/
  ui/                       shadcn primitives: NEVER edit; restyle via globals.css
  landing/ auth/ brand/ dashboard/ client/ photographer/ motion/ analytics/
src/lib/
  supabase/{client,server,service}.ts   date.ts  price.ts  url.ts  site.ts
  email-templates.ts  resend.ts  posthog.ts  stripe.ts  actions/auth.ts
supabase/schema.sql         whole schema, run by hand in the SQL Editor
supabase/tests/launch-hardening.sql   rolled-back RLS/trigger attack suite
docs/HISTORY.md             full history (not auto-loaded)
```

## Supabase: how data flows

- **Clients:** browser components use `@/lib/supabase/client`; Server
  Components / actions / route handlers use `await createClient()` from
  `@/lib/supabase/server`. Never import the server client in a client file.
  `service.ts` (service role) is only for the Stripe webhook; its key is NOT in Vercel.
- **Pattern:** `page.tsx` (server) fetches with the user's session and passes
  props to a presentational or client component; client components write
  directly with the browser client and update local state optimistically.
- **Security lives in the DB, not the UI.** RLS + guard triggers in the
  "LAUNCH HARDENING" section of `schema.sql`. Guards only restrict direct
  browser requests (`current_user` = `authenticated`/`anon`); security-definer
  RPCs and service_role bypass them. Bookings are created ONLY via
  `rpc('book_slot')`; contracts ONLY via `rpc('sign_photographer_contract')`.
- **Realtime:** `availability_slots` is in `supabase_realtime`; client calendars
  remove slots live when booked/deleted (they don't add new ones live).
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
  `PAYMENTS_ENABLED=false`, `APP_URL`.
- **One account = one role, forever.** Both roles = two accounts, two emails.
  No "switch role" feature.
- **Clients need an account before browsing** photographers or calendars
  (user decision). Don't make the listing public.
- **Time zone:** slot date/time are wall-clock **America/New_York** (Virginia market):
  `APP_TIME_ZONE`/`isUpcomingSlot()` in `lib/date.ts` and `book_slot()` must agree.
- **CSS:** custom global classes use the **`gs-`** prefix (`gs-calendar`,
  `gs-marquee*`, `gs-scrollbar-none`); third-party styles are scoped under a
  `gs-` wrapper. Global overrides of shadcn go unlayered in `globals.css`
  (button pill shape, input height, primary hover glow via `.group\/button.bg-primary`).
- **Design:** tokens in `globals.css` (violet hue 285; Bricolage Grotesque
  headings over Geist). Dark mode = `prefers-color-scheme` only (no toggle).
  Marketing buttons `rounded-full`, cards/images `rounded-3xl`. Violet
  (`bg-primary`) only for the ONE main action per context; secondary actions
  use `outline`/`ghost`. Portfolio tiles are `aspect-square` everywhere.
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

**Landing (`/`).** Server page composing `components/landing/*`: pill nav,
split hero with parallax photos, one CSS marquee of specialties, "How it
works" bento with Framer stagger, horizontal gallery strip (never add
`justify-center`, it hides the first photo), final CTA pair with
`signup_started` + `?role=` links, footer.

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
"Available" per day) and per-day slot buttons that book directly. Has a
`loading.tsx` skeleton.

**Photographer profile, client view (`.../photographers/[id]`).**
`PhotographerDetailView`: bio, specialty, price range, links (always through
`normalizeHttpUrl`), weekly "usually available" summary, portfolio bento
(`PortfolioImage` skeletons) and `BookingWidget` (calendar + times + Book).

**Booking confirmation.** After `book_slot()` succeeds, `useBookSlot` stores a
`BookingSummary` and the widget/search swaps to `BookingConfirmation`
(photographer, date, time, price, next payment step from `deposit_policy`,
payment link in a new tab). Stays until "Book another session".

**Photographer overview (`/dashboard/photographer`).** Stats and action tiles;
redirects to the contract if unsigned.

**Profile (`.../profile`).** `ProfileForm`: name, bio, city, price from/up to,
session length, specialty (or Other), Instagram + social links (http(s) only,
DB check constraint too), payment link, payment terms, `deposit_policy`,
reference-only `weekly_availability` (does NOT create bookable slots).

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

## Payments

GradSnap does not touch money. Photographers set `payment_link` +
`payment_terms` + `deposit_policy`; clients pay them directly and the
photographer marks bookings paid. The old Stripe Checkout code
(`lib/stripe.ts`, webhook, `finalize_*` RPCs, `booking/balance-paid`) is dormant
behind `PAYMENTS_ENABLED=false`; enabling it needs a product decision first.

## Open items before the official launch

Details and reasoning in `docs/HISTORY.md` ("Launch checklist").
1. Domain: buy it, verify in Resend (sender is still `onboarding@resend.dev`)
   and set Resend as Supabase custom SMTP (built-in SMTP is rate-limited).
2. Legal: privacy/terms pages + PostHog cookieless. Needs owner, country, contact email.
3. Production URLs: confirm `APP_URL` in Vercel and Supabase Auth Site URL /
   Redirect URLs include `https://gradsnap.vercel.app/**` (and the domain later).
4. Supabase free tier pauses after ~7 idle days (DNS stops resolving): Pro plan or accept the risk.
5. Booking confirmation email to the client (not built; needs item 1).
