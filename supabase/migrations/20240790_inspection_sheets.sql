-- 査定表（現車検査シート）。加盟店・本部どちらのスタッフも作成できる共通ツール。
-- スマホ/iPad で検査した結果を保存し、「保管用」「提案用」の2形態で出力する。
create table if not exists public.inspection_sheets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,                         -- 作成スタッフ(auth.users.id)
  scope text not null default 'dealer',    -- 'dealer' | 'hq'
  dealer_id uuid references public.dealers(id) on delete set null,  -- 加盟店作成時のみ
  listing_id uuid references public.listings(id) on delete set null, -- 出品/在庫と紐付け(任意)

  -- 一覧表示・検索用の代表項目
  maker text,
  model text,
  model_year int,
  mileage_km int,
  plate text,                              -- ナンバー(表示用。個人情報配慮で任意)
  customer_name text,                      -- 所有者/提示先(任意)

  vehicle jsonb not null default '{}'::jsonb,     -- grade,vin,color,shaken_until,transmission,fuel,body_type 等
  inspection jsonb not null default '{}'::jsonb,  -- { itemKey: { rating, note, photos:[url] } }
  photos jsonb not null default '[]'::jsonb,      -- 代表写真 [{url,caption}]

  overall_rating text,                     -- 総合評価 S/A/B/C/D
  appraised_price int,                     -- 査定額(提案用に表示)
  cost_estimate int,                       -- 整備概算(保管用のみ)
  internal_note text,                      -- 内部メモ(保管用のみ)

  damages jsonb not null default '[]'::jsonb,   -- 展開図のキズ/へこみ等 [{id,view,x,y,type,size,note,photos}]
  repair_history boolean not null default false, -- 修復歴あり
  ai_eval jsonb,                           -- AI最終評価 {score,grade,auction,priceLow,priceHigh,summary,computedAt}

  status text not null default 'draft',    -- 'draft' | 'done'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_sheets_dealer_idx on public.inspection_sheets (dealer_id, created_at desc);
create index if not exists inspection_sheets_scope_idx  on public.inspection_sheets (scope, created_at desc);
create index if not exists inspection_sheets_listing_idx on public.inspection_sheets (listing_id);

-- API は service role 経由でアクセスするため RLS は有効化のみ（匿名直アクセスを遮断）。
alter table public.inspection_sheets enable row level security;
