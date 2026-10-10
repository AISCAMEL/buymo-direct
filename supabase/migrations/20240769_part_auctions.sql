-- パーツ・用品のヤフオク形式オークション（C2C・買取保証なし）。
-- 出品者が開始価格・即決価格・終了日時を設定し、買い手が入札。終了時に最高額で落札。

create table if not exists public.part_auctions (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text,
  category          text not null default 'other',     -- wheel|tire|nav|aero|audio|exterior|interior|other
  item_condition    text not null default 'used',       -- new|used
  images            jsonb not null default '[]'::jsonb,  -- 画像URLの配列
  start_price       int  not null default 0,
  buy_now_price     int,                                 -- 即決価格（任意）
  current_price     int  not null default 0,             -- 現在価格（開始価格 or 最高入札額）
  bid_count         int  not null default 0,
  highest_bidder_id uuid references public.profiles(id) on delete set null,
  ends_at           timestamptz not null,
  status            text not null default 'active'       -- active|ended|sold|cancelled
    check (status in ('active','ended','sold','cancelled')),
  winner_id         uuid references public.profiles(id) on delete set null,
  closed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists part_auctions_status_idx on public.part_auctions (status, ends_at);
create index if not exists part_auctions_seller_idx on public.part_auctions (seller_id, created_at desc);

create table if not exists public.part_bids (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid not null references public.part_auctions(id) on delete cascade,
  bidder_id   uuid not null references public.profiles(id) on delete cascade,
  amount      int  not null,
  created_at  timestamptz not null default now()
);
create index if not exists part_bids_auction_idx on public.part_bids (auction_id, created_at desc);

alter table public.part_auctions enable row level security;
alter table public.part_bids     enable row level security;

-- オークションは誰でも閲覧可。作成・更新は出品者本人。
drop policy if exists "part_auctions_select_all" on public.part_auctions;
create policy "part_auctions_select_all" on public.part_auctions for select using (true);
drop policy if exists "part_auctions_insert_own" on public.part_auctions;
create policy "part_auctions_insert_own" on public.part_auctions for insert with check (seller_id = auth.uid());
drop policy if exists "part_auctions_update_own" on public.part_auctions;
create policy "part_auctions_update_own" on public.part_auctions for update using (seller_id = auth.uid());

-- 入札は誰でも閲覧可。作成は本人（出品者は自分の商品に入札不可はアプリ側で制御）。
drop policy if exists "part_bids_select_all" on public.part_bids;
create policy "part_bids_select_all" on public.part_bids for select using (true);
drop policy if exists "part_bids_insert_own" on public.part_bids;
create policy "part_bids_insert_own" on public.part_bids for insert with check (bidder_id = auth.uid());
