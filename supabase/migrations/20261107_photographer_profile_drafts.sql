-- Concierge drafts (2026-11) — idempotent, safe to re-run.
-- An admin creates a photographer profile in 'draft' (no account yet) with a
-- one-time invite_token; the photographer claims it and it becomes 'claimed'.
-- Existing profiles are all 'claimed'.

alter table public.photographer_profiles
  add column if not exists status text not null default 'claimed'
    check (status in ('draft', 'claimed')),
  add column if not exists invite_token text unique,
  add column if not exists invite_expires_at timestamptz;

-- A draft has no owner yet; a claimed profile always has one.
alter table public.photographer_profiles alter column user_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photographer_profiles_owner_matches_status'
  ) then
    alter table public.photographer_profiles
      add constraint photographer_profiles_owner_matches_status
      check ((status = 'draft') = (user_id is null));
  end if;
end $$;

-- Drafts (and their invite tokens) are never readable from the browser,
-- except a profile by its own owner.
drop policy if exists "Anyone authenticated can view photographer profiles"
  on public.photographer_profiles;
create policy "Anyone authenticated can view photographer profiles"
  on public.photographer_profiles for select to authenticated
  using (status = 'claimed' or user_id = auth.uid());

-- Same guard as in schema.sql, plus: the browser can never create a draft
-- or change status / invite fields. Drafts are created by the admin
-- (service role) and claimed only through a security-definer function.
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
    new.status := 'claimed';
    new.invite_token := null;
    new.invite_expires_at := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.has_signed_contract is distinct from old.has_signed_contract
    or new.contract_signed_at is distinct from old.contract_signed_at
  then
    raise exception 'The contract can only be signed from the onboarding page.';
  end if;
  if new.status is distinct from old.status
    or new.invite_token is distinct from old.invite_token
    or new.invite_expires_at is distinct from old.invite_expires_at
  then
    raise exception 'Profile status can only change by claiming an invite.';
  end if;
  return new;
end;
$$;
