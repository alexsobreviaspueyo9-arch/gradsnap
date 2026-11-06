-- Photographer recruitment, phase 1 (2026-11) — idempotent, safe to re-run.
-- Run in the Supabase SQL Editor of the project in .env.local.

-- ─────────────────────────────────────────────
-- 1. leads: photographers found for outreach. Admin-only.
-- RLS is on with NO policies, so anon/authenticated can never read or write
-- it; /admin/leads checks ADMIN_EMAILS on the server and then uses the
-- service-role client, which bypasses RLS.
-- ─────────────────────────────────────────────

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null,
  instagram_handle  text,
  website           text,
  contact_email     text,
  zona              text,
  fuente            text,
  prioridad         text not null default 'B' check (prioridad in ('A', 'B', 'C')),
  motivo_encaje     text,
  estado            text not null default 'encontrado' check (estado in (
                      'encontrado', 'contactado', 'respondio',
                      'cuenta_creada', 'perfil_completo', 'no_contactar')),
  borrador_mensaje  text,
  notas             text,
  created_at        timestamptz not null default now(),
  contacted_at      timestamptz
);

-- One lead per website and per Instagram handle (case-insensitive);
-- leads without one of them don't collide.
create unique index if not exists leads_website_unique
  on public.leads (lower(website)) where website is not null;
create unique index if not exists leads_instagram_handle_unique
  on public.leads (lower(instagram_handle)) where instagram_handle is not null;

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. Where a signup came from (/fotografos?src=...).
-- ─────────────────────────────────────────────

alter table public.profiles
  add column if not exists signup_src text
    check (signup_src in ('instagram', 'email', 'web', 'referido'));

-- Same as the current handle_new_user() in schema.sql, plus signup_src from
-- the signup metadata (unknown values are dropped, never rejected).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role text;
  v_src  text;
begin
  v_role := new.raw_user_meta_data ->> 'role';
  v_src  := new.raw_user_meta_data ->> 'signup_src';
  if v_src not in ('instagram', 'email', 'web', 'referido') then
    v_src := null;
  end if;

  if v_role is not null then
    insert into public.profiles (id, role, full_name, email, signup_src)
    values (
      new.id,
      v_role,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email,
      v_src
    );

    if v_role = 'photographer' then
      insert into public.photographer_profiles (user_id)
      values (new.id);
    end if;
  end if;

  return new;
end;
$$;
