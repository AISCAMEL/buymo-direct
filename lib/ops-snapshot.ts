import { createServiceClient } from '@/lib/supabase/service';

type Svc = ReturnType<typeof createServiceClient>;

/** テーブルの件数を安全に数える（失敗時は null）。filter は [column, value] の等値。 */
async function countRows(svc: Svc, table: string, filter?: [string, string]): Promise<number | null> {
  try {
    let q = svc.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** 直近N時間に作成された件数（created_at基準・失敗時は null）。 */
async function countRecent(svc: Svc, table: string, hours: number, dateCol = 'created_at'): Promise<number | null> {
  try {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { count, error } = await svc.from(table).select('*', { count: 'exact', head: true }).gte(dateCol, since);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export interface OpsSnapshot {
  escrow: Record<string, number | null>;
  reportsOpen: number | null;
  kycPending: number | null;
  listingsDraft: number | null;
  listingsActive: number | null;
  buybackPending: number | null;
  contactRecent7d: number | null;
  escrowEvents24h: number | null;
  generatedAt: string;
}

/** 運営監視用の現況スナップショット（件数中心・個人情報は含めない）。 */
export async function gatherOpsSnapshot(): Promise<OpsSnapshot> {
  const svc = createServiceClient();
  const escrowStatuses = ['initiated', 'funds_held', 'inspection', 'title_transfer', 'completed', 'cancelled', 'disputed'];

  const [escrowCounts, reportsOpen, kycPending, listingsDraft, listingsActive, buybackPending, contactRecent7d, escrowEvents24h] =
    await Promise.all([
      Promise.all(escrowStatuses.map((s) => countRows(svc, 'escrow_transactions', ['status', s]))),
      countRows(svc, 'reports', ['status', 'open']),
      countRows(svc, 'kyc_documents', ['status', 'pending']),
      countRows(svc, 'listings', ['status', 'draft']),
      countRows(svc, 'listings', ['status', 'active']),
      countRows(svc, 'buyback_requests', ['status', 'pending']),
      countRecent(svc, 'contact_messages', 24 * 7),
      countRecent(svc, 'escrow_events', 24),
    ]);

  const escrow: Record<string, number | null> = {};
  escrowStatuses.forEach((s, i) => (escrow[s] = escrowCounts[i]));

  return {
    escrow,
    reportsOpen,
    kycPending,
    listingsDraft,
    listingsActive,
    buybackPending,
    contactRecent7d,
    escrowEvents24h,
    generatedAt: new Date().toISOString(),
  };
}

/** スナップショットを、LLM に渡す読みやすい日本語テキストにする。 */
export function snapshotToText(s: OpsSnapshot): string {
  const n = (v: number | null) => (v === null ? '取得不可' : String(v));
  return [
    `【現況スナップショット（${new Date(s.generatedAt).toLocaleString('ja-JP')}時点）】`,
    `エスクロー取引（状態別件数）：` +
      `取引開始 ${n(s.escrow.initiated)} / 入金保全 ${n(s.escrow.funds_held)} / 現車確認 ${n(s.escrow.inspection)} / ` +
      `名義変更 ${n(s.escrow.title_transfer)} / 完了 ${n(s.escrow.completed)} / キャンセル ${n(s.escrow.cancelled)} / 係争 ${n(s.escrow.disputed)}`,
    `未対応の通報（open）：${n(s.reportsOpen)} 件`,
    `本人確認 審査待ち（pending）：${n(s.kycPending)} 件`,
    `出品 審査待ち（draft）：${n(s.listingsDraft)} 件 / 公開中（active）：${n(s.listingsActive)} 件`,
    `買取保証 審査待ち（pending）：${n(s.buybackPending)} 件`,
    `直近7日の問い合わせ：${n(s.contactRecent7d)} 件`,
    `直近24時間の取引進捗イベント：${n(s.escrowEvents24h)} 件`,
  ].join('\n');
}
