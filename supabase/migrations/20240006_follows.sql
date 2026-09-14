-- フォロー機能
create table if not exists public.follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "Manage own follows"
  on public.follows for all
  using  (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

create policy "View follows"
  on public.follows for select
  using (true);
