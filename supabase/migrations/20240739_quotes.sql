-- ============================================================
-- 見積書システム（加盟店 → 購入希望者）
-- 明細（quote_items）＋ヘッダ（quotes）。自動採番は quote_no。
-- 税務判断はシステムで行わず、入力・登録情報に基づいて集計・表示する。
-- ============================================================

create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  quote_no       bigint generated always as identity,
  dealer_id      uuid references public.dealers(id) on delete set null,
  listing_id     uuid references public.listings(id) on delete set null,
  buyer_id       uuid references public.profiles(id) on delete set null,  -- 宛先ユーザー（登録会員の場合）
  customer_name  text,                       -- 宛名（未登録顧客も可）
  vehicle_summary text,                      -- 車両概要（スナップショット）
  subtotal       integer not null default 0, -- 明細合計（税抜想定）
  discount       integer not null default 0, -- 値引き
  tax            integer not null default 0, -- 消費税
  total          integer not null default 0, -- 合計（税込）
  status         text not null default 'draft', -- draft|sent|accepted|declined|expired|converted
  valid_until    date,
  note           text,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists quotes_dealer_idx on public.quotes(dealer_id, created_at desc);
create index if not exists quotes_buyer_idx  on public.quotes(buyer_id, created_at desc);
create index if not exists quotes_status_idx on public.quotes(status);

create table if not exists public.quote_items (
  id        uuid primary key default gen_random_uuid(),
  quote_id  uuid not null references public.quotes(id) on delete cascade,
  label     text not null,                  -- 項目名
  category  text,                           -- vehicle|maintenance|warranty|registration|delivery|recycle|option|other
  amount    integer not null default 0,     -- 金額
  taxable   boolean not null default true,  -- 課税対象か
  sort      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id, sort);

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

-- 加盟店オーナー/スタッフは自社見積を管理
create policy "quotes_dealer_all" on public.quotes for all
  using (exists (select 1 from public.dealers d where d.id = quotes.dealer_id and d.owner_id = auth.uid())
      or exists (select 1 from public.dealer_staff s where s.dealer_id = quotes.dealer_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.dealers d where d.id = quotes.dealer_id and d.owner_id = auth.uid())
      or exists (select 1 from public.dealer_staff s where s.dealer_id = quotes.dealer_id and s.user_id = auth.uid()));
-- 宛先ユーザーは自分宛の見積を閲覧
create policy "quotes_buyer_read" on public.quotes for select using (auth.uid() = buyer_id);
-- 管理者は全件
create policy "quotes_admin_all" on public.quotes for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 明細は親見積の権限に追随
create policy "quote_items_dealer_all" on public.quote_items for all
  using (exists (select 1 from public.quotes q join public.dealers d on d.id = q.dealer_id
                 where q.id = quote_items.quote_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.quotes q join public.dealers d on d.id = q.dealer_id
                 where q.id = quote_items.quote_id and d.owner_id = auth.uid()));
create policy "quote_items_buyer_read" on public.quote_items for select
  using (exists (select 1 from public.quotes q where q.id = quote_items.quote_id and q.buyer_id = auth.uid()));
create policy "quote_items_admin_all" on public.quote_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
