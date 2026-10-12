-- ============================================================
-- 有料コンテンツの動画対応
--   learning_contents / premium_resources に video_url を追加。
--   YouTube・Vimeo の共有URL、または mp4/webm などの直リンクを保存。
--   表示側で埋め込みプレーヤーに変換する（本文とは別に動画を併載可）。
-- ============================================================

alter table public.learning_contents add column if not exists video_url text;
alter table public.premium_resources  add column if not exists video_url text;
