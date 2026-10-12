-- ============================================================
-- プロの営業形態（店舗型 / 出張型 / 店舗＋出張）
--   shop   = 店舗型（来店して利用）
--   mobile = 出張型（自宅・職場などへ出張。セイビー型）
--   both   = 店舗＋出張の両対応
-- ============================================================

alter table public.dealers add column if not exists service_style text not null default 'shop';
