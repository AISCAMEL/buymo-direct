'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotification } from '@/lib/notifications';
import { escrowEventDef, ESCROW_ROLE_LABEL } from '@/lib/escrow-events';
import { sendEscrowProgressEmail, opsEmail } from '@/lib/email';

/** エスクロー取引に進捗報告イベントを投稿する。役割に応じて認可し、相手へ通知＋メールする。 */
export async function postEscrowEvent(
  escrowId: string,
  type: string,
  note?: string,
  etaDays?: number | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const def = escrowEventDef(type);
  if (!def) return { error: '不明な報告種別です' };

  const svc = createServiceClient();
  const { data: tx } = await svc
    .from('escrow_transactions')
    .select('id, buyer_id, seller_id, listing_id, status')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx) return { error: '取引が見つかりません' };

  // 役割判定（管理者 or 当事者）
  const { data: prof } = await svc.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = (prof as { role?: string } | null)?.role === 'admin';
  let role: 'admin' | 'seller' | 'buyer';
  if (isAdmin) role = 'admin';
  else if (user.id === tx.buyer_id) role = 'buyer';
  else if (user.id === tx.seller_id) role = 'seller';
  else return { error: '権限がありません' };

  if ((tx.status as string) === 'cancelled') return { error: 'キャンセル済みの取引です' };
  // 認可：管理者は全種別。当事者は許可された種別のみ。
  if (role !== 'admin' && !def.roles.includes(role)) return { error: 'この報告は投稿できません' };

  const eta = Number.isFinite(etaDays as number) && (etaDays as number) > 0 ? Math.round(etaDays as number) : null;
  const cleanNote = (note ?? '').trim().slice(0, 1000) || null;
  const label = `${def.emoji} ${def.label}`;

  const { error: insErr } = await svc.from('escrow_events').insert({
    escrow_id: escrowId,
    type: def.type,
    actor_role: role,
    created_by: user.id,
    title: label,
    body: cleanNote,
    meta: eta ? { etaDays: eta } : {},
  });
  if (insErr) {
    return { error: '進捗の保存に失敗しました。設定が未完了の可能性があります（運営にお問い合わせください）。' };
  }

  // 通知・メール（ベストエフォート：失敗しても投稿は成功扱い）
  void (async () => {
    try {
      const [listingRes, buyerRes, sellerRes] = await Promise.all([
        svc.from('listings').select('title').eq('id', tx.listing_id).maybeSingle(),
        svc.auth.admin.getUserById(tx.buyer_id),
        svc.auth.admin.getUserById(tx.seller_id),
      ]);
      const listingTitle = (listingRes.data as { title?: string } | null)?.title ?? '車両';
      const etaLine = eta ? `到着予定：あと約${eta}日` : '';
      const message = [def.notify, cleanNote, etaLine].filter(Boolean).join(' ');

      const recipients: { uid: string; email?: string | null }[] = [];
      if (user.id !== tx.buyer_id) recipients.push({ uid: tx.buyer_id, email: buyerRes.data?.user?.email });
      if (user.id !== tx.seller_id) recipients.push({ uid: tx.seller_id, email: sellerRes.data?.user?.email });

      for (const r of recipients) {
        await createNotification(r.uid, 'escrow', label, message, `/escrow/${escrowId}`);
        if (r.email) await sendEscrowProgressEmail(r.email, { listingTitle, title: label, message, escrowId });
      }

      // 当事者が投稿した場合は本部にも共有
      if (role !== 'admin') {
        const ops = opsEmail();
        if (ops) {
          await sendEscrowProgressEmail(ops, {
            listingTitle,
            title: `${label}（${ESCROW_ROLE_LABEL[role]}より）`,
            message,
            escrowId,
          });
        }
      }
    } catch {
      /* 通知失敗は無視 */
    }
  })().catch(() => {});

  revalidatePath(`/escrow/${escrowId}`);
  revalidatePath('/admin/escrow');
  return { error: null };
}

/** 買主の重要事項同意を記録（現状渡し・クレーム/返品条件・キャンセル規定等）。
 *  escrow_events に 'buyer_consent' として保存し、書面確認の証跡とする。 */
export async function recordBuyerConsent(escrowId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const svc = createServiceClient();
  const { data: tx } = await svc
    .from('escrow_transactions')
    .select('id, buyer_id')
    .eq('id', escrowId)
    .maybeSingle();
  if (!tx) return { error: '取引が見つかりません' };
  if (tx.buyer_id !== user.id) return { error: '買主のみ同意できます' };

  const { data: existing } = await svc
    .from('escrow_events')
    .select('id')
    .eq('escrow_id', escrowId)
    .eq('type', 'buyer_consent')
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await svc.from('escrow_events').insert({
      escrow_id: escrowId,
      type: 'buyer_consent',
      actor_role: 'buyer',
      created_by: user.id,
      title: '✅ 重要事項に同意しました',
      body: '現状渡し・遠隔取引の性質、クレーム・返品対応ポリシー、キャンセルポリシー、利用規約に同意のうえ購入手続きに進みました。',
      meta: {},
    });
    if (insErr) {
      return { error: '同意の記録に失敗しました（設定が未完了の可能性）。運営にお問い合わせください。' };
    }
  }

  revalidatePath(`/escrow/${escrowId}`);
  return { error: null };
}
