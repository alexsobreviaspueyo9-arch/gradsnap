-- GradSnap schema
-- Run this in the Supabase SQL Editor of the project referenced in .env.local

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

-- Mirrors auth.users with role and display name
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        text not null check (role in ('photographer', 'client')),
  full_name   text,
  created_at  timestamptz not null default now()
);

-- Extended photographer data
create table public.photographer_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.profiles(id) on delete cascade,
  display_name         text,
  bio                  text,
  city                 text,
  base_price           numeric(10, 2),
  has_signed_contract  boolean not null default false,
  created_at           timestamptz not null default now()
);

-- Portfolio images (Sprint 2: upload)
create table public.portfolio_photos (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographer_profiles(id) on delete cascade,
  image_url       text not null,
  caption         text,
  sort_order      integer not null default 0
);

-- Photographer availability blocks
create table public.availability_slots (
  id              uuid primary key default gen_random_uuid(),
  photographer_id uuid not null references public.photographer_profiles(id) on delete cascade,
  date            date not null,
  start_time      time not null,
  end_time        time not null,
  is_booked       boolean not null default false,
  unique (photographer_id, date, start_time)
);

-- Client bookings
create table public.bookings (
  id         uuid primary key default gen_random_uuid(),
  slot_id    uuid not null references public.availability_slots(id) on delete restrict,
  client_id  uuid not null references public.profiles(id) on delete restrict,
  status     text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- TRIGGER: auto-create profile on email signup
-- ─────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := new.raw_user_meta_data ->> 'role';

  -- Only insert profile if role was provided at signup (email/password flow).
  -- Google OAuth users go through /onboarding/select-role instead.
  if v_role is not null then
    insert into public.profiles (id, role, full_name)
    values (
      new.id,
      v_role,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
    );

    if v_role = 'photographer' then
      insert into public.photographer_profiles (user_id)
      values (new.id);
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- RPC: race-condition-safe slot booking (Sprint 3)
-- ─────────────────────────────────────────────

create or replace function public.book_slot(p_slot_id uuid)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_slot    public.availability_slots%rowtype;
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to book a slot.';
  end if;

  select * into v_slot
  from public.availability_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'This slot no longer exists.';
  end if;

  if v_slot.is_booked then
    raise exception 'This slot has already been booked.';
  end if;

  update public.availability_slots
  set is_booked = true
  where id = p_slot_id;

  insert into public.bookings (slot_id, client_id, status)
  values (p_slot_id, auth.uid(), 'pending')
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_slot(uuid) from public;
grant execute on function public.book_slot(uuid) to authenticated;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.profiles              enable row level security;
alter table public.photographer_profiles enable row level security;
alter table public.portfolio_photos      enable row level security;
alter table public.availability_slots    enable row level security;
alter table public.bookings              enable row level security;

-- profiles
create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- photographer_profiles
create policy "Anyone authenticated can view photographer profiles"
  on public.photographer_profiles for select to authenticated using (true);

create policy "Photographers can update their own profile"
  on public.photographer_profiles for update using (auth.uid() = user_id);

create policy "Photographers can insert their own profile"
  on public.photographer_profiles for insert with check (auth.uid() = user_id);

-- portfolio_photos
create policy "Anyone authenticated can view portfolio photos"
  on public.portfolio_photos for select to authenticated using (true);

create policy "Photographers manage their own portfolio"
  on public.portfolio_photos for all using (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = portfolio_photos.photographer_id
        and pp.user_id = auth.uid()
    )
  );

-- availability_slots
create policy "Anyone authenticated can view slots"
  on public.availability_slots for select to authenticated using (true);

create policy "Photographers manage their own slots"
  on public.availability_slots for all using (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = availability_slots.photographer_id
        and pp.user_id = auth.uid()
    )
  );

-- bookings
create policy "Clients see their own bookings, photographers see bookings for their slots"
  on public.bookings for select using (
    auth.uid() = client_id
    or exists (
      select 1
      from public.availability_slots avs
      join public.photographer_profiles pp on pp.id = avs.photographer_id
      where avs.id = bookings.slot_id
        and pp.user_id = auth.uid()
    )
  );

create policy "Clients can create bookings"
  on public.bookings for insert with check (auth.uid() = client_id);

