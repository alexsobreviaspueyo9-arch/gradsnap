-- Verifies the "LAUNCH HARDENING" section of schema.sql.
-- Paste into the Supabase SQL Editor and run. Everything happens inside one
-- transaction that is rolled back at the end: no test data is left behind.
-- Success = the last result row says 'ALL CHECKS PASSED'.
-- Failure = the editor shows an error starting with 'FAIL:'.

begin;

-- Helpers and fixtures live in a throwaway schema (not temp tables/pg_temp:
-- the Supabase SQL Editor can't see those after switching to the
-- 'authenticated' role). The final rollback removes it again.
create schema hardening_test;
grant usage on schema hardening_test to authenticated;

-- ── helpers ──────────────────────────────────────────────────────────────

-- Act as a signed-in browser user, exactly like a PostgREST request does.
create function hardening_test.act_as(p_uid uuid, p_email text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text,
    true);
  perform set_config('role', 'authenticated', true);
end $$;

create function hardening_test.act_as_admin() returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create function hardening_test.expect_error(p_label text, p_sql text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok (blocked): %  [%]', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % was allowed but should be blocked', p_label;
end $$;

create function hardening_test.expect_ok(p_label text, p_sql text) returns void
language plpgsql as $$
begin
  execute p_sql;
  raise notice 'ok (allowed): %', p_label;
exception when others then
  raise exception 'FAIL: % should work but raised: %', p_label, sqlerrm;
end $$;

-- ── fixtures (as admin) ─────────────────────────────────────────────────

create table hardening_test.t_ids as
select
  gen_random_uuid() as photographer_uid,
  gen_random_uuid() as client_uid,
  gen_random_uuid() as open_slot,
  gen_random_uuid() as second_slot,
  gen_random_uuid() as past_slot,
  gen_random_uuid() as started_slot;
grant select on hardening_test.t_ids to authenticated;
grant execute on all functions in schema hardening_test to authenticated;

insert into auth.users (id, email, aud, role, raw_user_meta_data)
select photographer_uid, 'hardening-photographer@test.invalid', 'authenticated', 'authenticated',
       '{"role":"photographer","full_name":"Test Photographer"}'::jsonb
from hardening_test.t_ids
union all
select client_uid, 'hardening-client@test.invalid', 'authenticated', 'authenticated',
       '{"role":"client","full_name":"Test Client"}'::jsonb
from hardening_test.t_ids;

insert into public.availability_slots (id, photographer_id, date, start_time, end_time)
select s.id, pp.id, s.d, s.t, s.t + interval '1 hour'
from hardening_test.t_ids t
join public.photographer_profiles pp on pp.user_id = t.photographer_uid
cross join lateral (values
  (t.open_slot,    current_date + 7, time '10:00'),
  (t.second_slot,  current_date + 8, time '10:00'),
  (t.past_slot,    current_date - 1, time '10:00'),
  -- today (New York) at 00:00: always already started
  (t.started_slot, (now() at time zone 'America/New_York')::date, time '00:00')
) as s(id, d, t);

-- ── checks ───────────────────────────────────────────────────────────────

-- As the client
select hardening_test.act_as(client_uid, 'hardening-client@test.invalid') from hardening_test.t_ids;

select hardening_test.expect_error('client inserts a booking directly (skipping book_slot)',
  format('insert into public.bookings (slot_id, client_id, status) values (%L, %L, ''confirmed'')',
         open_slot, client_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('client books an open slot via book_slot()',
  format('select public.book_slot(%L)', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('client books the same slot twice',
  format('select public.book_slot(%L)', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('client books a slot in the past',
  format('select public.book_slot(%L)', past_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('client books a slot today that already started',
  format('select public.book_slot(%L)', started_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('client changes own role to photographer',
  format('update public.profiles set role = ''photographer'' where id = %L', client_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('client changes own notification email',
  format('update public.profiles set email = ''someone-else@test.invalid'' where id = %L', client_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('client creates a photographer profile for itself',
  format('insert into public.photographer_profiles (user_id) values (%L)', client_uid))
from hardening_test.t_ids;

-- As the photographer
select hardening_test.act_as(photographer_uid, 'hardening-photographer@test.invalid') from hardening_test.t_ids;

select hardening_test.expect_error('photographer books a slot (not a client account)',
  format('select public.book_slot(%L)', second_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer reassigns a booking to another client',
  format('update public.bookings set client_id = %L where slot_id = %L', photographer_uid, open_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer confirms a booking and marks it paid',
  format('update public.bookings set status = ''confirmed'', payment_status = ''paid'' where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer reopens a slot that still has an active booking',
  format('update public.availability_slots set is_booked = false where id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer marks the contract as signed directly',
  format('update public.photographer_profiles set has_signed_contract = true where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer signs the contract via sign_photographer_contract()',
  'select public.sign_photographer_contract()');

select hardening_test.expect_error('photographer saves a javascript: payment link',
  format('update public.photographer_profiles set payment_link = ''javascript:alert(1)'' where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer saves a javascript: social link',
  format('update public.photographer_profiles set social_links = ''[{"label":"x","url":"javascript:alert(1)"}]'' where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer saves normal https links',
  format('update public.photographer_profiles set payment_link = ''https://paypal.me/test'', social_links = ''[{"label":"Web","url":"https://example.com"}]'' where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer cancels the booking',
  format('update public.bookings set status = ''cancelled'' where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer frees the slot once the booking is cancelled',
  format('update public.availability_slots set is_booked = false where id = %L', open_slot))
from hardening_test.t_ids;

-- Back to admin: confirm the contract really was recorded
select hardening_test.act_as_admin();

do $$
begin
  if not exists (
    select 1 from public.photographer_profiles pp join hardening_test.t_ids t on pp.user_id = t.photographer_uid
    where pp.has_signed_contract and pp.contract_signed_at is not null
  ) then
    raise exception 'FAIL: sign_photographer_contract() did not record the signature';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
