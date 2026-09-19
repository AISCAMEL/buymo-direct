import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Landmark, Star, ShieldCheck, Truck, ClipboardList,
  Zap, Phone, Heart, BarChart2, FileCheck, Gift, Shield, Banknote,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: '会員サービス | BUYMO' };

const SERVICES = [
  {
    href: '/dashboard/buyback',
    icon: Banknote,
    label: '買取保証・BUYMO買取',
    desc: '売れなくてもBUYMOが買い取る安心の買取保証。手数料0円・査定無料で最短現金化。',
    badge: '買取',
    color: 'text-gold-600 bg-gold-50',
  },
  {
    href: '/dashboard/appraisal',
    icon: ClipboardList,
    label: '無料車両査定',
    desc: '売却を検討中の車の相場をAIと専門家が無料で査定します。',
    badge: '無料',
    color: 'text-navy-600 bg-navy-50',
  },
  {
    href: '/dashboard/loans',
    icon: Landmark,
    label: 'ローン仮審査',
    desc: '最短即日回答。GMO・ジャックス・アプラスなど複数社に同時申請。',
    badge: null,
    color: 'text-navy-600 bg-navy-50',
  },
  {
    href: '/listings',
    icon: Shield,
    label: '保険料シミュレーター',
    desc: '東京海上日動・損保ジャパン・AIG損保の3社を年齢・無事故年数に応じてリアルタイム比較。',
    badge: '無料',
    color: 'text-accent-600 bg-accent-50',
  },
  {
    href: '/dashboard/transport',
    icon: Truck,
    label: '陸送手配',
    desc: '全国どこへでも。指定日に自宅まで安全にお届けします。',
    badge: null,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    href: '/dashboard/warranty',
    icon: ShieldCheck,
    label: '延長保証',
    desc: 'エンジン・ミッションから全部位まで。3ヶ月〜1年のプランをご用意。',
    badge: 'おすすめ',
    color: 'text-accent-600 bg-accent-50',
  },
  {
    href: '/dashboard/points',
    icon: Gift,
    label: 'ポイント・会員ランク',
    desc: '取引のたびにポイントが貯まり、クーポンと交換できます。',
    badge: null,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    href: '/dashboard/phone',
    icon: Phone,
    label: '電話番号認証',
    desc: '認証で信頼バッジを取得。より多くのユーザーにアピールできます。',
    badge: null,
    color: 'text-slate-600 bg-slate-100',
  },
  {
    href: '/dashboard/kyc',
    icon: FileCheck,
    label: '本人確認（KYC）',
    desc: '本人確認書類を提出して取引の安心感を高めましょう。',
    badge: null,
    color: 'text-slate-600 bg-slate-100',
  },
  {
    href: '/dashboard/listings/boost/select',
    icon: Zap,
    label: '出品ブースト',
    desc: '検索上位に表示されて閲覧数・成約率をアップ。3日〜30日のプラン。',
    badge: null,
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    href: '/dashboard/reviews',
    icon: Star,
    label: '評価・レビュー',
    desc: '過去の取引レビューを確認。高評価が次の取引に繋がります。',
    badge: null,
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    href: '/dashboard/favorites',
    icon: Heart,
    label: 'お気に入り',
    desc: '気になる車をブックマーク。価格変動の通知も受け取れます。',
    badge: null,
    color: 'text-red-600 bg-red-50',
  },
  {
    href: '/dashboard/stats',
    icon: BarChart2,
    label: '出品統計',
    desc: '閲覧数・お気に入り数の推移をグラフで確認。',
    badge: null,
    color: 'text-navy-600 bg-navy-50',
  },
];

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/services');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">会員サービス</h1>
        <p className="mt-1 text-sm text-slate-500">取引をサポートするすべてのサービス</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ href, icon: Icon, label, desc, badge, color }) => (
          <Link key={href} href={href} className="card flex items-start gap-4 p-5 transition hover:shadow-md">
            <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-navy-800">{label}</h2>
                {badge && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge === '買取' ? 'bg-gold-500 text-[#2E2408]' : 'bg-accent-500 text-white'}`}>{badge}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
