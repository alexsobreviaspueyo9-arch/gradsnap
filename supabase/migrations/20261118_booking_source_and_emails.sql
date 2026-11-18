-- ─────────────────────────────────────────────
-- BOOKING SOURCE + BOOKING EMAILS (2026-11) — idempotent.
-- Each photographer gets a short ref_code for a personal link
-- (/photographers/<id>?ref=<code>). book_slot(p_slot_id, p_ref_code) marks a
-- booking 'photographer_link' only when the code belongs to the booked slot's
-- photographer; anything else is 'marketplace'. Never trusted from the
-- client: source is set inside book_slot and locked by guard_booking_update
-- (browsers may only change status / payment_status).
-- notified_at flags make booking emails idempotent; only the server claims
-- them, through claim_booking_email() (service role).
-- ─────────────────────────────────────────────

-- 1. Personal link code
alter table public.photographer_profiles add column if not exists ref_code text;
alter table public.photographer_profiles
  alter column ref_code set default substr(md5(gen_random_uuid()::text), 1, 10);
update public.photographer_profiles
set ref_code = substr(md5(gen_random_uuid()::text), 1, 10)
where ref_code is null;
alter table public.photographer_profiles alter column ref_code set not null;
create unique index if not exists photographer_profiles_ref_code_key
  on public.photographer_profiles (ref_code);

-- Same guard as 20261117 (terms), plus ref_code is server-made and fixed.
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
    new.terms_version := null;
    new.terms_accepted_at := null;
    new.status := 'claimed';
    new.invite_token := null;
    new.invite_expires_at := null;
    new.lead_id := null;
    new.ref_code := substr(md5(gen_random_uuid()::text), 1, 10);
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.has_signed_contract is distinct from old.has_signed_contract
    or new.contract_signed_at is distinct from old.contract_signed_at
    or new.terms_version is distinct from old.terms_version
    or new.terms_accepted_at is distinct from old.terms_accepted_at
  then
    raise exception 'The photographer terms can only be accepted from the terms page.';
  end if;
  if new.status is distinct from old.status
    or new.invite_token is distinct from old.invite_token
    or new.invite_expires_at is distinct from old.invite_expires_at
    or new.lead_id is distinct from old.lead_id
  then
    raise exception 'Profile status can only change by claiming an invite.';
  end if;
  if new.ref_code is distinct from old.ref_code then
    raise exception 'The personal link code cannot be changed.';
  end if;
  return new;
end;
$$;

-- 2. Where a booking came from + email flags
alter table public.bookings
  add column if not exists source text not null default 'marketplace',
  add column if not exists client_booked_notified_at timestamptz,
  add column if not exists photographer_booked_notified_at timestamptz,
  add column if not exists client_confirmed_notified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_source_check'
  ) then
    alter table public.bookings
      add constraint bookings_source_check check (source in ('marketplace', 'photographer_link'));
  end if;
end $$;

-- 3. book_slot with an optional ref code. Same checks as before (signed-in
--    client, slot exists, not started in New York, not booked, row lock).
drop function if exists public.book_slot(uuid);

create or replace function public.book_slot(p_slot_id uuid, p_ref_code text default null)
returns public.bookings
language plpgsql
security definer set search_path = ''
as $$
declare
  v_slot    public.availability_slots%rowtype;
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

  -- Wall-clock slot times; zone must match APP_TIME_ZONE in src/lib/date.ts.
  if v_slot.date + v_slot.start_time
     <= (now() at time zone 'America/New_York')::timestamp then
    raise exception 'This slot has already started.';
  end if;

  if v_slot.is_booked then
    raise exception 'This slot has already been booked.';
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

  insert into public.bookings (slot_id, client_id, status, source)
  values (p_slot_id, auth.uid(), 'pending', v_source)
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.book_slot(uuid, text) from public, anon, authenticated;
grant execute on function public.book_slot(uuid, text) to authenticated;

-- 4. Booking emails. Server only (service role): sets the flag for p_kind if
--    it isn't set yet and returns what the email needs; nothing when the
--    email was already sent or doesn't apply. Kinds:
--    client_booked, photographer_booked (after book_slot),
--    client_confirmed (after the photographer confirms).
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
