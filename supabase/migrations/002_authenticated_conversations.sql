drop function if exists public.save_conversation(uuid, jsonb);

alter table public.conversations
  add column user_id uuid references auth.users(id) on delete cascade;

alter table public.conversations
  alter column user_id set not null;

alter table public.conversations
  drop column workspace_id;

drop table public.chat_workspaces;

create index conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

grant select, insert, update, delete on public.conversations, public.messages to authenticated;

create policy "users manage their conversations"
on public.conversations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users read their messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy "users insert their messages"
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy "users update their messages"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create policy "users delete their messages"
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and conversations.user_id = (select auth.uid())
  )
);

create or replace function public.save_conversation(p_conversation jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid := (p_conversation ->> 'id')::uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.conversations (id, user_id, title, provider_id, model, created_at, updated_at)
  values (
    v_conversation_id,
    v_user_id,
    p_conversation ->> 'title',
    p_conversation ->> 'providerId',
    p_conversation ->> 'model',
    coalesce((p_conversation ->> 'createdAt')::timestamptz, now()),
    coalesce((p_conversation ->> 'updatedAt')::timestamptz, now())
  )
  on conflict (id) do update set
    title = excluded.title,
    provider_id = excluded.provider_id,
    model = excluded.model,
    updated_at = excluded.updated_at
  where public.conversations.user_id = v_user_id;

  if not found then
    raise exception 'Conversation does not belong to this user';
  end if;

  delete from public.messages
  where conversation_id = v_conversation_id
    and id not in (
      select (message ->> 'id')::uuid
      from jsonb_array_elements(coalesce(p_conversation -> 'messages', '[]'::jsonb)) message
    );

  insert into public.messages (id, conversation_id, position, role, content, status, created_at)
  select
    (message ->> 'id')::uuid,
    v_conversation_id,
    (ordinality - 1)::integer,
    message ->> 'role',
    message ->> 'content',
    coalesce(message ->> 'status', 'complete'),
    coalesce((message ->> 'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_conversation -> 'messages', '[]'::jsonb))
    with ordinality as entries(message, ordinality)
  on conflict (id) do update set
    position = excluded.position,
    role = excluded.role,
    content = excluded.content,
    status = excluded.status
  where public.messages.conversation_id = v_conversation_id;
end;
$$;

revoke all on function public.save_conversation(jsonb) from public, anon;
grant execute on function public.save_conversation(jsonb) to authenticated;
