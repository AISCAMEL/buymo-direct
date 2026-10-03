import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, GraduationCap, Users, PlayCircle, ExternalLink, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getViewerAccess } from '@/lib/viewer';
import { BusinessOnlyGate } from '@/components/BusinessOnlyGate';
import { PREMIUM_CATEGORY_LABEL, PREMIUM_CATEGORY_CLS, type PremiumResource } from '@/lib/premium';

export const dynamic = 'force-dynamic';
export const metadata = { title: '有料会員コンテンツ | BUYMO ダイレクト' };

export default async function PremiumPage() {
  const access = await getViewerAccess();
  if (!access.loggedIn) redirect('/login?redirect=/premium');

  // 個人には提供しない
  if (!access.businessTrack) return <BusinessOnlyGate feature="有料会員コンテンツ" source="premium" />;

  // 業者だが未解放（スキル・無料）＝アップセル
  if (!access.premium) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <Crown className="mx-auto h-12 w-12 text-gold-500" />
        <h1 className="text-2xl font-black">有料会員コンテンツ</h1>
        <p className="text-sm text-slate-600">相場・仕入れ情報・限定資料・実践講座は、有料会員・買取加盟店向けです。</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/membership?from=premium" className="btn-accent inline-flex">有料会員のご案内</Link>
          <Link href="/franchise" className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">買取加盟のご案内</Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('premium_resources')
    .select('id, category, title, summary, body, url, published, sort')
    .eq('published', true)
    .order('sort');
  const items = (data ?? []) as PremiumResource[];

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="text-center">
        <Crown className="mx-auto h-9 w-9 text-gold-500" />
        <h1 className="mt-2 text-3xl font-black">有料会員コンテンツ</h1>
        <p className="mt-1 text-sm text-slate-600">買取で利益を出すための、相場・仕入れ・学び・仲間。</p>
      </div>

      {/* ショートカット */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/learn" className="card flex items-center gap-2 p-4 hover:shadow-md"><GraduationCap className="h-5 w-5 text-navy-500" /><span className="font-bold">買取を学ぶ（実践編）</span></Link>
        <Link href="/community" className="card flex items-center gap-2 p-4 hover:shadow-md"><Users className="h-5 w-5 text-navy-500" /><span className="font-bold">買取コミュニティ</span></Link>
        <Link href="/seminar" className="card flex items-center gap-2 p-4 hover:shadow-md"><PlayCircle className="h-5 w-5 text-navy-500" /><span className="font-bold">セミナー</span></Link>
      </div>

      {/* 資料一覧 */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="card p-10 text-center text-sm text-slate-500">コンテンツは準備中です。</p>
        ) : (
          items.map((r) => {
            const inner = (
              <>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold">
                    <span className={`badge ${PREMIUM_CATEGORY_CLS[r.category] ?? 'bg-slate-100 text-slate-600'}`}>{PREMIUM_CATEGORY_LABEL[r.category] ?? r.category}</span>
                    {r.title}
                  </p>
                  {r.summary && <p className="mt-1 text-sm text-slate-500">{r.summary}</p>}
                  {r.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.body}</p>}
                </div>
                {r.url && <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-300" />}
              </>
            );
            return r.url ? (
              <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="card flex items-start justify-between gap-3 p-4 transition hover:shadow-md">{inner}</a>
            ) : (
              <div key={r.id} className="card flex items-start justify-between gap-3 p-4">{inner}</div>
            );
          })
        )}
      </div>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-400">
        <Lock className="h-3 w-3" /> これらは有料会員・加盟店だけが閲覧できます。
      </p>
    </div>
  );
}
