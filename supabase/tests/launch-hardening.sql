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
grant usage on schema hardening_test to authenticated, anon;

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

-- Act as a signed-out visitor (PostgREST 'anon').
create function hardening_test.act_as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

-- Reading must be refused or return nothing.
create function hardening_test.expect_nothing(p_label text, p_sql text) returns void
language plpgsql as $$
declare
  v_count bigint;
begin
  begin
    execute format('select count(*) from (%s) q', p_sql) into v_count;
  exception when others then
    raise notice 'ok (blocked): %  [%]', p_label, sqlerrm;
    return;
  end;
  if v_count > 0 then
    raise exception 'FAIL: % returned % rows but should return none', p_label, v_count;
  end if;
  raise notice 'ok (empty): %', p_label;
end $$;

create function hardening_test.expect_rows(p_label text, p_sql text) returns void
language plpgsql as $$
declare
  v_count bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into v_count;
  if v_count = 0 then
    raise exception 'FAIL: % returned no rows', p_label;
  end if;
  raise notice 'ok (rows): %', p_label;
end $$;

-- A write that must be refused or change no rows (p_sql ends in RETURNING).
create function hardening_test.expect_unchanged(p_label text, p_sql text) returns void
language plpgsql as $$
declare
  v_count bigint;
begin
  begin
    execute format('with u as (%s) select count(*) from u', p_sql) into v_count;
  exception when others then
    raise notice 'ok (blocked): %  [%]', p_label, sqlerrm;
    return;
  end;
  if v_count > 0 then
    raise exception 'FAIL: % changed % rows but should change none', p_label, v_count;
  end if;
  raise notice 'ok (no rows changed): %', p_label;
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
  gen_random_uuid() as started_slot,
  gen_random_uuid() as ref_slot,
  gen_random_uuid() as wrong_ref_slot,
  gen_random_uuid() as package_slot;
grant select on hardening_test.t_ids to authenticated, anon;
grant execute on all functions in schema hardening_test to authenticated, anon;

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
  (t.ref_slot,       current_date + 9,  time '10:00'),
  (t.wrong_ref_slot, current_date + 10, time '10:00'),
  (t.package_slot,   current_date + 11, time '10:00'),
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

