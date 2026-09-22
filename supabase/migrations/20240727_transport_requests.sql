-- 陸送のお申し込み（ZERO手配前提）
create table if not exists public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  from_pref text,
  to_pref text,
  car_size text,
  est_low integer,
  est_high integer,
  preferred_date text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  notes text,
  status text not null default 'pending' check (status in ('pending','arranged','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_transport_status on public.transport_requests(status, created_at desc);

alter table public.transport_requests enable row level security;

-- 保存は service role（APIサーバー）経由のみ。閲覧・更新は管理者。
create policy "transport_admin_all" on public.transport_requests
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
