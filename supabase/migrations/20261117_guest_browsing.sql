-- ─────────────────────────────────────────────
-- GUEST BROWSING (2026-11) — idempotent.
-- Signed-out visitors browse listed photographers (claimed AND contracted)
-- through these three security-definer functions only. They return a fixed,
-- public set of columns: never payment link/terms, emails, auth ids,
-- bookings, messages, client profiles, leads, drafts or invite tokens.
-- No anon SELECT policy is added on any table; anon gets no writes.
-- ─────────────────────────────────────────────

create or replace function public.public_photographers(p_id uuid default null)
returns table (
  id                       uuid,
  display_name             text,
  bio                      text,
  city                     text,
  specialty                text,
  specialty_other          text,
  base_price               numeric,
  price_max                numeric,
  session_duration_minutes integer,
  instagram_url            text,
  social_links             jsonb,
  weekly_availability      jsonb
)
language sql
stable
security definer set search_path = ''
as $$
  select pp.id, pp.display_name, pp.bio, pp.city, pp.specialty, pp.specialty_other,
         pp.base_price, pp.price_max, pp.session_duration_minutes,
         pp.instagram_url, pp.social_links, pp.weekly_availability
  from public.photographer_profiles pp
  where pp.status = 'claimed'
    and pp.has_signed_contract
    and (p_id is null or pp.id = p_id)
  order by pp.display_name nulls last, pp.id
  limit 200
$$;

-- Open slots that haven't started yet (New York wall clock), next 90 days.
create or replace function public.public_open_slots(p_photographer_id uuid default null)
returns table (
  id              uuid,
  photographer_id uuid,
  date            date,
  start_time      time,
  end_time        time
)
language sql
stable
security definer set search_path = ''
as $$
  select s.id, s.photographer_id, s.date, s.start_time, s.end_time
  from public.availability_slots s
  join public.photographer_profiles pp on pp.id = s.photographer_id
  where pp.status = 'claimed'
    and pp.has_signed_contract
    and not s.is_booked
    and (p_photographer_id is null or s.photographer_id = p_photographer_id)
    and s.date + s.start_time > (now() at time zone 'America/New_York')
    and s.date <= (now() at time zone 'America/New_York')::date + 90
  order by s.date, s.start_time
  limit 2000
$$;

create or replace function public.public_portfolio(p_photographer_id uuid)
returns table (
  id         uuid,
  image_url  text,
  caption    text,
  sort_order integer
)
language sql
stable
security definer set search_path = ''
as $$
  select ph.id, ph.image_url, ph.caption, ph.sort_order
  from public.portfolio_photos ph
  join public.photographer_profiles pp on pp.id = ph.photographer_id
  where ph.photographer_id = p_photographer_id
    and pp.status = 'claimed'
    and pp.has_signed_contract
  order by ph.sort_order, ph.id
  limit 20
$$;

revoke all on function public.public_photographers(uuid) from public, anon, authenticated;
revoke all on function public.public_open_slots(uuid) from public, anon, authenticated;
revoke all on function public.public_portfolio(uuid) from public, anon, authenticated;
grant execute on function public.public_photographers(uuid) to anon, authenticated;
grant execute on function public.public_open_slots(uuid) to anon, authenticated;
grant execute on function public.public_portfolio(uuid) to anon, authenticated;
