-- 陸送申込に「車両タイプ」を追加
--   standard … 通常車両（基準額の2倍）
--   special  … 特殊車両（ローダウン・旧車・高級車など、基準額の5倍）
alter table public.transport_requests
  add column if not exists car_condition text not null default 'standard';
