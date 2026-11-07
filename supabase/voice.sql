-- AI電話（Twilio連携）の通話ログと会話メモリ。
-- 通話中の文脈を保持し、AIが自然に応答できるようにする。
-- 冪等。Supabase SQL エディタで実行してください。（未実行でもAI電話は動作しますが、
-- 通話中の会話メモリは無効＝1発話ごとの応答になります。）

create table if not exists public.voice_calls (
  call_sid    text primary key,
  direction   text not null default 'inbound', -- inbound / outbound
  from_number text,
  to_number   text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.voice_turns (
  id          bigint generated always as identity primary key,
  call_sid    text not null,
  role        text not null, -- 'user' | 'assistant'
  text        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists voice_turns_call_idx on public.voice_turns (call_sid, created_at);

-- サーバー（service role）からのみ読み書き。公開読み取りはしない。
alter table public.voice_calls enable row level security;
alter table public.voice_turns enable row level security;

comment on table public.voice_calls is 'AI電話（Twilio）の通話記録';
comment on table public.voice_turns is 'AI電話の通話中の会話メモリ（発話ごと）';
