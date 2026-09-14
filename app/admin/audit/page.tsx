import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'listing.delete': '出品を削除',
    'listing.status.active': '出品を公開に戻す',
    'listing.status.closed': '出品を非公開化',
    'escrow.status.disputed': '取引を係争にする',
    'escrow.status.cancelled': '取引をキャンセル',
    'escrow.status.inspection': '取引の係争を解除',
    'loan.status.reviewing': 'ローンを審査中に',
    'loan.status.approved': 'ローンを承認',
    'loan.status.rejected': 'ローンを否決',
    'report.status.reviewing': '通報を確認中に',
    'report.status.resolved': '通報を対応済みに',
    'report.status.dismissed': '通報を却下',
    'user.warn': 'ユーザーに警告',
    'user.suspend': 'ユーザーを停止',
    'coupon.create': 'クーポンを作成',
    'coupon.delete': 'クーポンを削除',
    'announcement.publish': 'お知らせを公開',
    'announcement.unpublish': 'お知らせを非公開に',
    'announcement.delete': 'お知らせを削除',
  };
  return map[action] ?? action;
}

const TARGET_HREF: Record<string, (id: string) => string | null> = {
  listing: (id) => `/listings/${id}`,
  escrow: (id) => `/escrow/${id}`,
  loan: () => null,
  report: () => null,
  user: (id) => `/users/${id}`,
  coupon: () => null,
  announcement: () => null,
};

type LogWithActor = AuditLog & { actor?: { display_name: string } };

const DEMO_LOGS: LogWithActor[] = [
  {
    id: 'al-1',
    actor_id: 'admin-1',
    action: 'report.status.resolved',
    target_type: 'report',
    target_id: 'rpt-004',
    detail: '虚偽レビューを確認・削除済み',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者A' },
  },
  {
    id: 'al-2',
    actor_id: 'admin-1',
    action: 'user.warn',
    target_type: 'user',
    target_id: 'u-999',
    detail: '外部決済誘導の疑い。警告メールを送付',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者A' },
  },
  {
    id: 'al-3',
    actor_id: 'admin-2',
    action: 'loan.status.approved',
    target_type: 'loan',
    target_id: 'loan-012',
    detail: null,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者B' },
  },
  {
    id: 'al-4',
    actor_id: 'admin-1',
    action: 'coupon.create',
    target_type: 'coupon',
    target_id: 'coupon-007',
    detail: 'SUMMER10 — 夏キャンペーン10%割引',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者A' },
  },
  {
    id: 'al-5',
    actor_id: 'admin-2',
    action: 'listing.status.closed',
    target_type: 'listing',
    target_id: 'lst-088',
    detail: '利用規約違反の出品を非公開化',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者B' },
  },
  {
    id: 'al-6',
    actor_id: 'admin-1',
    action: 'announcement.publish',
    target_type: 'announcement',
    target_id: 'ann-002',
    detail: 'eKYC必須化のお知らせを公開',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者A' },
  },
  {
    id: 'al-7',
    actor_id: 'admin-2',
    action: 'loan.status.rejected',
    target_type: 'loan',
    target_id: 'loan-009',
    detail: '審査NGのため否決',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者B' },
  },
  {
    id: 'al-8',
    actor_id: 'admin-1',
    action: 'escrow.status.cancelled',
    target_type: 'escrow',
    target_id: 'esc-033',
    detail: '双方合意のもとキャンセル。全額返金処理済み',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    actor: { display_name: '管理者A' },
  },
];

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(300);

  const logs: LogWithActor[] = data && data.length > 0 ? (data as LogWithActor[]) : DEMO_LOGS;

  return (
    <div>
      <h1 className="mb-1 text-xl font-black">監査ログ</h1>
      <p className="mb-4 text-sm text-slate-500">管理操作の記録（最新300件）。改ざん防止のため変更・削除はできません。</p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {logs.map((l) => {
          const href = l.target_id ? TARGET_HREF[l.target_type ?? '']?.(l.target_id) : null;
          return (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <span className="font-bold">{actionLabel(l.action)}</span>
                <span className="ml-2 text-xs text-slate-400">
                  by {l.actor?.display_name ?? '—'}
                  {l.detail && <> — {l.detail}</>}
                  {href && <> ・ <Link href={href} className="text-navy-400 hover:underline">対象</Link></>}
                </span>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatDateTime(l.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
