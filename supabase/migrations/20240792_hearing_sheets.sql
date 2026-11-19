-- ヒアリングシート（出張・来店査定の聞き取り）。公開フォーム(QR)からも、担当者入力からも保存。
create table if not exists public.hearing_sheets (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid references public.dealers(id) on delete set null, -- QRの店舗タグ(任意)
  store_label text,                        -- 店舗名の自由記入(任意)
  source text not null default 'web',      -- 'web'(QRフォーム) | 'paper'(紙起票の転記)
  customer_name text,
  tel text,
  maker text, model text, model_year int, mileage_km int, plate text,
  hearing jsonb not null default '{}'::jsonb, -- 他社査定額/希望額/売却時期/動機/状況/状態メモ 等
  note text,
  status text not null default 'new',      -- 'new' | 'handled'
  created_at timestamptz not null default now()
);
create index if not exists hearing_sheets_dealer_idx on public.hearing_sheets (dealer_id, created_at desc);
create index if not exists hearing_sheets_created_idx on public.hearing_sheets (created_at desc);
alter table public.hearing_sheets enable row level security;
