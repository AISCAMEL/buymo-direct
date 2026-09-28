-- 加盟店（車のプロ）プロフィールを魅力的にする項目を追加。
alter table public.dealers add column if not exists tagline        text;      -- キャッチコピー
alter table public.dealers add column if not exists cover_url       text;      -- カバー画像
alter table public.dealers add column if not exists rep_name        text;      -- 担当者名
alter table public.dealers add column if not exists rep_photo_url   text;      -- 担当者の顔写真
alter table public.dealers add column if not exists rep_message     text;      -- 担当者からの一言
alter table public.dealers add column if not exists business_hours  text;      -- 営業時間
alter table public.dealers add column if not exists holidays        text;      -- 定休日
alter table public.dealers add column if not exists established      text;      -- 創業・設立
alter table public.dealers add column if not exists service_area     text;      -- 対応エリア
alter table public.dealers add column if not exists instagram_url    text;      -- Instagram
alter table public.dealers add column if not exists line_url         text;      -- LINE公式
alter table public.dealers add column if not exists gallery          jsonb not null default '[]'::jsonb; -- 店舗の雰囲気写真URL配列
