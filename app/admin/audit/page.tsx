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
    'pricing.update': '料金・係数設定を変更',
    'dealer.commission': '加盟店の手数料率を変更',
    'dealer.suspend': '加盟店を停止',
    'dealer.reinstate': '加盟店を再開',
    'member.tier.paid': '有料会員にした',
    'member.tier.free': '無料会員に戻した',
    'membership.approve': '有料会員を承認',
    'membership.reject': '有料会員を却下',
    'lead.convert': 'リードを加盟店化',
  };
  return map[action] ?? action;
}

function shortVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** before/after の変化した項目のみ抽出（トップレベル・浅い比較）。 */
function diffFields(before: unknown, after: unknown): { key: string; from: string; to: string }[] {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const out: { key: string; from: string; to: string }[] = [];
  for (const k of keys) {
    const fv = shortVal(b[k]);
    const tv = shortVal(a[k]);
    if (fv !== tv) out.push({ key: k, from: fv, to: tv });
  }
  return out;
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

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(300);

  const logs: LogWithActor[] = (data ?? []) as LogWithActor[];

  return (
    <div>
      <h1 className="mb-1 text-xl font-black">監査ログ</h1>
      <p className="mb-4 text-sm text-slate-500">管理操作の記録（最新300件）。改ざん防止のため変更・削除はできません。</p>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {logs.map((l) => {
          const href = l.target_id ? TARGET_HREF[l.target_type ?? '']?.(l.target_id) : null;
          const lx = l as LogWithActor & { before?: unknown; after?: unknown };
          const changes = diffFields(lx.before, lx.after);
          return (
            <li key={l.id} className="px-4 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold">{actionLabel(l.action)}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    by {l.actor?.display_name ?? '—'}
                    {l.detail && <> — {l.detail}</>}
                    {href && <> ・ <Link href={href} className="text-navy-400 hover:underline">対象</Link></>}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDateTime(l.created_at)}</span>
              </div>
              {changes.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-bold text-navy-500">変更前 → 変更後（{changes.length}項目）</summary>
                  <ul className="mt-1 space-y-0.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {changes.map((c) => (
                      <li key={c.key} className="flex flex-wrap gap-1">
                        <span className="font-bold text-slate-500">{c.key}:</span>
                        <span className="text-red-500 line-through">{c.from}</span>
                        <span>→</span>
                        <span className="font-bold text-emerald-600">{c.to}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
