-- ============================================================
-- 買取加盟（フランチャイズ）の申込と加盟金請求
--   - 加盟金は単発請求(invoice/銀行振込) または クレジット(card)
--   - クレジットの場合のみ Square 手数料 3.6% を上乗せして提示
--   - 加盟後の月会費(¥33,000)は別（有料会員=member_tier paid、手数料上乗せなし）
-- ============================================================

create table if not exists public.franchise_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  company_name   text,
  contact_name   text,
  phone          text,
  prefecture     text,
  payment_method text not null default 'invoice',  -- invoice | card
  joining_fee    integer not null default 0,        -- 加盟金（税込・本体, 例 550000）
  surcharge      integer not null default 0,        -- カード手数料上乗せ（card時のみ）
  total          integer not null default 0,        -- 請求総額
  status         text not null default 'pending',   -- pending|invoiced|paid|approved|rejected|cancelled
  note           text,
  decided_by     uuid,
  decided_at     timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists franchise_apps_user_idx   on public.franchise_applications(user_id, created_at desc);
create index if not exists franchise_apps_status_idx on public.franchise_applications(status, created_at desc);
alter table public.franchise_applications enable row level security;

drop policy if exists "franchise_own_read"   on public.franchise_applications;
create policy "franchise_own_read"   on public.franchise_applications for select using (auth.uid() = user_id);
drop policy if exists "franchise_own_insert" on public.franchise_applications;
create policy "franchise_own_insert" on public.franchise_applications for insert with check (auth.uid() = user_id);
drop policy if exists "franchise_admin_all"  on public.franchise_applications;
create policy "franchise_admin_all"  on public.franchise_applications for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
