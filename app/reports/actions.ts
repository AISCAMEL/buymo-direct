'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail, emailLayout, opsEmail } from '@/lib/email';
import type { ReportTarget } from '@/lib/types';

export const REPORT_REASONS = [
  '不適切な内容・写真',
  '詐欺・なりすましの疑い',
  '重複・スパム出品',
  '連絡が取れない',
  '禁止商品・規約違反',
  'その他',
];

/** 通報を登録（要ログイン・本人のみ／RLS）。 */
export async function submitReport(input: {
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  detail?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '通報にはログインが必要です' };
  if (!input.reason) return { error: '理由を選択してください' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail?.trim() || null,
    status: 'open',
  });
  if (error) return { error: error.message };

  // 運営へ通知（ベストエフォート）
  const ops = opsEmail();
  if (ops) {
    const targetLabel = { listing: '出品', user: 'ユーザー', review: 'レビュー' }[input.targetType];
    await sendEmail({
      to: ops,
      subject: `【通報】${targetLabel} - ${input.reason}`,
      html: emailLayout(
        '新しい通報が届きました',
        `<p>対象: ${targetLabel}（ID: ${input.targetId}）</p>
         <p>理由: ${input.reason}</p>
         ${input.detail ? `<p>詳細: ${input.detail.trim()}</p>` : ''}
         <p>管理画面の「通報」からご対応ください。</p>`
      ),
    });
  }

  return { error: null };
}
