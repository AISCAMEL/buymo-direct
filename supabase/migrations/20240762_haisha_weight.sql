-- 廃車買取：車両重量区分（重量税の還付算定に使用）
alter table public.haisha_requests
  add column if not exists weight_idx int;
