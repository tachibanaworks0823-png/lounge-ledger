-- Lounge Ledger: server-side immutable backup archive
-- Run this entire file once in Supabase SQL Editor.

create table if not exists public.store_data_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  source text not null default 'before_update',
  created_at timestamptz not null default now()
);

create index if not exists store_data_snapshots_user_created_idx
  on public.store_data_snapshots (user_id, created_at desc);

alter table public.store_data_snapshots enable row level security;

drop policy if exists "Users can read own store data snapshots" on public.store_data_snapshots;
create policy "Users can read own store data snapshots"
  on public.store_data_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.archive_store_data_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.store_data_snapshots (user_id, payload, source)
  values (old.user_id, old.payload, 'before_update');
  return new;
end;
$$;

drop trigger if exists archive_store_data_before_update on public.store_data;
create trigger archive_store_data_before_update
before update on public.store_data
for each row
execute function public.archive_store_data_before_update();
