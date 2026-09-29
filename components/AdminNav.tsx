'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: '概要',
    items: [
      { href: '/admin', label: 'ダッシュボード' },
      { href: '/admin/analytics', label: 'アナリティクス' },
    ],
  },
  {
    title: '取引・出品',
    items: [
      { href: '/admin/listings', label: '出品モデレーション' },
      { href: '/admin/escrow', label: '取引監視' },
      { href: '/admin/invoices', label: '請求・入金管理' },
      { href: '/admin/billing', label: '手数料請求' },
    ],
  },
  {
    title: '審査・申込',
    items: [
      { href: '/admin/buyback', label: '買取保証審査' },
      { href: '/admin/appraisals', label: '査定依頼' },
      { href: '/admin/valuations', label: '査定履歴' },
      { href: '/admin/loans', label: 'ローン審査' },
      { href: '/admin/warranty', label: '保証見積り' },
      { href: '/admin/transport', label: '陸送申込' },
      { href: '/admin/kyc', label: '本人確認審査' },
    ],
  },
  {
    title: '安全・サポート',
    items: [
      { href: '/admin/messages', label: 'チャット監視' },
      { href: '/admin/risk', label: 'AIリスクセンター' },
      { href: '/admin/reports', label: '通報' },
      { href: '/admin/contact', label: 'お問い合わせ' },
    ],
  },
  {
    title: '運営設定',
    items: [
      { href: '/admin/announcements', label: 'お知らせ' },
      { href: '/admin/coupons', label: 'クーポン管理' },
      { href: '/admin/dealers', label: '加盟店管理' },
      { href: '/admin/leads', label: '加盟店・プロ希望' },
      { href: '/admin/learn', label: '学習コンテンツ' },
      { href: '/admin/audit', label: '監査ログ' },
      { href: '/admin/settings', label: '料金設定' },
      { href: '/admin/seed', label: 'デモデータ' },
    ],
  },
];

const ALL_ITEMS: Item[] = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* モバイル：横スクロールの1行 */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {ALL_ITEMS.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold transition ${
                active
                  ? 'border-navy-500 bg-navy-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* デスクトップ：グループ分けの縦サイドバー */}
      <nav className="hidden lg:block">
        <div className="sticky top-20 space-y-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.title}</p>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`flex items-center rounded-lg px-3 py-2 text-sm font-bold transition ${
                        active
                          ? 'bg-navy-500 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
