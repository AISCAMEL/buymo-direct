-- 正式査定依頼の拡張：
--  ・未ログインでも申し込めるように user_id を任意化
--  ・連絡先（氏名/電話/メール/連絡希望）を追加
--  ・AI査定額（申込時点の概算）を保持し、担当が price_low/price_high に確定額を入力
alter table public.appraisal_requests alter column user_id drop not null;
alter table public.appraisal_requests add column if not exists contact_name text;
alter table public.appraisal_requests add column if not exists contact_phone text;
alter table public.appraisal_requests add column if not exists contact_email text;
alter table public.appraisal_requests add column if not exists preferred_contact text;
alter table public.appraisal_requests add column if not exists ai_price_low integer;
alter table public.appraisal_requests add column if not exists ai_price_high integer;
alter table public.appraisal_requests add column if not exists source text default 'dashboard';

create index if not exists idx_appraisal_requests_status on public.appraisal_requests(status, created_at desc);
