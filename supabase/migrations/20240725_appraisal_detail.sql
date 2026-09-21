-- 正式査定の「詳細情報＋写真」対応
--  ・査定に必要な車両詳細を保存
--  ・写真を jsonb 配列（{url, caption}）で保持
--  ・買取→ダイレクト移行時のリンク（listing_id / converted_at）
alter table public.appraisal_requests add column if not exists grade text;          -- グレード
alter table public.appraisal_requests add column if not exists type_code text;      -- 型式
alter table public.appraisal_requests add column if not exists vin text;            -- 車台番号
alter table public.appraisal_requests add column if not exists transmission text;   -- ミッション
alter table public.appraisal_requests add column if not exists fuel text;           -- 燃料
alter table public.appraisal_requests add column if not exists body_type text;      -- ボディタイプ
alter table public.appraisal_requests add column if not exists color text;          -- カラー
alter table public.appraisal_requests add column if not exists shaken_until text;   -- 車検満了（YYYY-MM 等）
alter table public.appraisal_requests add column if not exists repair_detail text;  -- 修復歴の詳細
alter table public.appraisal_requests add column if not exists equipment text;      -- 装備・オプション
alter table public.appraisal_requests add column if not exists one_owner boolean default false;   -- ワンオーナー
alter table public.appraisal_requests add column if not exists has_records boolean default false;  -- 整備記録簿あり
alter table public.appraisal_requests add column if not exists non_smoking boolean default false;  -- 禁煙車
alter table public.appraisal_requests add column if not exists photos jsonb default '[]'::jsonb;    -- [{url, caption}]
alter table public.appraisal_requests add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.appraisal_requests add column if not exists converted_at timestamptz;
