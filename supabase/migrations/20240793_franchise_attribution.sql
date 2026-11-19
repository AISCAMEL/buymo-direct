-- 加盟店募集の動線（流入元）計測：加盟申込に UTM・参照元・ランディングを記録する列を追加。
-- すべて任意。既存データ・既存フローには影響しない（NULL許容）。
alter table if exists public.franchise_applications
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term     text,
  add column if not exists utm_content  text,
  add column if not exists referrer     text,
  add column if not exists landing_path text;

-- 集計を速くするための軽いインデックス（任意）
create index if not exists idx_franchise_apps_utm_source   on public.franchise_applications (utm_source);
create index if not exists idx_franchise_apps_utm_campaign on public.franchise_applications (utm_campaign);
