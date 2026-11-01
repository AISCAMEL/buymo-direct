-- AI自動生成コラム（毎日1本）を保存するテーブル。
-- 既存の静的コラム（lib/columns.ts）と /column 上で統合表示する。
-- 冪等（何度実行しても安全）。Supabase SQL エディタで実行してください。

create table if not exists public.columns (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  meta        text not null default '',
  cat         text not null default 'その他',
  html        text not null,
  thumb_url   text,
  sources     jsonb not null default '[]'::jsonb,  -- 参考にしたWeb情報（タイトル/URL）
  model       text,                                -- 生成に使ったモデル
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  published_at timestamptz not null default now()
);

create index if not exists columns_published_idx on public.columns (published, published_at desc);
create index if not exists columns_cat_idx on public.columns (cat);

alter table public.columns enable row level security;

-- 公開済みは誰でも閲覧可（SELECTのみ）。書き込みは service role（サーバー）経由。
drop policy if exists "columns public read" on public.columns;
create policy "columns public read" on public.columns
  for select using (published = true);

comment on table public.columns is 'AI自動生成コラム（毎日1本・/columnで静的コラムと統合表示）';
