-- エスクロー取引に「追加オプション」を保持するカラムを追加する。
-- 保証（故障保証）・車庫証明代行など、購入時に選んだ有料オプションの金額を
-- 取引に保存し、合計金額・決済額へ正しく反映するために使う。
--
-- options       : 選択したオプションの明細（[{ key, label, amount }, ...]）
-- options_total : 上記 amount の合計（円）。表示・課金で参照する冗長カラム。
--
-- 冪等（何度実行しても安全）。Supabase SQL エディタで実行してください。

alter table public.escrow_transactions
  add column if not exists options       jsonb   not null default '[]'::jsonb,
  add column if not exists options_total integer not null default 0;

comment on column public.escrow_transactions.options is
  '追加オプション明細 [{key,label,amount}]（保証・車庫証明など）';
comment on column public.escrow_transactions.options_total is
  '追加オプションの合計金額（円）。買主の支払総額に加算される。';
