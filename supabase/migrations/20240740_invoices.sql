-- ============================================================
-- 請求書システム（見積 → 請求 → 入金）
-- invoices（ヘッダ）/ invoice_items（明細）/ invoice_payments（入金）。
-- 自動採番 invoice_no。発行時点の振込先・インボイス番号をスナップショット。
-- ============================================================

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_no     bigint generated always as identity,
  quote_id       uuid references public.quotes(id) on delete set null,
  dealer_id      uuid references public.dealers(id) on delete set null,
  buyer_id       uuid references public.profiles(id) on delete set null,
  customer_name  text,
  vehicle_summary text,
  subtotal       integer not null default 0,
  discount       integer not null default 0,
  tax            integer not null default 0,
  total          integer not null default 0,
  paid_amount    integer not null default 0,     -- 入金合計（一部入金対応）
  status         text not null default 'issued',  -- draft|issued|sent|awaiting_payment|partially_paid|paid|cancelled
  issue_date     date not null default current_date,
  due_date       date,
  note           text,
  bank_info      text,                            -- 発行時点の振込先
  invoice_reg_no text,                            -- 発行時点のインボイス登録番号
  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists invoices_dealer_idx on public.invoices(dealer_id, created_at desc);
create index if not exists invoices_buyer_idx  on public.invoices(buyer_id, created_at desc);
create index if not exists invoices_status_idx on public.invoices(status);

create table if not exists public.invoice_items (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  label      text not null,
  category   text,
  amount     integer not null default 0,
  taxable    boolean not null default true,
  sort       int not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, sort);

create table if not exists public.invoice_payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      integer not null default 0,
  method      text,                    -- bank|cash|card|other
  paid_at     date not null default current_date,
  note        text,
  recorded_by uuid,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments(invoice_id, paid_at);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;

-- invoices：加盟店（自社）管理 / 宛先ユーザー閲覧 / 本部
create policy "invoices_dealer_all" on public.invoices for all
  using (exists (select 1 from public.dealers d where d.id = invoices.dealer_id and d.owner_id = auth.uid())
      or exists (select 1 from public.dealer_staff s where s.dealer_id = invoices.dealer_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.dealers d where d.id = invoices.dealer_id and d.owner_id = auth.uid())
      or exists (select 1 from public.dealer_staff s where s.dealer_id = invoices.dealer_id and s.user_id = auth.uid()));
create policy "invoices_buyer_read" on public.invoices for select using (auth.uid() = buyer_id);
create policy "invoices_admin_all" on public.invoices for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- invoice_items：親請求の権限に追随
create policy "invoice_items_dealer_all" on public.invoice_items for all
  using (exists (select 1 from public.invoices i join public.dealers d on d.id = i.dealer_id
                 where i.id = invoice_items.invoice_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.invoices i join public.dealers d on d.id = i.dealer_id
                 where i.id = invoice_items.invoice_id and d.owner_id = auth.uid()));
create policy "invoice_items_buyer_read" on public.invoice_items for select
  using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and i.buyer_id = auth.uid()));
create policy "invoice_items_admin_all" on public.invoice_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- invoice_payments：加盟店（自社）と本部が管理、宛先ユーザーは閲覧
create policy "invoice_payments_dealer_all" on public.invoice_payments for all
  using (exists (select 1 from public.invoices i join public.dealers d on d.id = i.dealer_id
                 where i.id = invoice_payments.invoice_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.invoices i join public.dealers d on d.id = i.dealer_id
                 where i.id = invoice_payments.invoice_id and d.owner_id = auth.uid()));
create policy "invoice_payments_buyer_read" on public.invoice_payments for select
  using (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id and i.buyer_id = auth.uid()));
create policy "invoice_payments_admin_all" on public.invoice_payments for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
