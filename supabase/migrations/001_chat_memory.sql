create extension if not exists pgcrypto;

create table public.chat_workspaces (
  id uuid primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key,
  workspace_id uuid not null references public.chat_workspaces(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 200),
  provider_id text not null check (char_length(provider_id) between 1 and 100),
  model text not null check (char_length(model) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.messages (
  id uuid primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  position integer not null check (position >= 0),
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null check (char_length(content) <= 100000),
  status text not null default 'complete' check (status in ('streaming', 'complete', 'error', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (conversation_id, position)
);

create index conversations_workspace_updated_idx on public.conversations (workspace_id, updated_at desc);
create index messages_conversation_position_idx on public.messages (conversation_id, position);

alter table public.chat_workspaces enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.chat_workspaces, public.conversations, public.messages from anon, authenticated;

create or replace function public.save_conversation(p_workspace_id uuid, p_conversation jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conversation_id uuid := (p_conversation ->> 'id')::uuid;
begin
  insert into public.chat_workspaces (id, last_seen_at)
  values (p_workspace_id, now())
  on conflict (id) do update set last_seen_at = excluded.last_seen_at;

  insert into public.conversations (id, workspace_id, title, provider_id, model, created_at, updated_at)
  values (
    v_conversation_id,
    p_workspace_id,
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
  where public.conversations.workspace_id = p_workspace_id;

  if not found then
    raise exception 'Conversation does not belong to this workspace';
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

revoke all on function public.save_conversation(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_conversation(uuid, jsonb) to service_role;
