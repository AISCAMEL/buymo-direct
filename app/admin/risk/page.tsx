import Link from 'next/link';
import { ShieldAlert, AlertOctagon, AlertTriangle, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** 検知レベル → リスク表示（GREEN/YELLOW/ORANGE/RED）。 */
const RISK: Record<number, { label: string; cls: string; short: string }> = {
  0: { label: '問題なし', cls: 'bg-emerald-100 text-emerald-700', short: 'GREEN' },
  1: { label: '注意', cls: 'bg-amber-100 text-amber-700', short: 'YELLOW' },
  2: { label: '違反疑い', cls: 'bg-orange-100 text-orange-700', short: 'ORANGE' },
  3: { label: '重大', cls: 'bg-red-100 text-red-700', short: 'RED' },
};
function risk(level: number) {
  return RISK[Math.max(0, Math.min(3, level))] ?? RISK[0];
}

type ModerationEvent = {
  id: string;
  message_id: string | null;
  conversation_id: string | null;
  actor_id: string | null;
  kind: string;
  level: number;
  reasons: string | null;
  original: string | null;
  created_at: string;
};

type ActorAgg = {
  actorId: string;
  name: string;
  count: number;
  maxLevel: number;
  last: string;
};

export default async function AdminRiskPage() {
  const supabase = await createClient();

  // 直近の検知イベント（本部のみ閲覧可・RLSで保護）
  const { data: evData } = await supabase
    .from('moderation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  const events = (evData ?? []) as ModerationEvent[];

  // 送信者名の解決（moderation_events は profiles への FK を持たないため別途取得）
  const actorIds = Array.from(new Set(events.map((e) => e.actor_id).filter(Boolean))) as string[];
  const nameMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', actorIds);
    for (const p of (profs ?? []) as { id: string; display_name: string | null }[]) {
      nameMap.set(p.id, p.display_name ?? '—');
    }
  }

  // ユーザー別リスク集計
  const aggMap = new Map<string, ActorAgg>();
  for (const e of events) {
    if (!e.actor_id) continue;
    const cur = aggMap.get(e.actor_id);
    if (cur) {
      cur.count += 1;
      cur.maxLevel = Math.max(cur.maxLevel, e.level);
      if (e.created_at > cur.last) cur.last = e.created_at;
    } else {
      aggMap.set(e.actor_id, {
        actorId: e.actor_id,
        name: nameMap.get(e.actor_id) ?? '—',
        count: 1,
        maxLevel: e.level,
        last: e.created_at,
      });
    }
  }
  const actors = Array.from(aggMap.values()).sort(
    (a, b) => b.maxLevel - a.maxLevel || b.count - a.count || (a.last < b.last ? 1 : -1)
  );

  const total = events.length;
  const redCount = events.filter((e) => e.level >= 3).length;
  const orangeCount = events.filter((e) => e.level === 2).length;
  const flaggedUsers = actors.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <ShieldAlert className="h-5 w-5 text-red-600" />
        <div>
          <p className="text-sm font-black text-red-700">AIリスクセンター</p>
          <p className="text-xs text-red-600/80">
            外部連絡先の交換・プラットフォーム外取引・手数料回避などの検知を集約します。原文（マスク前）は本部のみ確認できます。
          </p>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-3 text-center">
          <p className="text-xl font-black text-slate-700">{total}</p>
          <p className="text-xs text-slate-500">検知イベント</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`text-xl font-black ${redCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>{redCount}</p>
          <p className="text-xs text-slate-500">重大 (RED)</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`text-xl font-black ${orangeCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{orangeCount}</p>
          <p className="text-xs text-slate-500">違反疑い (ORANGE)</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xl font-black text-slate-700">{flaggedUsers}</p>
          <p className="text-xs text-slate-500">検知対象ユーザー</p>
        </div>
      </div>

      {/* ユーザー別リスク */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <AlertOctagon className="h-5 w-5 text-red-500" />
          リスクの高いユーザー
        </h2>
        {actors.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">検知対象のユーザーはいません。</p>
        ) : (
          <ul className="space-y-2">
            {actors.map((a) => {
              const r = risk(a.maxLevel);
              return (
                <li key={a.actorId} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold">
                      <span className={`badge mr-2 ${r.cls}`}>{r.short}</span>
                      {a.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      検知 {a.count} 件 ・ 最終 {formatDateTime(a.last)}
                    </p>
                  </div>
                  <Link
                    href={`/users/${a.actorId}`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    プロフィールを見る
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 検知イベント一覧 */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          検知イベント（直近{events.length}件）
        </h2>
        {events.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">検知イベントはまだありません。</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const r = risk(e.level);
              return (
                <li key={e.id} className={`card p-4 ${e.level >= 3 ? 'border-red-200' : e.level === 2 ? 'border-orange-200' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        <span className={`badge mr-2 ${r.cls}`}>{r.short}・{r.label}</span>
                        {e.reasons ?? '検知'}
                      </p>
                      {e.original && (
                        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                          <span className="mr-1 text-xs font-bold text-slate-400">原文:</span>
                          {e.original}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        送信者: {e.actor_id ? (nameMap.get(e.actor_id) ?? '—') : '—'} ・ {formatDateTime(e.created_at)}
                      </p>
                    </div>
                    {e.conversation_id && (
                      <Link
                        href={`/admin/messages/${e.conversation_id}`}
                        className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        会話を見る
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
