-- レンタカー・リースのスキルを廃止（不要のため削除）。
-- 既に 20240763 の旧版でシードされた環境向けのクリーンアップ。
delete from public.partner_skills where skill_key in ('rental','lease','subscription');
delete from public.skills where key in ('rental','lease','subscription');
