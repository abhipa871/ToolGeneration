create table public.user_api_credentials (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai')),
  encrypted_key text not null check (char_length(encrypted_key) between 16 and 2048),
  encryption_iv text not null check (char_length(encryption_iv) between 16 and 64),
  auth_tag text not null check (char_length(auth_tag) between 16 and 64),
  key_version text not null check (char_length(key_version) between 1 and 40),
  key_hint text not null check (char_length(key_hint) between 4 and 24),
  validated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table public.api_credential_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai')),
  event_type text not null check (event_type in ('created', 'rotated', 'deleted', 'validation_failed', 'used')),
  created_at timestamptz not null default now()
);

create index api_credential_events_user_created_idx
  on public.api_credential_events (user_id, created_at desc);

alter table public.user_api_credentials enable row level security;
alter table public.api_credential_events enable row level security;

revoke all on public.user_api_credentials, public.api_credential_events from public, anon, authenticated;
grant select, insert, update, delete on public.user_api_credentials, public.api_credential_events to service_role;
grant usage, select on sequence public.api_credential_events_id_seq to service_role;

comment on table public.user_api_credentials is
  'Server-only encrypted BYOK credentials. Never expose this table through browser clients.';
comment on column public.user_api_credentials.encrypted_key is
  'AES-256-GCM ciphertext encoded as base64; never plaintext.';

