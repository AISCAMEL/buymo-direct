-- 銀行振込（エスクロー）の入金確認フロー
-- 買い手が「振込みました」と申告した時刻を記録。運営が着金を確認して funds_held に遷移させる。
-- カラムが無い環境でもページがクラッシュしないよう、graceful degradation で参照する。

alter table public.escrow_transactions
  add column if not exists transfer_reported_at timestamptz;

comment on column public.escrow_transactions.transfer_reported_at is
  '買い手が銀行振込を申告した日時。運営の入金確認（funds_held化）待ちを表す。';
