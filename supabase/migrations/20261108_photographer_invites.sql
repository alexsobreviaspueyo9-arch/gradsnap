-- Concierge invites (2026-11) — idempotent, safe to re-run.
-- Needs 20261107_photographer_profile_drafts.sql first.
--
-- An admin turns a lead that replied into a draft photographer profile with a
-- one-time invite link (/reclamar/<token>, valid 14 days). The photographer
-- signs up or signs in and claims it; the claim is a single transaction that
-- uses the token up and marks the lead 'cuenta_creada'.

alter table public.photographer_profiles
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

-- Same guard as 20261107, plus lead_id is never set from the browser.
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
    new.lead_id := null;
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
    or new.lead_id is distinct from old.lead_id
  then
    raise exception 'Profile status can only change by claiming an invite.';
  end if;
  return new;
end;
$$;

-- What /reclamar/<token> may show before sign-in: the draft's name and
-- whether the link still works. Nothing else about the draft leaks.
create or replace function public.get_photographer_invite(p_token text)
returns table (display_name text, state text)
language sql
stable
security definer set search_path = ''
as $$
  select pp.display_name,
         case when pp.invite_expires_at > now() then 'valid' else 'expired' end
  from public.photographer_profiles pp
  where pp.status = 'draft'
    and pp.invite_token = p_token
    and length(p_token) >= 32
$$;

revoke all on function public.get_photographer_invite(text) from public;
grant execute on function public.get_photographer_invite(text) to anon, authenticated;

-- Claims a draft for the signed-in photographer. If they already have a
-- profile (every email signup gets one), the draft's details fill only its
-- empty fields and the draft is deleted; otherwise the draft becomes theirs.
-- Photos and bio are never part of a draft, so none are copied.
create or replace function public.claim_photographer_invite(p_token text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_draft public.photographer_profiles%rowtype;
  v_own   public.photographer_profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Sign in to claim this profile.';
  end if;

  if not exists (select 1 from public.profiles where id = v_uid and role = 'photographer') then
    raise exception 'This invite is for photographer accounts. Sign in with a photographer account.';
  end if;

  select * into v_draft
  from public.photographer_profiles
  where invite_token = p_token and status = 'draft'
  for update;

  if not found then
    raise exception 'This invite link is not valid or has already been used.';
  end if;
  if v_draft.invite_expires_at is null or v_draft.invite_expires_at <= now() then
    raise exception 'This invite link has expired. Ask GradSnap for a new one.';
  end if;

  select * into v_own from public.photographer_profiles where user_id = v_uid for update;

  if found then
    update public.photographer_profiles
    set display_name  = coalesce(v_own.display_name, v_draft.display_name),
        city          = coalesce(v_own.city, v_draft.city),
        instagram_url = coalesce(v_own.instagram_url, v_draft.instagram_url),
        social_links  = case when v_own.social_links = '[]'::jsonb
                             then v_draft.social_links else v_own.social_links end,
        lead_id       = coalesce(v_own.lead_id, v_draft.lead_id)
    where id = v_own.id;

    delete from public.photographer_profiles where id = v_draft.id;
  else
    update public.photographer_profiles
    set user_id = v_uid,
        status = 'claimed',
        invite_token = null,
        invite_expires_at = null
    where id = v_draft.id;
  end if;

  if v_draft.lead_id is not null then
    update public.leads set estado = 'cuenta_creada' where id = v_draft.lead_id;
  end if;
end;
$$;

revoke all on function public.claim_photographer_invite(text) from public, anon;
grant execute on function public.claim_photographer_invite(text) to authenticated;
