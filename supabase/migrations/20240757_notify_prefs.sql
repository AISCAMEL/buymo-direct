-- ============================================================
-- 通知・メール設定（アカウント設定）
--   会員が受け取る通知/メールの希望を保持。
-- ============================================================

alter table public.profiles add column if not exists notify_price_drop   boolean not null default true;  -- お気に入り車の値下げ
alter table public.profiles add column if not exists notify_saved_search boolean not null default true;  -- 保存した検索条件に合う新着
alter table public.profiles add column if not exists notify_message      boolean not null default true;  -- メッセージ・取引の通知
alter table public.profiles add column if not exists accept_newsletter   boolean not null default false; -- メールマガジン購読
