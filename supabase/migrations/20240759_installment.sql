-- クレジットカードの2回分割払い（同一カード・即時2回）対応
-- installment_fee は既存。分割回数・入金状況・2本目のSquare識別子を追加する。

alter table public.escrow_transactions add column if not exists installment_count int not null default 1;
alter table public.escrow_transactions add column if not exists square_payment_id_2 text;
alter table public.escrow_transactions add column if not exists installment_1_paid boolean not null default false;
alter table public.escrow_transactions add column if not exists installment_2_paid boolean not null default false;