create policy "Photographers can update booking status"
  on public.bookings for update using (
    exists (
      select 1
      from public.availability_slots avs
      join public.photographer_profiles pp on pp.id = avs.photographer_id
      where avs.id = bookings.slot_id
        and pp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- STORAGE (Sprint 2): portfolio photo uploads
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-photos',
  'portfolio-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public              = excluded.public,
  file_size_limit     = excluded.file_size_limit,
  allowed_mime_types  = excluded.allowed_mime_types;

-- Path convention: {auth.uid()}/{uuid}.{ext} — folder = owning user's id.

create policy "Portfolio photos are publicly viewable"
  on storage.objects for select
  to public
  using (bucket_id = 'portfolio-photos');

create policy "Photographers can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Photographers can update their own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Photographers can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────
-- SPRINT 4: payments (Stripe) + email notifications
-- ─────────────────────────────────────────────

-- profiles.email, needed to send booking-related emails
alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Populate email going forward too (email/password signup flow).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := new.raw_user_meta_data ->> 'role';

  if v_role is not null then
    insert into public.profiles (id, role, full_name, email)
    values (
      new.id,
      v_role,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email
    );

    if v_role = 'photographer' then
      insert into public.photographer_profiles (user_id)
      values (new.id);
    end if;
  end if;

  return new;
end;
$$;

-- Cross-user read: a photographer needs their clients' profile (name/email),
-- and this also fixes BookingsManager's pre-existing "always shows 'Client'" bug.
create policy "Photographers can read profiles of their own clients"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.bookings b
      join public.availability_slots avs on avs.id = b.slot_id
      join public.photographer_profiles pp on pp.id = avs.photographer_id
      where b.client_id = profiles.id
        and pp.user_id = auth.uid()
    )
  );

-- Widen bookings.status to add 'completed' (drop-and-recreate the inline check)
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.bookings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if v_conname is not null then
    execute format('alter table public.bookings drop constraint %I', v_conname);
  end if;
end $$;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

-- Payment-tracking columns
alter table public.bookings
  add column deposit_amount              numeric(10, 2),
  add column deposit_paid_at             timestamptz,
  add column stripe_checkout_session_id  text,
  add column stripe_payment_intent_id    text,
  add column balance_amount              numeric(10, 2),
  add column balance_paid_at             timestamptz,
  add column balance_checkout_session_id text,
  add column balance_payment_intent_id   text,
  add column deposit_refunded_at         timestamptz,
  add column deposit_refund_id           text;

