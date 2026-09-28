-- ============================================================
-- ダイレクト販売（加盟店）の価格内訳・支払総額
-- 一般個人の出品では未使用（NULL）。支払総額はアプリ側で合算表示。
-- ============================================================

alter table public.listings add column if not exists registration_fee int;   -- 登録費用
alter table public.listings add column if not exists recycle_fee      int;   -- リサイクル料金
alter table public.listings add column if not exists warranty_fee     int;   -- 保証料
alter table public.listings add column if not exists delivery_fee     int;   -- 納車費用
alter table public.listings add column if not exists misc_fees        int;   -- 諸費用（その他）
alter table public.listings add column if not exists tax_amount       int;   -- 消費税（任意表示・税務判断はしない）
alter table public.listings add column if not exists sale_terms       text;  -- 販売条件
