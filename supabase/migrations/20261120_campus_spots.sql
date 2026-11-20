-- ─────────────────────────────────────────────
-- CAMPUS PHOTO SPOTS (2026-11) — idempotent. Run after 20261120_client_ux.sql.
-- Photographers list the spots they shoot at (ids from
-- src/lib/campus-spots.ts); the public cards return them for the
-- "Pick a spot" filter and map pins.
-- ─────────────────────────────────────────────

alter table public.photographer_profiles
  add column if not exists photo_spots text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photographer_profiles_photo_spots_check') then
    alter table public.photographer_profiles
      add constraint photographer_profiles_photo_spots_check check (
        cardinality(photo_spots) <= 12
        and array_to_string(photo_spots, ',') ~ '^([a-z0-9-]{1,40}(,|$))*$'
      );
  end if;
end $$;

-- Same as 20261120_client_ux plus photo_spots (return type changes, so the
-- function is dropped and created again).
drop function if exists public.public_photographer_cards();

create function public.public_photographer_cards()
returns table (
  photographer_id   uuid,
  cover_image_url   text,
  rating_avg        numeric,
  review_count      integer,
  response_hours    numeric,
  min_package_price numeric,
  photo_spots       text[]
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
    (select min(pk.price) from public.photographer_packages pk where pk.photographer_id = pp.id),
    pp.photo_spots
  from public.photographer_profiles pp
  where pp.status = 'claimed' and pp.has_signed_contract
  limit 200
$$;

revoke all on function public.public_photographer_cards() from public, anon, authenticated;
grant execute on function public.public_photographer_cards() to anon, authenticated;
