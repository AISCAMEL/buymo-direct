-- ============================================================
-- コミュニティの参加範囲を「業者トラック」に拡張。
--   これまで：有料会員 / 加盟店オーナー・スタッフ / 本部
--   追加    ：account_type='business'（スキル登録を含む業者）
-- 個人（individual）は引き続き参加不可（アプリ側でも案内）。
-- ============================================================

-- 会員判定を business まで広げて貼り直す（冪等）。
drop policy if exists "community_posts_member_read" on public.community_posts;
create policy "community_posts_member_read" on public.community_posts for select using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid()
          and (pr.role = 'admin' or pr.member_tier = 'paid' or pr.account_type = 'business'))
  or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
);

drop policy if exists "community_posts_member_insert" on public.community_posts;
create policy "community_posts_member_insert" on public.community_posts for insert with check (
  author_id = auth.uid() and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid()
            and (pr.role = 'admin' or pr.member_tier = 'paid' or pr.account_type = 'business'))
    or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
    or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
  )
);

drop policy if exists "community_comments_member_read" on public.community_comments;
create policy "community_comments_member_read" on public.community_comments for select using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid()
          and (pr.role = 'admin' or pr.member_tier = 'paid' or pr.account_type = 'business'))
  or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
);

drop policy if exists "community_comments_member_insert" on public.community_comments;
create policy "community_comments_member_insert" on public.community_comments for insert with check (
  author_id = auth.uid() and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid()
            and (pr.role = 'admin' or pr.member_tier = 'paid' or pr.account_type = 'business'))
    or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
    or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
  )
);
