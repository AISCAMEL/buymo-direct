import Link from 'next/link';
import { ShieldAlert, Building2, User } from 'lucide-react';

const ROLES = [
  {
    href: '/demo/admin',
    icon: ShieldAlert,
    label: '本部管理画面',
    desc: '加盟店審査・出品モデレーション・取引監視・KYC審査・クーポン管理',
    color: 'border-red-200 hover:border-red-400 hover:bg-red-50',
    badge: 'bg-red-600',
  },
  {
    href: '/demo/dealer',
    icon: Building2,
    label: '加盟店管理画面',
    desc: 'ダッシュボード・在庫管理・スタッフ管理・月次アナリティクス・API キー / Webhook',
    color: 'border-navy-200 hover:border-navy-400 hover:bg-navy-50',
    badge: 'bg-navy-600',
  },
  {
    href: '/demo/seller',
    icon: User,
    label: '売主会員マイページ',
    desc: '出品管理・エスクロー取引・メッセージ・電話認証・お気に入り',
    color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    badge: 'bg-emerald-600',
  },
];

export default function DemoIndexPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-black text-navy-800">BUYMO ダイレクト デモ</h1>
        <p className="mt-2 text-slate-500">体験したいロールを選択してください</p>
      </div>
      <div className="space-y-4">
        {ROLES.map(({ href, icon: Icon, label, desc, color, badge }) => (
          <Link key={href} href={href} className={`card flex items-start gap-4 border-2 p-6 transition ${color}`}>
            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${badge}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-black text-navy-800">{label}</p>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
