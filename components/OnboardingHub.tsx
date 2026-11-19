'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, PlayCircle, ArrowRight, GraduationCap } from 'lucide-react';
import { toVideoEmbed } from '@/lib/video';
import type { OnboardingStep } from '@/lib/onboarding';

function VideoBox({ url }: { url: string | null }) {
  const info = toVideoEmbed(url);
  if (!info) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-400">
        <span><PlayCircle className="mx-auto mb-1 h-7 w-7" />動画は準備中です（下の内容で進められます）</span>
      </div>
    );
  }
  if (info.kind === 'file') {
    return <video controls className="aspect-video w-full rounded-xl bg-black" src={info.src} />;
  }
  if (info.kind === 'link') {
    return <a href={info.src} target="_blank" rel="noopener" className="btn-accent inline-flex items-center gap-1.5"><PlayCircle className="h-4 w-4" />動画を見る</a>;
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe className="h-full w-full" src={info.src} title="研修動画" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  );
}

export function OnboardingHub({
  steps,
  videos,
  dealerId,
  storeName,
}: {
  steps: OnboardingStep[];
  videos: Record<string, string | null>;
  dealerId: string;
  storeName: string;
}) {
  const LS = 'buymo_onboarding_' + dealerId;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(LS) || '{}') || {}); } catch { /* noop */ }
    setLoaded(true);
  }, [LS]);

  function toggle(key: string) {
    setDone((d) => {
      const next = { ...d, [key]: !d[key] };
      try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }

  const total = steps.length;
  const completed = steps.filter((s) => done[s.key]).length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 進捗 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent-600" />
          <span className="font-black text-navy-800">研修の進み：{completed} / {total}</span>
          <span className="ml-auto text-sm font-black tabular-nums text-accent-700">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: (loaded ? pct : 0) + '%' }} />
        </div>
        {completed === total && total > 0 && (
          <p className="mt-2 text-sm font-bold text-emerald-600">🎉 研修完了です！{storeName} さんのご活躍を応援しています。</p>
        )}
      </div>

      {/* 章ごと */}
      {steps.map((s) => {
        const isDone = !!done[s.key];
        return (
          <div key={s.key} className={`rounded-2xl border p-4 shadow-sm transition ${isDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
            <div className="mb-3 flex items-start gap-2">
              <button onClick={() => toggle(s.key)} aria-label="完了にする" className="mt-0.5 shrink-0">
                {isDone ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className="h-6 w-6 text-slate-300" />}
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-navy-800">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.summary}</p>
              </div>
            </div>

            <VideoBox url={videos[s.key] ?? null} />

            <ul className="mt-3 space-y-1">
              {s.points.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />{p}
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {s.href && (
                <Link href={s.href} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  {s.hrefLabel ?? '開く'}<ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <button onClick={() => toggle(s.key)} className={`ml-auto rounded-lg px-3 py-1.5 text-xs font-bold ${isDone ? 'bg-slate-100 text-slate-500' : 'bg-accent-600 text-white hover:bg-accent-700'}`}>
                {isDone ? '完了済み（戻す）' : '✓ この章を完了にする'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
