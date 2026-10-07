-- 異業種スキルの追加（販売店以外：レンタカー会社・リース等）
insert into public.skills (key, name, category, sort) values
  ('rental','レンタカー','レンタカー・リース',60),
  ('lease','カーリース','レンタカー・リース',61),
  ('subscription','車のサブスク','レンタカー・リース',62),
  ('wrapping','ラッピング・フィルム','美装',22),
  ('roadservice','ロードサービス','物流・手続き',55)
on conflict (key) do nothing;
