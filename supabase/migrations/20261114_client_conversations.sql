-- ─────────────────────────────────────────────
-- CLIENT-STARTED CONVERSATIONS + MESSAGE EMAILS (2026-11) — idempotent.
-- One conversation per client + photographer pair. Only clients start one
-- (start_conversation RPC); photographers can only reply. Booking threads
-- that already have messages become the pair's conversation and keep working.
-- Messages stay in booking_messages, now keyed by conversation_id.
-- ─────────────────────────────────────────────

create table if not exists public.conversations (
  id                            uuid primary key default gen_random_uuid(),
  client_id                     uuid not null references public.profiles(id) on delete cascade,
  photographer_id               uuid not null references public.photographer_profiles(id) on delete cascade,
  -- null = carried over from a booking chat (before clients started chats)
  created_by                    uuid references public.profiles(id) on delete set null,
  created_at                    timestamptz not null default now(),
  client_last_read_at           timestamptz,
  photographer_last_read_at     timestamptz,
  client_last_notified_at       timestamptz,
  photographer_last_notified_at timestamptz,
  constraint conversations_pair_key unique (client_id, photographer_id),
  constraint conversations_started_by_client check (created_by is null or created_by = client_id)
);

-- No insert/update/delete policies: rows are created only by
-- start_conversation() and changed only by the functions below.
alter table public.conversations enable row level security;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.photographer_profiles pp on pp.id = c.photographer_id
    where c.id = p_conversation_id
      and auth.uid() in (c.client_id, pp.user_id)
  )
$$;

revoke all on function public.is_conversation_member(uuid) from public, anon, authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;

drop policy if exists "Members read their conversations" on public.conversations;
create policy "Members read their conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

-- Messages now belong to a conversation; booking_id stays for old rows only.
alter table public.booking_messages
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.booking_messages alter column booking_id drop not null;
create index if not exists booking_messages_conversation_created_idx
  on public.booking_messages (conversation_id, created_at);

-- Backfill: every booking thread with messages becomes (or joins) its pair's
-- conversation. Empty booking threads are not carried over.
insert into public.conversations (client_id, photographer_id, created_by, created_at)
select b.client_id, s.photographer_id, null, min(m.created_at)
from public.booking_messages m
join public.bookings b on b.id = m.booking_id
join public.availability_slots s on s.id = b.slot_id
where m.conversation_id is null
group by b.client_id, s.photographer_id
on conflict (client_id, photographer_id) do nothing;

update public.booking_messages m
set conversation_id = c.id
from public.bookings b
join public.availability_slots s on s.id = b.slot_id
join public.conversations c
  on c.client_id = b.client_id and c.photographer_id = s.photographer_id
where m.booking_id = b.id
  and m.conversation_id is null;

alter table public.booking_messages alter column conversation_id set not null;

drop policy if exists "Booking participants read their chat" on public.booking_messages;
drop policy if exists "Booking participants send messages" on public.booking_messages;
drop policy if exists "Conversation members read messages" on public.booking_messages;
drop policy if exists "Conversation members send messages" on public.booking_messages;

create policy "Conversation members read messages"
  on public.booking_messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

-- A photographer can only write into a conversation a client already started
-- (conversations can't be created any other way).
create policy "Conversation members send messages"
  on public.booking_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and booking_id is null
    and public.is_conversation_member(conversation_id)
  );

-- Photographers see the name of clients who message them.
drop policy if exists "Photographers can read profiles of clients they chat with" on public.profiles;
create policy "Photographers can read profiles of clients they chat with"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.photographer_profiles pp on pp.id = c.photographer_id
      where c.client_id = profiles.id
        and pp.user_id = auth.uid()
    )
  );

-- The only way to create a conversation: the signed-in user must be a client,
-- the photographer must be listed. Returns the existing one if there is one.
create or replace function public.start_conversation(p_photographer_id uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'client'
  ) then
    raise exception 'Only clients can start a conversation.';
  end if;

  if not exists (
    select 1 from public.photographer_profiles
    where id = p_photographer_id and status = 'claimed' and has_signed_contract
  ) then
    raise exception 'Photographer not found.';
  end if;

  insert into public.conversations (client_id, photographer_id, created_by, client_last_read_at)
  values (auth.uid(), p_photographer_id, auth.uid(), now())
  on conflict (client_id, photographer_id) do nothing;

  select id into v_id
  from public.conversations
  where client_id = auth.uid() and photographer_id = p_photographer_id;
  return v_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon, authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.conversations
  set client_last_read_at = now()
  where id = p_conversation_id and client_id = auth.uid();

  update public.conversations c
  set photographer_last_read_at = now()
  from public.photographer_profiles pp
  where c.id = p_conversation_id
    and pp.id = c.photographer_id
    and pp.user_id = auth.uid();
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Server only (service role). Decides whether the other member of the
-- conversation gets an email for this message: not if they already read the
-- latest message, and at most once per 30 minutes per conversation and
-- recipient. Claims the slot atomically and returns who to email.
create or replace function public.claim_message_notification(p_message_id uuid, p_sender_id uuid)
returns table (
  recipient_email text,
  recipient_name  text,
  recipient_role  text,
  sender_name     text,
  conversation_id uuid
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_message      public.booking_messages;
  v_conversation public.conversations;
  v_photographer public.photographer_profiles;
  v_to_client    boolean;
  v_recipient    uuid;
  v_latest       timestamptz;
begin
  select * into v_message
  from public.booking_messages
  where id = p_message_id and sender_id = p_sender_id;
  if not found then
    return;
  end if;

  select * into v_conversation
  from public.conversations
  where id = v_message.conversation_id
  for update;

  select * into v_photographer
  from public.photographer_profiles
  where id = v_conversation.photographer_id;

  select max(created_at) into v_latest
  from public.booking_messages
  where booking_messages.conversation_id = v_conversation.id;

  v_to_client := v_message.sender_id <> v_conversation.client_id;

  if v_to_client then
    if v_conversation.client_last_read_at >= v_latest
       or v_conversation.client_last_notified_at > now() - interval '30 minutes' then
      return;
    end if;
    update public.conversations set client_last_notified_at = now() where id = v_conversation.id;
    v_recipient := v_conversation.client_id;
  else
    if v_photographer.user_id is null
       or v_conversation.photographer_last_read_at >= v_latest
       or v_conversation.photographer_last_notified_at > now() - interval '30 minutes' then
      return;
    end if;
    update public.conversations set photographer_last_notified_at = now() where id = v_conversation.id;
    v_recipient := v_photographer.user_id;
  end if;

  return query
  select
    r.email,
    r.full_name,
    case when v_to_client then 'client' else 'photographer' end,
    coalesce(nullif(s.full_name, ''), case when v_to_client then v_photographer.display_name end),
    v_conversation.id
  from public.profiles r, public.profiles s
  where r.id = v_recipient and s.id = v_message.sender_id;
end;
$$;

revoke all on function public.claim_message_notification(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_message_notification(uuid, uuid) to service_role;
