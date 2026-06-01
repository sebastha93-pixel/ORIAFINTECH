-- Email connections table (stores Gmail OAuth tokens per user)
create table if not exists public.email_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  gmail_address    text not null,
  access_token     text not null,
  refresh_token    text,
  token_expiry     timestamptz,
  last_sync        timestamptz,
  emails_processed integer not null default 0,
  transactions_created integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint email_connections_user_id_key unique (user_id)
);

alter table public.email_connections enable row level security;

create policy "Users can manage their own email connection"
  on public.email_connections
  for all
  using (auth.uid() = user_id);

-- Add gmail_message_id to transactions for deduplication
alter table public.transactions
  add column if not exists gmail_message_id text;

create unique index if not exists transactions_gmail_message_id_user_idx
  on public.transactions (user_id, gmail_message_id)
  where gmail_message_id is not null;
