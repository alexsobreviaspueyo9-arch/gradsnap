-- GradSnap — Sprint 1 schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/qkcjnksxqhhotqrkelld/sql

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

-- book_slot (Sprint 3) is now dead code: paid bookings go through
-- finalize_paid_booking via the webhook. Left deployed, unused, harmless.

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
