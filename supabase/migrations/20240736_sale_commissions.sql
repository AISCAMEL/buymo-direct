-- ============================================================
-- 加盟店の自社在庫が売れた際の成果報酬（販売手数料）
-- 一般ユーザーの出品（dealer_id なし）は対象外。
-- 料率は加盟店ごとの commission_rate（業販レート）を使用。
-- 取引（エスクロー）完了時に1件記録する。
-- ============================================================

create table if not exists public.sale_commissions (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid references public.escrow_transactions(id) on delete cascade,
  listing_id  uuid references public.listings(id) on delete set null,
  dealer_id   uuid references public.dealers(id) on delete set null,
  title       text,
  sale_amount integer not null default 0,          -- 成約金額
  rate        numeric not null default 0,          -- 適用料率(%)
  fee_amount  integer not null default 0,          -- 手数料(税抜)
  tax         integer not null default 0,          -- 消費税
  total       integer not null default 0,          -- 請求総額(税込)
  status      text not null default 'pending',     -- pending|invoiced|paid|waived|cancelled
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (escrow_id)
);
create index if not exists sale_commissions_dealer_idx on public.sale_commissions(dealer_id, created_at desc);
create index if not exists sale_commissions_status_idx  on public.sale_commissions(status);
alter table public.sale_commissions enable row level security;

-- 参照: 加盟店オーナーは自社分、管理者は全件。挿入/更新はサーバー(service role)。
create policy "sale_commissions_partner_read" on public.sale_commissions for select
  using (exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid()));
create policy "sale_commissions_admin_read" on public.sale_commissions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
