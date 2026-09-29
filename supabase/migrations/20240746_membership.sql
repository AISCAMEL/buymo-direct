-- ============================================================
-- 有料会員の申込・承認
--   - membership_applications: ユーザーの有料会員申込
--   - 承認で profiles.member_tier = 'paid'（本部が承認）。決済は将来接続。
-- ============================================================

create table if not exists public.membership_applications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  plan       text not null default 'standard',
  status     text not null default 'pending', -- pending|approved|rejected|cancelled
  note       text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists membership_apps_user_idx   on public.membership_applications(user_id, created_at desc);
create index if not exists membership_apps_status_idx on public.membership_applications(status, created_at desc);
alter table public.membership_applications enable row level security;

create policy "membership_apps_own_read"   on public.membership_applications for select using (auth.uid() = user_id);
create policy "membership_apps_own_insert" on public.membership_applications for insert with check (auth.uid() = user_id);
create policy "membership_apps_admin_all"  on public.membership_applications for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
