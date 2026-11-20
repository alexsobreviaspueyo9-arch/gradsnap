-- ─────────────────────────────────────────────
-- CLIENT UX (2026-11) — idempotent.
-- Packages (max 3 per photographer, chosen at booking), booking timeline
-- fields (responded_at by trigger, delivered_at by the photographer),
-- reminder flags, favorites, reviews (one per completed booking, inserted
-- only through submit_review, removable only by an admin through the server)
-- and a public card summary (cover, rating, response time, lowest package).
-- Old price-range fields keep working: packages are optional.
-- ─────────────────────────────────────────────

-- 1. Packages
create table if not exists public.photographer_packages (
  id               uuid primary key default gen_random_uuid(),
  photographer_id  uuid not null references public.photographer_profiles(id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  duration_minutes integer not null check (duration_minutes between 15 and 600),
  included_photos  integer not null check (included_photos between 1 and 2000),
  delivery_days    integer not null check (delivery_days between 1 and 120),
  price            numeric(10, 2) not null check (price >= 0 and price <= 100000),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists photographer_packages_photographer_idx
  on public.photographer_packages (photographer_id, sort_order);

alter table public.photographer_packages enable row level security;

drop policy if exists "Signed-in users read listed packages" on public.photographer_packages;
create policy "Signed-in users read listed packages"
  on public.photographer_packages for select to authenticated
  using (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = photographer_packages.photographer_id
        and (pp.status = 'claimed' or pp.user_id = auth.uid())
    )
  );

drop policy if exists "Photographers manage their own packages" on public.photographer_packages;
create policy "Photographers manage their own packages"
  on public.photographer_packages for all to authenticated
  using (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = photographer_packages.photographer_id and pp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = photographer_packages.photographer_id and pp.user_id = auth.uid()
    )
  );

create or replace function public.limit_photographer_packages()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.photographer_packages
    where photographer_id = new.photographer_id
  ) >= 3 then
    raise exception 'A photographer can offer at most 3 packages.';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_photographer_packages on public.photographer_packages;
create trigger limit_photographer_packages
  before insert on public.photographer_packages
  for each row execute function public.limit_photographer_packages();

-- 2. Booking timeline, package snapshot and reminder flags
alter table public.bookings
  add column if not exists package_id uuid references public.photographer_packages(id) on delete set null,
  add column if not exists package_name text,
  add column if not exists package_price numeric(10, 2),
  add column if not exists responded_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists reminder_48h_sent_at timestamptz,
  add column if not exists reminder_day_sent_at timestamptz;

-- Photographers may change status, payment status and now delivered_at;
-- everything else (who, which slot, package, source, flags) stays fixed.
create or replace function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
    and (to_jsonb(new) - 'status' - 'payment_status' - 'delivered_at'
                       - 'deposit_refunded_at' - 'deposit_refund_id')
        is distinct from
        (to_jsonb(old) - 'status' - 'payment_status' - 'delivered_at'
                       - 'deposit_refunded_at' - 'deposit_refund_id')
  then
    raise exception 'Only the booking status, payment status and delivery can be changed.';
  end if;
  return new;
end;
$$;

-- First reply to a request (confirm or cancel) for the response-time stat.
-- Runs after guard_booking_update (trigger names fire alphabetically), so a
-- browser can't forge it.
create or replace function public.set_booking_responded_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status <> 'pending' and old.responded_at is null then
    new.responded_at := now();
  else
    new.responded_at := old.responded_at;
  end if;
  return new;
end;
$$;

drop trigger if exists set_booking_responded_at on public.bookings;
create trigger set_booking_responded_at
  before update on public.bookings
  for each row execute function public.set_booking_responded_at();

-- 3. book_slot with an optional package (same checks as before).
drop function if exists public.book_slot(uuid, text);

