-- 査定表に「展開図のダメージ」「修復歴」「AI最終評価」を追加。
-- 20240790 を既に適用済みの環境でも安全に追記できるよう IF NOT EXISTS で定義。
alter table public.inspection_sheets add column if not exists damages jsonb not null default '[]'::jsonb;
alter table public.inspection_sheets add column if not exists repair_history boolean not null default false;
alter table public.inspection_sheets add column if not exists ai_eval jsonb;
