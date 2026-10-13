-- ============================================================
-- 車のプロ：「車検」を独立カテゴリにし、車検系スキルを拡充
--   既存の inspection(車検) を「整備・修理」→「車検」カテゴリへ移動。
--   指定/認証工場・ユーザー車検・法定点検・見積りなどを追加。
-- ============================================================

update public.skills set category = '車検' where key = 'inspection';

insert into public.skills (key, name, category, sort) values
  ('shaken_designated', '指定工場車検（即日・立会い）', '車検', 60),
  ('shaken_authorized', '認証工場車検',                 '車検', 61),
  ('shaken_user',       'ユーザー車検代行',             '車検', 62),
  ('shaken_light',      '軽自動車の車検',               '車検', 63),
  ('inspection_24',     '24ヶ月法定点検',               '車検', 64),
  ('inspection_12',     '12ヶ月（法定）点検',           '車検', 65),
  ('shaken_quote',      '車検見積り・無料点検',         '車検', 66),
  ('shaken_maint',      '車検整備（消耗品交換）',       '車検', 67)
on conflict (key) do nothing;
