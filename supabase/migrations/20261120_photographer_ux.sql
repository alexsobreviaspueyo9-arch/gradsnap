-- ─────────────────────────────────────────────
-- PHOTOGRAPHER UX (2026-11) — idempotent. Run after 20261120_client_ux.sql.
-- 1. Requests expire after 48h: expire_stale_bookings() cancels pending
--    bookings older than 48h (expired_at set) and reopens their slots. It is
--    called on read (dashboards, listings) and by the daily cron, so nobody
--    sees a stale request even though Hobby cron runs only once a day.
-- 2. Private iCal feed per photographer (revocable token).
-- 3. Message templates per user.
-- ─────────────────────────────────────────────

-- 1. Expiry
alter table public.bookings add column if not exists expired_at timestamptz;

create index if not exists bookings_pending_created_idx
  on public.bookings (created_at) where status = 'pending';

create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.bookings
    set status = 'cancelled', expired_at = now()
    where status = 'pending' and created_at < now() - interval '48 hours'
    returning slot_id
  ), reopened as (
    update public.availability_slots s
    set is_booked = false
    from expired e
    where s.id = e.slot_id
      and not exists (
        select 1 from public.bookings b
        where b.slot_id = s.id and b.status in ('confirmed', 'completed')
      )
    returning s.id
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;

-- Fixed, idempotent operation with no input: safe for anyone to trigger.
revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
grant execute on function public.expire_stale_bookings() to anon, authenticated;

-- An expired request is not an answer: it must not count toward the
-- photographer's response time (same trigger as 20261120_client_ux).
create or replace function public.set_booking_responded_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status <> 'pending' and old.responded_at is null
     and new.expired_at is null then
    new.responded_at := now();
  else
    new.responded_at := old.responded_at;
  end if;
  return new;
end;
$$;

-- 2. Calendar feed
create table if not exists public.photographer_calendar_feeds (
  photographer_id uuid primary key references public.photographer_profiles(id) on delete cascade,
  token           text not null unique check (token ~ '^[0-9a-f]{64}$'),
  created_at      timestamptz not null default now()
);

-- Owners read their own link; it's created/replaced only by reset_calendar_feed().
alter table public.photographer_calendar_feeds enable row level security;

drop policy if exists "Photographers read their calendar feed" on public.photographer_calendar_feeds;
create policy "Photographers read their calendar feed"
  on public.photographer_calendar_feeds for select to authenticated
  using (
    exists (
      select 1 from public.photographer_profiles pp
      where pp.id = photographer_calendar_feeds.photographer_id and pp.user_id = auth.uid()
    )
  );

-- Creates the link, or replaces it (the old one stops working at once).
create or replace function public.reset_calendar_feed()
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_photographer uuid;
  v_token        text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select id into v_photographer from public.photographer_profiles where user_id = auth.uid();
  if v_photographer is null then
    raise exception 'No photographer profile found for this account.';
  end if;
  insert into public.photographer_calendar_feeds (photographer_id, token)
  values (v_photographer, v_token)
  on conflict (photographer_id) do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

revoke all on function public.reset_calendar_feed() from public, anon, authenticated;
grant execute on function public.reset_calendar_feed() to authenticated;

-- Server only (the feed route): the bookings behind a token, last 30 days on.
create or replace function public.calendar_feed_events(p_token text)
returns table (
  booking_id   uuid,
  status       text,
  date         date,
  start_time   time,
  end_time     time,
  client_name  text,
  package_name text
)
language sql
stable
security definer set search_path = ''
as $$
  select b.id, b.status, s.date, s.start_time, s.end_time,
         nullif(split_part(btrim(coalesce(c.full_name, '')), ' ', 1), ''),
         b.package_name
  from public.photographer_calendar_feeds f
  join public.availability_slots s on s.photographer_id = f.photographer_id
  join public.bookings b on b.slot_id = s.id
  left join public.profiles c on c.id = b.client_id
  where f.token = p_token
    and b.status in ('pending', 'confirmed', 'completed')
    and s.date >= (now() at time zone 'America/New_York')::date - 30
  order by s.date, s.start_time
  limit 500
$$;

revoke all on function public.calendar_feed_events(text) from public, anon, authenticated;
grant execute on function public.calendar_feed_events(text) to service_role;

-- 3. Message templates
create table if not exists public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 60),
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists message_templates_user_idx on public.message_templates (user_id, created_at);

alter table public.message_templates enable row level security;

drop policy if exists "Users manage their own templates" on public.message_templates;
create policy "Users manage their own templates"
  on public.message_templates for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
