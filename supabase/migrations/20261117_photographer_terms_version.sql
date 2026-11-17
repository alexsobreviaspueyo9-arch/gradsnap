-- ─────────────────────────────────────────────
-- PHOTOGRAPHER TERMS, VERSIONED (2026-11) — idempotent.
-- The "contract" becomes versioned click-wrap terms. Accepting records the
-- version and when; the dashboard requires the CURRENT version, so bumping
-- photographer_terms_version() (and PHOTOGRAPHER_TERMS_VERSION in
-- src/lib/photographer-terms.ts, same value) asks everyone to accept again.
-- has_signed_contract keeps meaning "accepted some version" (listing gate).
-- Existing photographers have no terms_version yet, so they re-accept.
-- ─────────────────────────────────────────────

alter table public.photographer_profiles
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.photographer_terms_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select '2026-11-17'::text
$$;

-- Same guard as 20261108, plus the terms fields are never set from the browser.
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
  return new;
end;
$$;

-- The only way to accept: your own profile, the current version only.
create or replace function public.accept_photographer_terms(p_version text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;
  if p_version is distinct from public.photographer_terms_version() then
    raise exception 'These terms are out of date. Reload the page and try again.';
  end if;

  update public.photographer_profiles pp
  set has_signed_contract = true,
      contract_signed_at = coalesce(pp.contract_signed_at, now()),
      terms_version = p_version,
      terms_accepted_at = now()
  from public.profiles p
  where pp.user_id = auth.uid()
    and p.id = pp.user_id
    and p.role = 'photographer';

  if not found then
    raise exception 'No photographer profile found for this account.';
  end if;
end;
$$;

-- Kept working for old callers: accepts the current version.
create or replace function public.sign_photographer_contract()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.accept_photographer_terms(public.photographer_terms_version());
end;
$$;

revoke all on function public.photographer_terms_version() from public, anon;
revoke all on function public.accept_photographer_terms(text) from public, anon, authenticated;
revoke all on function public.sign_photographer_contract() from public, anon;
grant execute on function public.photographer_terms_version() to authenticated;
grant execute on function public.accept_photographer_terms(text) to authenticated;
grant execute on function public.sign_photographer_contract() to authenticated;