create unique index bookings_stripe_checkout_session_id_key
  on public.bookings (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index bookings_balance_checkout_session_id_key
  on public.bookings (balance_checkout_session_id) where balance_checkout_session_id is not null;

-- Finalize a paid deposit booking. Called ONLY by the Stripe webhook via a
-- service-role client — trusts p_client_id explicitly since there's no
-- end-user JWT in a webhook request.
create or replace function public.finalize_paid_booking(
  p_slot_id uuid,
  p_client_id uuid,
  p_deposit_amount numeric,
  p_balance_amount numeric,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text
)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_slot    public.availability_slots%rowtype;
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings
  where stripe_checkout_session_id = p_stripe_checkout_session_id;
  if found then
    return v_booking; -- idempotent on duplicate webhook delivery
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then
    raise exception 'Slot % does not exist.', p_slot_id;
  end if;
  if v_slot.is_booked then
    raise exception 'Slot % is already booked.', p_slot_id; -- caller refunds on this
  end if;

  update public.availability_slots set is_booked = true where id = p_slot_id;

  insert into public.bookings (
    slot_id, client_id, status, deposit_amount, deposit_paid_at,
    balance_amount, stripe_checkout_session_id, stripe_payment_intent_id
  )
  values (
    p_slot_id, p_client_id, 'pending', p_deposit_amount, now(),
    p_balance_amount, p_stripe_checkout_session_id, p_stripe_payment_intent_id
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.finalize_paid_booking(uuid, uuid, numeric, numeric, text, text) from public;
revoke all on function public.finalize_paid_booking(uuid, uuid, numeric, numeric, text, text) from authenticated;
grant execute on function public.finalize_paid_booking(uuid, uuid, numeric, numeric, text, text) to service_role;

-- Record a balance payment. Same trust model, service-role only.
create or replace function public.finalize_balance_payment(
  p_booking_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text
)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking % does not exist.', p_booking_id;
  end if;
  if v_booking.balance_paid_at is not null then
    return v_booking; -- idempotent
  end if;

  update public.bookings
  set balance_paid_at = now(),
      balance_checkout_session_id = p_stripe_checkout_session_id,
      balance_payment_intent_id = p_stripe_payment_intent_id
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.finalize_balance_payment(uuid, text, text) from public;
revoke all on function public.finalize_balance_payment(uuid, text, text) from authenticated;
grant execute on function public.finalize_balance_payment(uuid, text, text) to service_role;

-- book_slot (Sprint 3) is the live booking path while PAYMENTS_ENABLED=false;
-- paid bookings would go through finalize_paid_booking via the webhook.

-- ─────────────────────────────────────────────
-- FASE 2: extended photographer profile fields
-- ─────────────────────────────────────────────

alter table public.photographer_profiles
  add column if not exists instagram_url text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists price_max numeric(10, 2),
  add column if not exists session_duration_minutes integer,
  add column if not exists specialty text,
  add column if not exists specialty_other text,
  add column if not exists weekly_availability jsonb not null default '{}'::jsonb;

-- social_links: array of { "label": string, "url": string }, e.g. TikTok, a
-- personal site, etc. Instagram gets its own column since it's the one
-- platform the product brief calls out by name.
--
-- weekly_availability: object keyed by 'mon'..'sun', each value
-- { "start": "HH:MM", "end": "HH:MM" }. This is reference info shown on the
-- public profile ("usually free these days/times") — it does NOT generate
-- rows in availability_slots. Sprint 3's calendar (specific dated slots) is
-- the source of truth for what's actually bookable; this field is the
-- lighter-weight "recurring pattern" the product brief asks for as a
-- starting point, kept intentionally decoupled from the real booking
-- calendar so it can't silently create/delete real bookable slots.

-- ─────────────────────────────────────────────
-- External payment links — photographer-managed, platform never touches
-- the money. Deliberately separate from Sprint 4's Stripe Checkout
-- deposit/balance columns above, which stay dormant while
-- PAYMENTS_ENABLED=false. This is the actual live payment path: the client
-- pays the photographer directly via a link the photographer generates
-- themselves (a Stripe Payment Link, PayPal.me, etc.), and the photographer
-- marks it paid by hand since we have no way to verify an external payment.
-- ─────────────────────────────────────────────

alter table public.photographer_profiles
  add column if not exists payment_link text,
  add column if not exists payment_terms text,
  add column if not exists deposit_policy text
    check (deposit_policy in ('deposit_50', 'cash_on_session'));

alter table public.bookings
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid'));

-- deposit_policy: the photographer's choice for how they collect payment via
-- their own payment_link — 'deposit_50' (50% via Stripe upfront, rest in
-- cash after the session) or 'cash_on_session' (no deposit, full amount in
-- cash after the session). Nullable = not chosen yet. Shown on both the
-- photographer's own settings and the public profile, per explicit ask.

-- ─────────────────────────────────────────────
-- FASE 3: Realtime — a slot must disappear live for every client watching
-- the moment it's booked or removed, not just on refresh.
-- ─────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'availability_slots'
  ) then
    alter publication supabase_realtime add table public.availability_slots;
  end if;
end $$;

-- ─────────────────────────────────────────────
-- LAUNCH HARDENING (2026-09) — idempotent, safe to re-run.
--
-- Pattern: the guard triggers only restrict requests that arrive straight
-- from the browser (current_user is 'authenticated' / 'anon' via PostgREST).
-- security definer RPCs run as the function owner and the Stripe webhook
-- runs as service_role, so both keep full write access.
--
-- One account = one role, forever. Someone who wants to be both a
-- photographer and a client signs up twice with two different emails.
-- ─────────────────────────────────────────────

-- 1. Bookings can only be created through book_slot() (or the service-role
--    Stripe webhook), never by a raw INSERT that skips the is_booked check.
drop policy if exists "Clients can create bookings" on public.bookings;

create or replace function public.book_slot(p_slot_id uuid)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_slot    public.availability_slots%rowtype;
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to book a slot.';
  end if;

  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'client'
  ) then
    raise exception 'Only client accounts can book sessions.';
  end if;

  select * into v_slot
  from public.availability_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'This slot no longer exists.';
  end if;

  -- Wall-clock slot times; zone must match APP_TIME_ZONE in src/lib/date.ts.
  if v_slot.date + v_slot.start_time
     <= (now() at time zone 'America/New_York')::timestamp then
    raise exception 'This slot has already started.';
  end if;

  if v_slot.is_booked then
    raise exception 'This slot has already been booked.';
  end if;

  update public.availability_slots
  set is_booked = true
  where id = p_slot_id;

  insert into public.bookings (slot_id, client_id, status)
  values (p_slot_id, auth.uid(), 'pending')
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_slot(uuid) from public;
grant execute on function public.book_slot(uuid) to authenticated;

