import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/types';

export const revalidate = 300;
export const metadata = { title: 'お知らせ | BUYMO C2C' };

const LEVEL_LABEL: Record<string, string> = { info: 'お知らせ', warning: '注意', important: '重要' };
const LEVEL_CLS: Record<string, string> = {
  info: 'bg-navy-50 text-navy-600',
  warning: 'bg-amber-100 text-amber-700',
  important: 'bg-red-100 text-red-700',
};

const DEMO: Announcement[] = [
  {
    id: 'ann-1',
    title: '【重要】本人確認（eKYC）の必須化について',
    body: '2026年6月1日より、出品・購入ともに本人確認の完了が必須となります。早めのお手続きをお願いいたします。',
    level: 'important',
    pinned: true,
    published: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-2',
    title: 'ゴールデンウィーク期間中のサポート対応について',
    body: '4月27日〜5月6日はサポート対応が遅延する場合がございます。お急ぎのお客様はチャットよりご連絡ください。',
    level: 'warning',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-3',
    title: '車両ローン申込機能をリリースしました',
    body: 'BUYMO提携ローンのお申し込みがアプリ内から可能になりました。最短即日審査・最長120回払いに対応しています。',
    level: 'info',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-4',
    title: 'システムメンテナンスのお知らせ（5/15 2:00〜4:00）',
    body: '5月15日深夜2時〜4時にかけてシステムメンテナンスを実施します。この時間帯はご利用いただけません。あらかじめご了承ください。',
    level: 'warning',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-5',
    title: 'BUYMOサービス開始のお知らせ',
    body: 'このたびBUYMO C2C個人間中古車売買マーケットプレイスをリリースしました。安心・安全なエスクロー決済や、名義変更代行サービスをご利用ください。',
    level: 'info',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(100);

  const items: Announcement[] = data && data.length > 0 ? (data as Announcement[]) : DEMO;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-black">お知らせ</h1>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="card p-5">
            <div className="flex items-center gap-2">
              <span className={`badge ${LEVEL_CLS[a.level]}`}>{LEVEL_LABEL[a.level]}</span>
              <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
            </div>
            <h2 className="mt-2 font-bold">{a.title}</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{a.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
