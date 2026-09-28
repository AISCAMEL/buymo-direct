-- ============================================================
-- 買取保証の「保証期間」管理（個人会員の出品のみ対象）
--   - guarantee_until: 買取保証の期限（未設定なら created_at + 既定日数で算出）
--   - guarantee_opt_out: 会員が買取保証を辞退した場合 true
-- 出品画面には買取保証を表示せず、会員のマイページ内でのみ扱う。
-- 加盟店の出品は対象外（アプリ側で制御）。
-- ============================================================

alter table public.listings add column if not exists guarantee_until   timestamptz;
alter table public.listings add column if not exists guarantee_opt_out boolean not null default false;
