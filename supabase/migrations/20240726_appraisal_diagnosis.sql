-- 査定の「かんたん問診」結果と売却時期を保存
--  diagnosis 例: {"accident":"none","flood":"none","dent":"minor","engine":"ok", ...}
alter table public.appraisal_requests add column if not exists diagnosis jsonb default '{}'::jsonb;
alter table public.appraisal_requests add column if not exists sell_timing text;
