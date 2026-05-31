create table if not exists public.todo_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  templates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_data enable row level security;

drop policy if exists "todo_data_select_own" on public.todo_data;
create policy "todo_data_select_own"
on public.todo_data
for select
using (auth.uid() = user_id);

drop policy if exists "todo_data_insert_own" on public.todo_data;
create policy "todo_data_insert_own"
on public.todo_data
for insert
with check (auth.uid() = user_id);

drop policy if exists "todo_data_update_own" on public.todo_data;
create policy "todo_data_update_own"
on public.todo_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "todo_data_delete_own" on public.todo_data;
create policy "todo_data_delete_own"
on public.todo_data
for delete
using (auth.uid() = user_id);
