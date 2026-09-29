-- ============================================================
-- 手数料の締め請求（本部 → 加盟店）
-- 締め日までの未請求手数料（マッチング＋販売）を集約して1枚の請求書に。
-- ============================================================

create table if not exists public.fee_statements (
  id             uuid primary key default gen_random_uuid(),
  statement_no   bigint generated always as identity,
  dealer_id      uuid references public.dealers(id) on delete set null,
  period_end     date not null,                  -- 締め日
  matching_total integer not null default 0,     -- マッチング手数料 合計（税込）
  sales_total    integer not null default 0,     -- 販売手数料 合計（税込）
  subtotal       integer not null default 0,     -- 手数料（税抜）合計
  tax            integer not null default 0,     -- 消費税 合計
  total          integer not null default 0,     -- 請求総額（税込）
  status         text not null default 'issued', -- draft|issued|paid|cancelled
  due_date       date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists fee_statements_dealer_idx on public.fee_statements(dealer_id, created_at desc);
create index if not exists fee_statements_status_idx  on public.fee_statements(status);

-- 個別手数料に締め請求への紐付けを追加
alter table public.case_charges     add column if not exists statement_id uuid references public.fee_statements(id) on delete set null;
alter table public.sale_commissions add column if not exists statement_id uuid references public.fee_statements(id) on delete set null;

alter table public.fee_statements enable row level security;
-- 加盟店は自社の締め請求を参照、本部は全操作。作成/更新は本部(service role/管理者)。
create policy "fee_statements_dealer_read" on public.fee_statements for select
  using (exists (select 1 from public.dealers d where d.id = fee_statements.dealer_id and d.owner_id = auth.uid()));
create policy "fee_statements_admin_all" on public.fee_statements for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
