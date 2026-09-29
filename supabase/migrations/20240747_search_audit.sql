-- ============================================================
-- 検索フィルタ拡充（駆動方式・車検）＋ 監査ログの変更前後
-- ============================================================

-- 車両：駆動方式・車検満了日（検索・詳細表示に使用）
alter table public.listings add column if not exists drivetrain   text;
alter table public.listings add column if not exists shaken_until date;

-- 監査ログ：変更前・変更後（JSON）
alter table public.audit_logs add column if not exists before jsonb;
alter table public.audit_logs add column if not exists after  jsonb;
