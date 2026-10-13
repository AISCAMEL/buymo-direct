-- ============================================================
-- プロの作業事例（施工事例・実績）
--   ビフォーアフター写真・内容・料金・所要時間・お客様の声。
--   公開分は誰でも閲覧（プロ詳細の「作業事例」に表示）。
--   加盟店オーナーが自店の事例を管理。
-- ============================================================

create table if not exists public.dealer_work_cases (
  id             uuid primary key default gen_random_uuid(),
  dealer_id      uuid not null references public.dealers(id) on delete cascade,
  category       text,                          -- 板金・塗装 / コーティング / 整備・車検 / 電装・取付 / 美装 など
  title          text not null,
  description    text,
  before_url     text,
  after_url      text,
  price          integer,                       -- 円（税込目安）
  duration       text,                          -- 所要時間（例：半日 / 30分 / 1日）
  car_name       text,                          -- 対象車種
  customer_name  text,                          -- お客様の表示名（例：田村 さん）
  customer_voice text,                          -- お客様の声
  rating         int check (rating between 1 and 5),
  work_date      date,
  published      boolean not null default true,
  sort           int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists dealer_work_cases_dealer_idx on public.dealer_work_cases(dealer_id, published, sort);
alter table public.dealer_work_cases enable row level security;

drop policy if exists "work_cases_public_read" on public.dealer_work_cases;
create policy "work_cases_public_read" on public.dealer_work_cases for select using (published = true);

drop policy if exists "work_cases_owner_all" on public.dealer_work_cases;
create policy "work_cases_owner_all" on public.dealer_work_cases for all
  using (exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid()));
