-- AI電話（Twilio）で受けた「折り返し予約」の保存先。
-- 着信→AI自動応答→用件・お名前・希望時間を確認→この表に1件作成、で予約完結。
-- 冪等。Supabase SQL エディタで実行してください。
-- （未実行でもAI電話は会話できますが、予約は保存されません＝通話だけになります。）

create table if not exists public.voice_bookings (
  id          bigint generated always as identity primary key,
  call_sid    text,                          -- Twilio の通話ID（voice_calls と対応）
  phone       text,                          -- 折り返し先（発信者番号）
  category    text,                          -- appraisal(査定・買取) / repair(故障・修理) / purchase(購入相談) / other
  name        text,                          -- お客様のお名前（お聞きした範囲）
  preferred   text,                          -- 折り返し希望の日時（「明日の午後」等の自由文）
  vehicle     text,                          -- 車種・状況（任意）
  note        text,                          -- 補足
  status      text not null default 'new',   -- new / contacted / done / cancelled
  created_at  timestamptz not null default now()
);

create index if not exists voice_bookings_created_idx on public.voice_bookings (created_at desc);
create index if not exists voice_bookings_status_idx on public.voice_bookings (status);

-- サーバー（service role）からのみ読み書き。公開読み取りはしない。
alter table public.voice_bookings enable row level security;

comment on table public.voice_bookings is 'AI電話（Twilio）で受けた折り返し予約';
