-- 見学・試乗の前日リマインド送信管理。送信済みは reminded_at を記録して二重送信を防ぐ。
alter table public.appointments
  add column if not exists reminded_at timestamptz;
