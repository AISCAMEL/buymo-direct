-- ============================================================
-- 案件ごとのチャット連携
-- 既存の conversations/messages 基盤を案件(Case)にも使えるようにする。
--   - listing_id を NULL 許可（案件チャットは車両に紐づかない場合がある）
--   - case_id を追加（依頼者 × 加盟店オーナーのスレッド）
-- ============================================================

alter table public.conversations alter column listing_id drop not null;
alter table public.conversations add column if not exists case_id uuid references public.cases(id) on delete cascade;
create index if not exists conversations_case_idx on public.conversations(case_id);

-- 1案件・1依頼者につき1スレッド（listing チャットには影響しない）
create unique index if not exists conversations_case_buyer_uidx
  on public.conversations(case_id, buyer_id) where case_id is not null;
