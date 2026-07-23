# GradSnap — Architecture & Conventions

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
    page.tsx          # Public landing page
  components/
    auth/             # LoginForm, RegisterForm (client components)
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
| has_signed_contract | boolean | false until /onboarding/photographer/contract |
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

Contract check (`has_signed_contract`) is NOT done in middleware (requires a DB query per request). Instead it is checked inside the photographer dashboard Server Component, which redirects to `/onboarding/photographer/contract` if needed.

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

1. Run `supabase/schema.sql` in the **SQL Editor** of your Supabase project
2. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` (dev) / `https://gradsnap.vercel.app` (prod)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and your prod URL
3. In **Authentication → Providers**, enable **Google** and add your OAuth credentials
4. Email confirmation is **ON** (default) — do not disable it

## Running locally

```bash
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm lint       # ESLint
```

## Sprint roadmap

| Sprint | Scope |
|---|---|
| ✅ 1 | Project setup, Supabase, auth (email + Google), role dashboards, photographer contract |
| ✅ 2 | Photographer profile setup, portfolio photo upload (Supabase Storage) |
| ✅ 3 | Availability calendar, booking flow |
| 4 | Payments (Stripe), booking management, notifications |
| 5 | Public marketplace listing, search & filters |