create or replace function public.book_slot(
  p_slot_id uuid,
  p_ref_code text default null,
  p_package_id uuid default null
)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_slot    public.availability_slots%rowtype;
  v_package public.photographer_packages%rowtype;
  v_booking public.bookings%rowtype;
  v_source  text := 'marketplace';
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

  if v_slot.date + v_slot.start_time
     <= (now() at time zone 'America/New_York')::timestamp then
    raise exception 'This slot has already started.';
  end if;

  if v_slot.is_booked then
    raise exception 'This slot has already been booked.';
  end if;

  if p_package_id is not null then
    select * into v_package
    from public.photographer_packages
    where id = p_package_id and photographer_id = v_slot.photographer_id;
    if not found then
      raise exception 'This package is not offered by this photographer.';
    end if;
  end if;

  if p_ref_code is not null and exists (
    select 1 from public.photographer_profiles
    where id = v_slot.photographer_id and ref_code = p_ref_code
  ) then
    v_source := 'photographer_link';
  end if;

  update public.availability_slots
  set is_booked = true
  where id = p_slot_id;

  insert into public.bookings (slot_id, client_id, status, source, package_id, package_name, package_price)
  values (p_slot_id, auth.uid(), 'pending', v_source, v_package.id, v_package.name, v_package.price)
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_slot(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.book_slot(uuid, text, uuid) to authenticated;

-- 4. Favorites
create table if not exists public.favorites (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  photographer_id uuid not null references public.photographer_profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, photographer_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users read their favorites" on public.favorites;
create policy "Users read their favorites"
  on public.favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users add favorites" on public.favorites;
create policy "Users add favorites"
  on public.favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users remove favorites" on public.favorites;
create policy "Users remove favorites"
  on public.favorites for delete to authenticated using (user_id = auth.uid());

-- 5. Reviews: one per completed booking, written by its client only.
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null unique references public.bookings(id) on delete cascade,
  photographer_id uuid not null references public.photographer_profiles(id) on delete cascade,
  client_id       uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  body            text check (body is null or char_length(body) <= 1000),
  created_at      timestamptz not null default now(),
  removed_at      timestamptz,
  removed_reason  text check (removed_reason in ('personal_data', 'abuse'))
);

create index if not exists reviews_photographer_idx on public.reviews (photographer_id, created_at desc);

-- No insert/update/delete policies: written by submit_review(), removed by
-- remove_review() (service role, admin only). Photographers can't touch them.
alter table public.reviews enable row level security;

drop policy if exists "Clients read their own reviews" on public.reviews;
create policy "Clients read their own reviews"
  on public.reviews for select to authenticated using (client_id = auth.uid());

create table if not exists public.review_moderation_log (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid references public.reviews(id) on delete set null,
  admin_email text not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table public.review_moderation_log enable row level security;

create or replace function public.submit_review(p_booking_id uuid, p_rating integer, p_body text default null)
returns public.reviews
language plpgsql
security definer set search_path = ''
as $$
declare
  v_booking      public.bookings%rowtype;
  v_photographer uuid;
  v_review       public.reviews%rowtype;
  v_body         text := nullif(btrim(coalesce(p_body, '')), '');
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5.';
  end if;
  if v_body is not null and char_length(v_body) > 1000 then
    raise exception 'Keep the review under 1000 characters.';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or v_booking.client_id <> auth.uid() then
    raise exception 'Booking not found.';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'You can review a session once it is completed.';
  end if;

  select s.photographer_id into v_photographer
  from public.availability_slots s where s.id = v_booking.slot_id;

  insert into public.reviews (booking_id, photographer_id, client_id, rating, body)
  values (p_booking_id, v_photographer, auth.uid(), p_rating, v_body)
  returning * into v_review;

  return v_review;
exception when unique_violation then
  raise exception 'You already reviewed this session.';
end;
$$;

revoke all on function public.submit_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;

create or replace function public.remove_review(p_review_id uuid, p_reason text, p_admin_email text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_reason not in ('personal_data', 'abuse') then
    raise exception 'Reviews can only be removed for personal data or abuse.';
  end if;
  update public.reviews
  set removed_at = now(), removed_reason = p_reason
  where id = p_review_id and removed_at is null;
  if not found then
    raise exception 'Review not found or already removed.';
  end if;
  insert into public.review_moderation_log (review_id, admin_email, reason)
  values (p_review_id, p_admin_email, p_reason);
end;
$$;

revoke all on function public.remove_review(uuid, text, text) from public, anon, authenticated;
grant execute on function public.remove_review(uuid, text, text) to service_role;

-- 6. Public read functions (listed photographers only, fixed columns).
create or replace function public.public_reviews(p_photographer_id uuid)
returns table (id uuid, rating smallint, body text, created_at timestamptz, client_first_name text)
language sql
stable
security definer set search_path = ''
as $$
  select r.id, r.rating, r.body, r.created_at,
         nullif(split_part(btrim(coalesce(p.full_name, '')), ' ', 1), '')
  from public.reviews r
  join public.photographer_profiles pp on pp.id = r.photographer_id
  left join public.profiles p on p.id = r.client_id
  where r.photographer_id = p_photographer_id
    and r.removed_at is null
    and pp.status = 'claimed' and pp.has_signed_contract
  order by r.created_at desc
  limit 50
$$;

create or replace function public.public_packages(p_photographer_id uuid)
returns table (
  id uuid, name text, duration_minutes integer, included_photos integer,
  delivery_days integer, price numeric, sort_order integer
)
language sql
stable
security definer set search_path = ''
as $$
  select pk.id, pk.name, pk.duration_minutes, pk.included_photos, pk.delivery_days, pk.price, pk.sort_order
  from public.photographer_packages pk
  join public.photographer_profiles pp on pp.id = pk.photographer_id
  where pk.photographer_id = p_photographer_id
    and pp.status = 'claimed' and pp.has_signed_contract
  order by pk.sort_order, pk.price
  limit 3
$$;

-- Per listed photographer: cover photo, rating, median response time (only
-- with 3+ answered requests in the last 90 days) and lowest package price.
create or replace function public.public_photographer_cards()
returns table (
  photographer_id   uuid,
  cover_image_url   text,
  rating_avg        numeric,
  review_count      integer,
  response_hours    numeric,
  min_package_price numeric
)
language sql
stable
security definer set search_path = ''
as $$
  select
    pp.id,
    (select ph.image_url from public.portfolio_photos ph
     where ph.photographer_id = pp.id order by ph.sort_order, ph.id limit 1),
    (select round(avg(r.rating)::numeric, 1) from public.reviews r
     where r.photographer_id = pp.id and r.removed_at is null),
    (select count(*)::integer from public.reviews r
     where r.photographer_id = pp.id and r.removed_at is null),
    (select case when count(*) >= 3 then round(
       (percentile_cont(0.5) within group (
         order by extract(epoch from (b.responded_at - b.created_at)) / 3600
       ))::numeric, 1) end
     from public.bookings b
     join public.availability_slots s on s.id = b.slot_id
     where s.photographer_id = pp.id
       and b.responded_at is not null
       and b.created_at > now() - interval '90 days'),
    (select min(pk.price) from public.photographer_packages pk where pk.photographer_id = pp.id)
  from public.photographer_profiles pp
  where pp.status = 'claimed' and pp.has_signed_contract
  limit 200
$$;

revoke all on function public.public_reviews(uuid) from public, anon, authenticated;
revoke all on function public.public_packages(uuid) from public, anon, authenticated;
revoke all on function public.public_photographer_cards() from public, anon, authenticated;
grant execute on function public.public_reviews(uuid) to anon, authenticated;
grant execute on function public.public_packages(uuid) to anon, authenticated;
grant execute on function public.public_photographer_cards() to anon, authenticated;

-- 7. Reminder emails (server only). Confirmed sessions two days out (48h)
--    or today, New York dates, whose reminder hasn't been sent.
create or replace function public.due_booking_reminders(p_kind text)
returns table (booking_id uuid)
language sql
stable
security definer set search_path = ''
as $$
  select b.id
  from public.bookings b
  join public.availability_slots s on s.id = b.slot_id
  where b.status = 'confirmed'
    and (
      (p_kind = 'reminder_48h' and b.reminder_48h_sent_at is null
        and s.date = (now() at time zone 'America/New_York')::date + 2)
      or (p_kind = 'reminder_day' and b.reminder_day_sent_at is null
        and s.date = (now() at time zone 'America/New_York')::date)
    )
  limit 500
$$;

revoke all on function public.due_booking_reminders(text) from public, anon, authenticated;
grant execute on function public.due_booking_reminders(text) to service_role;

-- claim_booking_email (20261118) learns the two reminder kinds.
create or replace function public.claim_booking_email(p_booking_id uuid, p_kind text)
returns table (
  recipient_email   text,
  recipient_name    text,
  client_name       text,
  photographer_name text,
  date              date,
  start_time        time,
  end_time          time,
  base_price        numeric,
  price_max         numeric,
  payment_terms     text
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_claimed uuid;
begin
  if p_kind = 'client_booked' then
    update public.bookings set client_booked_notified_at = now()
    where id = p_booking_id and client_booked_notified_at is null
    returning id into v_claimed;
  elsif p_kind = 'photographer_booked' then
    update public.bookings set photographer_booked_notified_at = now()
    where id = p_booking_id and photographer_booked_notified_at is null
    returning id into v_claimed;
  elsif p_kind = 'client_confirmed' then
    update public.bookings set client_confirmed_notified_at = now()
    where id = p_booking_id and client_confirmed_notified_at is null and status = 'confirmed'
    returning id into v_claimed;
  elsif p_kind = 'reminder_48h' then
    update public.bookings set reminder_48h_sent_at = now()
    where id = p_booking_id and reminder_48h_sent_at is null and status = 'confirmed'
    returning id into v_claimed;
  elsif p_kind = 'reminder_day' then
    update public.bookings set reminder_day_sent_at = now()
    where id = p_booking_id and reminder_day_sent_at is null and status = 'confirmed'
    returning id into v_claimed;
  else
    raise exception 'Unknown booking email kind.';
  end if;

  if v_claimed is null then
    return;
  end if;

  return query
  select
    case when p_kind = 'photographer_booked' then pu.email else c.email end,
    case when p_kind = 'photographer_booked' then pu.full_name else c.full_name end,
    c.full_name,
    pp.display_name,
    s.date,
    s.start_time,
    s.end_time,
    pp.base_price,
    pp.price_max,
    pp.payment_terms
  from public.bookings b
  join public.availability_slots s on s.id = b.slot_id
  join public.photographer_profiles pp on pp.id = s.photographer_id
  join public.profiles c on c.id = b.client_id
  left join public.profiles pu on pu.id = pp.user_id
  where b.id = v_claimed;
end;
$$;

revoke all on function public.claim_booking_email(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_booking_email(uuid, text) to service_role;