select hardening_test.expect_ok('client books through the photographer''s personal link',
  format('select public.book_slot(%L, (select ref_code from public.photographer_profiles where user_id = %L))',
         ref_slot, photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('client books with a code that is not this photographer''s',
  format('select public.book_slot(%L, %L)', wrong_ref_slot, 'not-a-real-code'))
from hardening_test.t_ids;

select hardening_test.expect_error('client asks the server for booking email data',
  'select * from public.claim_booking_email(gen_random_uuid(), ''client_booked'')');

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

select hardening_test.expect_error('photographer rewrites where a booking came from',
  format('update public.bookings set source = ''photographer_link'' where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer marks a booking email as sent',
  format('update public.bookings set client_confirmed_notified_at = now() where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer changes its personal link code',
  format('update public.photographer_profiles set ref_code = ''mine12345'' where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer adds three packages',
  format('insert into public.photographer_packages (photographer_id, name, duration_minutes, included_photos, delivery_days, price, sort_order)
          select pp.id, ''Pkg '' || n, 60, 30, 14, 100 * n, n
          from public.photographer_profiles pp, generate_series(1, 3) n where pp.user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer adds a fourth package',
  format('insert into public.photographer_packages (photographer_id, name, duration_minutes, included_photos, delivery_days, price)
          select pp.id, ''Too many'', 60, 30, 14, 400 from public.photographer_profiles pp where pp.user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer forges the response time',
  format('update public.bookings set responded_at = now() - interval ''1 day'' where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer changes the booked package price',
  format('update public.bookings set package_price = 1 where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer completes the link booking and marks it delivered',
  format('update public.bookings set status = ''completed'', delivered_at = now() where slot_id = %L', ref_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer writes a review',
  format('insert into public.reviews (booking_id, photographer_id, client_id, rating)
          select b.id, s.photographer_id, b.client_id, 5 from public.bookings b
          join public.availability_slots s on s.id = b.slot_id where b.slot_id = %L', ref_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer marks a booking as expired',
  format('update public.bookings set expired_at = now() where slot_id = %L', open_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('photographer creates a private calendar link',
  'select public.reset_calendar_feed()');

select hardening_test.expect_error('photographer reads bookings through the feed function',
  'select * from public.calendar_feed_events(repeat(''a'', 64))');

select hardening_test.expect_ok('photographer saves a message template',
  format('insert into public.message_templates (user_id, title, body) values (%L, ''Hi'', ''Thanks for booking!'')', photographer_uid))
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

select hardening_test.expect_error('photographer sets its terms version directly',
  format('update public.photographer_profiles set terms_version = ''2099-01-01'' where user_id = %L', photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('photographer accepts a future terms version',
  'select public.accept_photographer_terms(''2099-01-01'')');

select hardening_test.expect_ok('photographer accepts the current terms version',
  'select public.accept_photographer_terms(public.photographer_terms_version())');

-- Another photographer's acceptance: RLS leaves those rows untouchable.
do $$
declare
  v_count bigint;
begin
  with u as (
    update public.photographer_profiles set terms_accepted_at = now()
    where user_id is distinct from auth.uid() returning id
  )
  select count(*) into v_count from u;
  if v_count > 0 then
    raise exception 'FAIL: photographer changed % other profiles'' terms acceptance', v_count;
  end if;
  raise notice 'ok (no rows changed): photographer sets another photographer''s terms acceptance';
exception when raise_exception then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'ok (blocked): photographer sets another photographer''s terms acceptance  [%]', sqlerrm;
end $$;

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

-- The client again: packages, reviews, favorites
select hardening_test.act_as(client_uid, 'hardening-client@test.invalid') from hardening_test.t_ids;

select hardening_test.expect_error('client books with a package from nobody',
  format('select public.book_slot(%L, null, gen_random_uuid())', package_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('client books one of the photographer''s packages',
  format('select public.book_slot(%L, null, (select pk.id from public.photographer_packages pk
          join public.photographer_profiles pp on pp.id = pk.photographer_id
          where pp.user_id = %L order by pk.sort_order limit 1))', package_slot, photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('client reviews a session that is not completed',
  format('select public.submit_review((select id from public.bookings where slot_id = %L), 5, ''Great'')', package_slot))
from hardening_test.t_ids;

select hardening_test.expect_ok('client reviews a completed session',
  format('select public.submit_review((select id from public.bookings where slot_id = %L), 5, ''Great session'')', ref_slot))
from hardening_test.t_ids;

select hardening_test.expect_error('client reviews the same session twice',
  format('select public.submit_review((select id from public.bookings where slot_id = %L), 1, ''Again'')', ref_slot))
from hardening_test.t_ids;

select hardening_test.expect_unchanged('client edits a review afterwards',
  'update public.reviews set rating = 1 returning id');

select hardening_test.expect_error('client removes a review through the admin function',
  'select public.remove_review(gen_random_uuid(), ''abuse'', ''x@test.invalid'')');

select hardening_test.expect_ok('client saves a photographer',
  format('insert into public.favorites (user_id, photographer_id)
          select %L, pp.id from public.photographer_profiles pp where pp.user_id = %L', client_uid, photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_error('client saves a favorite for someone else',
  format('insert into public.favorites (user_id, photographer_id)
          select %L, pp.id from public.photographer_profiles pp where pp.user_id = %L', photographer_uid, photographer_uid))
from hardening_test.t_ids;

select hardening_test.expect_nothing('client reads the photographer''s calendar link',
  'select token from public.photographer_calendar_feeds');
select hardening_test.expect_nothing('client reads the photographer''s templates',
  'select body from public.message_templates');
select hardening_test.expect_error('client saves a template for someone else',
  format('insert into public.message_templates (user_id, title, body) values (%L, ''x'', ''y'')', photographer_uid))
from hardening_test.t_ids;
select hardening_test.expect_error('client resets a calendar link (not a photographer)',
  'select public.reset_calendar_feed()');

select hardening_test.expect_unchanged('client edits a photographer''s package',
  'update public.photographer_packages set price = 1 returning id');

-- As a signed-out visitor (guest browsing). A contracted draft profile must
-- never be listed.
select hardening_test.act_as_admin();
insert into public.photographer_profiles (user_id, status, display_name, has_signed_contract, payment_link)
values (null, 'draft', 'Hardening Draft', true, 'https://paypal.me/draft');

select hardening_test.act_as_anon();

select hardening_test.expect_nothing('anon reads photographer_profiles directly (payment link)',
  'select payment_link from public.photographer_profiles');
select hardening_test.expect_nothing('anon reads profiles (emails)', 'select email from public.profiles');
select hardening_test.expect_nothing('anon reads bookings', 'select id from public.bookings');
select hardening_test.expect_nothing('anon reads booking_messages', 'select body from public.booking_messages');
select hardening_test.expect_nothing('anon reads conversations', 'select id from public.conversations');
select hardening_test.expect_nothing('anon reads leads', 'select id from public.leads');
select hardening_test.expect_nothing('anon reads availability_slots directly', 'select id from public.availability_slots');
select hardening_test.expect_nothing('anon reads portfolio_photos directly', 'select id from public.portfolio_photos');
select hardening_test.expect_nothing('anon reads packages directly', 'select id from public.photographer_packages');
select hardening_test.expect_nothing('anon reads reviews directly', 'select id from public.reviews');
select hardening_test.expect_nothing('anon reads favorites', 'select user_id from public.favorites');
select hardening_test.expect_nothing('anon reads the moderation log', 'select id from public.review_moderation_log');
select hardening_test.expect_nothing('anon reads calendar links', 'select token from public.photographer_calendar_feeds');
select hardening_test.expect_nothing('anon reads message templates', 'select body from public.message_templates');
select hardening_test.expect_ok('anon can trigger the (fixed) expiry sweep', 'select public.expire_stale_bookings()');

select hardening_test.expect_error('anon books a slot',
  format('select public.book_slot(%L)', second_slot))
from hardening_test.t_ids;
select hardening_test.expect_error('anon inserts a booking',
  format('insert into public.bookings (slot_id, client_id, status) values (%L, %L, ''pending'')', second_slot, client_uid))
from hardening_test.t_ids;
do $$
declare
  v_count bigint;
begin
  with u as (update public.photographer_profiles set display_name = 'x' returning id)
  select count(*) into v_count from u;
  if v_count > 0 then
    raise exception 'FAIL: anon updated % photographer profiles', v_count;
  end if;
  raise notice 'ok (no rows changed): anon edits a photographer profile';
exception when insufficient_privilege then
  raise notice 'ok (blocked): anon edits a photographer profile';
end $$;
select hardening_test.expect_error('anon signs the contract', 'select public.sign_photographer_contract()');
select hardening_test.expect_error('anon asks the server for booking email data',
  'select * from public.claim_booking_email(gen_random_uuid(), ''client_booked'')');
select hardening_test.expect_error('anon starts a conversation',
  'select public.start_conversation(gen_random_uuid())');
select hardening_test.expect_error('anon asks for payment link through the public function',
  'select payment_link from public.public_photographers()');
select hardening_test.expect_error('anon asks for an invite token through the public function',
  'select invite_token from public.public_photographers()');

select hardening_test.expect_rows('anon lists the contracted photographer',
  format('select 1 from public.public_photographers() p join public.public_open_slots() s on s.photographer_id = p.id where s.id = %L', second_slot))
from hardening_test.t_ids;
select hardening_test.expect_nothing('anon never sees a draft profile',
  'select 1 from public.public_photographers() where display_name = ''Hardening Draft''');
select hardening_test.expect_rows('anon sees an open upcoming slot',
  format('select 1 from public.public_open_slots() where id = %L', second_slot))
from hardening_test.t_ids;
select hardening_test.expect_rows('anon sees the photographer''s packages',
  format('select 1 from public.public_packages((select photographer_id from public.public_open_slots() where id = %L))', second_slot))
from hardening_test.t_ids;
select hardening_test.expect_rows('anon sees the review on the profile',
  format('select 1 from public.public_reviews((select photographer_id from public.public_open_slots() where id = %L))', second_slot))
from hardening_test.t_ids;
select hardening_test.expect_error('anon asks for reminder bookings', 'select * from public.due_booking_reminders(''reminder_day'')');
select hardening_test.expect_nothing('anon never sees past or started slots',
  format('select 1 from public.public_open_slots() where id in (%L, %L)', past_slot, started_slot))
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
  if (select b.source from public.bookings b join hardening_test.t_ids t on b.slot_id = t.ref_slot)
     is distinct from 'photographer_link' then
    raise exception 'FAIL: a booking through the personal link was not marked photographer_link';
  end if;
  if (select b.source from public.bookings b join hardening_test.t_ids t on b.slot_id = t.wrong_ref_slot)
     is distinct from 'marketplace' then
    raise exception 'FAIL: a wrong ref code was trusted';
  end if;
  if (select b.source from public.bookings b join hardening_test.t_ids t on b.slot_id = t.open_slot)
     is distinct from 'marketplace' then
    raise exception 'FAIL: a booking without a code was not marked marketplace';
  end if;
  if not exists (
    select 1 from public.photographer_profiles pp join hardening_test.t_ids t on pp.user_id = t.photographer_uid
    where pp.terms_version = public.photographer_terms_version() and pp.terms_accepted_at is not null
  ) then
    raise exception 'FAIL: accept_photographer_terms() did not record the version';
  end if;
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