-- 2. Photographers may only change a booking's status / payment tracking,
--    never who booked it, which slot, or the Stripe amounts.
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
    and (to_jsonb(new) - 'status' - 'payment_status'
                       - 'deposit_refunded_at' - 'deposit_refund_id')
        is distinct from
        (to_jsonb(old) - 'status' - 'payment_status'
                       - 'deposit_refunded_at' - 'deposit_refund_id')
  then
    raise exception 'Only the booking status and payment status can be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_booking_update on public.bookings;
create trigger guard_booking_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- 3. A booked slot can't be silently reopened while its booking is active
--    (cancelBooking cancels the booking first, then frees the slot).
create or replace function public.guard_slot_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
    and old.is_booked and not new.is_booked
    and exists (
      select 1 from public.bookings
      where slot_id = old.id and status in ('pending', 'confirmed')
    )
  then
    raise exception 'Cancel the booking before reopening this slot.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_slot_update on public.availability_slots;
create trigger guard_slot_update
  before update on public.availability_slots
  for each row execute function public.guard_slot_update();

-- 4. Contract acceptance only via sign_photographer_contract(), which also
--    records when it was signed.
alter table public.photographer_profiles
  add column if not exists contract_signed_at timestamptz;

create or replace function public.guard_photographer_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.profiles where id = new.user_id and role = 'photographer'
    ) then
      raise exception 'Only photographer accounts can have a photographer profile.';
    end if;
    new.has_signed_contract := false;
    new.contract_signed_at := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.has_signed_contract is distinct from old.has_signed_contract
    or new.contract_signed_at is distinct from old.contract_signed_at
  then
    raise exception 'The contract can only be signed from the onboarding page.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_photographer_profile on public.photographer_profiles;
create trigger guard_photographer_profile
  before insert or update on public.photographer_profiles
  for each row execute function public.guard_photographer_profile();

create or replace function public.sign_photographer_contract()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  update public.photographer_profiles pp
  set has_signed_contract = true,
      contract_signed_at = coalesce(pp.contract_signed_at, now())
  from public.profiles p
  where pp.user_id = auth.uid()
    and p.id = pp.user_id
    and p.role = 'photographer';

  if not found then
    raise exception 'No photographer profile found for this account.';
  end if;
end;
$$;

revoke all on function public.sign_photographer_contract() from public;
grant execute on function public.sign_photographer_contract() to authenticated;

-- 5. Role and the notification email are fixed after creation, and the
--    email always comes from the signed-in session, never from the client.
create or replace function public.guard_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.email := auth.jwt() ->> 'email';
    return new;
  end if;

  if new.id is distinct from old.id
    or new.role is distinct from old.role
    or new.email is distinct from old.email
  then
    raise exception 'Your role cannot be changed. To use GradSnap as both a photographer and a client, create a second account with a different email.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile
  before insert or update on public.profiles
  for each row execute function public.guard_profile();

-- 6. Photographer links are rendered as hrefs for other users: http(s) only.
--    Existing values are normalized first (same rule as normalizeHttpUrl in
--    src/lib/url.ts: no scheme -> https:// added, any other scheme -> dropped)
--    so the constraint can validate every row.
update public.photographer_profiles
set payment_link = case
      when payment_link is null or payment_link ~* '^https?://' then payment_link
      when payment_link ~* '^[a-z][a-z0-9+.-]*:' then null
      else 'https://' || payment_link
    end,
    instagram_url = case
      when instagram_url is null or instagram_url ~* '^https?://' then instagram_url
      when instagram_url ~* '^[a-z][a-z0-9+.-]*:' then null
      else 'https://' || instagram_url
    end
where payment_link !~* '^https?://' or instagram_url !~* '^https?://';

update public.photographer_profiles
set social_links = coalesce((
  select jsonb_agg(
    case when e ->> 'url' ~* '^https?://' then e
         else jsonb_set(e, '{url}', to_jsonb('https://' || (e ->> 'url')))
    end)
  from jsonb_array_elements(social_links) e
  where e ->> 'url' is not null
    and (e ->> 'url' ~* '^https?://' or e ->> 'url' !~* '^[a-z][a-z0-9+.-]*:')
), '[]'::jsonb)
where jsonb_path_exists(
  social_links, '$[*] ? (!(@.url like_regex "^https?://" flag "i"))'
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photographer_links_http_only'
  ) then
    alter table public.photographer_profiles
      add constraint photographer_links_http_only check (
        (payment_link is null or payment_link ~* '^https?://')
        and (instagram_url is null or instagram_url ~* '^https?://')
        and not jsonb_path_exists(
          social_links,
          '$[*] ? (!(@.url like_regex "^https?://" flag "i"))'
        )
      );
  end if;
end $$;
