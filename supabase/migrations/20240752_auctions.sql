-- ============================================================
-- オークション出品 と 決算書（成約手数料の算出）
--   - 出品料：1台ごと（例 ¥10,000）
--   - 決算書：落札額 − 仕入れ原価 − 諸経費 = 利益
--   - 成約手数料：利益 × 3%（本部設定 dealCommissionRate）
-- ============================================================

create table if not exists public.auction_listings (
  id           uuid primary key default gen_random_uuid(),
  dealer_id    uuid not null references public.dealers(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  car_name     text not null,
  maker        text,
  model_year   integer,
  mileage      integer,
  reserve_price integer,                              -- 希望落札価格（任意）
  listing_fee  integer not null default 0,            -- 出品料（スナップショット）
  status       text not null default 'listed',        -- listed|sold|unsold|cancelled|settled
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists auction_listings_dealer_idx on public.auction_listings(dealer_id, created_at desc);
alter table public.auction_listings enable row level security;

create table if not exists public.auction_settlements (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.auction_listings(id) on delete cascade unique,
  dealer_id       uuid not null references public.dealers(id) on delete cascade,
  sale_price      integer not null default 0,         -- 落札額
  purchase_cost   integer not null default 0,         -- 仕入れ原価
  expenses        integer not null default 0,         -- 諸経費（陸送・整備など）
  listing_fee     integer not null default 0,         -- 出品料
  profit          integer not null default 0,         -- 利益 = sale - cost - expenses
  commission_rate numeric  not null default 0.03,      -- 成約手数料率
  commission      integer not null default 0,         -- 成約手数料 = max(0,利益) × 率
  total_due       integer not null default 0,         -- 本部への支払い = 出品料 + 成約手数料
  status          text not null default 'finalized',  -- draft|finalized|invoiced|paid
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.auction_settlements enable row level security;

-- 閲覧：加盟店オーナー/スタッフ、本部。書き込みはサーバー(service role)経由。
drop policy if exists "auction_listings_owner_read" on public.auction_listings;
create policy "auction_listings_owner_read" on public.auction_listings for select using (
  exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.dealer_id = dealer_id and s.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "auction_listings_admin_all" on public.auction_listings;
create policy "auction_listings_admin_all" on public.auction_listings for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "auction_settlements_owner_read" on public.auction_settlements;
create policy "auction_settlements_owner_read" on public.auction_settlements for select using (
  exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.dealer_id = dealer_id and s.user_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "auction_settlements_admin_all" on public.auction_settlements;
create policy "auction_settlements_admin_all" on public.auction_settlements for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
