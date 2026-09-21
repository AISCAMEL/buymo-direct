-- 車名マスタ（メーカー→車種）。新車販売に合わせて自動更新される。
-- source: 'seed'=初期候補 / 'listing'=実際の出品から取り込み / 'ai'=AIが現行ラインナップを更新
create table if not exists vehicle_models (
  id uuid primary key default gen_random_uuid(),
  maker text not null,
  model text not null,
  source text not null default 'seed',
  active boolean not null default true,
  updated_at timestamptz default now(),
  unique (maker, model)
);

alter table vehicle_models enable row level security;
-- 車名候補は公開情報なので誰でも読み取り可（書き込みはサーバー service role のみ）
drop policy if exists "vehicle_models_read" on vehicle_models;
create policy "vehicle_models_read" on vehicle_models for select using (true);

create index if not exists idx_vehicle_models_maker on vehicle_models(maker) where active;
