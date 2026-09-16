import Link from 'next/link';
import { Car } from 'lucide-react';

const FOOTER_LINKS = [
  {
    heading: '使い方',
    links: [
      { label: '車を探す', href: '/listings' },
      { label: '出品する', href: '/sell' },
      { label: 'ローン審査', href: '/loan/apply' },
      { label: '加盟店一覧', href: '/dealers' },
    ],
  },
  {
    heading: 'サービス',
    links: [
      { label: 'エスクロー決済', href: '/listings' },
      { label: '名義変更代行', href: '/listings' },
      { label: '無料査定', href: '/listings/valuation' },
      { label: '陸送手配', href: '/transport' },
    ],
  },
  {
    heading: '加盟店',
    links: [
      { label: '加盟店申請', href: '/dealer/register' },
      { label: 'ログイン', href: '/dealer/dashboard' },
      { label: 'API仕様', href: '/dealer/api-keys' },
      { label: 'Webhook', href: '/dealer/settings' },
    ],
  },
  {
    heading: '運営',
    links: [
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: '利用規約', href: '/terms' },
      { label: '特定商取引法', href: '/tokushoho' },
      { label: 'お問い合わせ', href: '/contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy-700 px-4 py-14 text-navy-200">
      <div className="mx-auto max-w-5xl">
        {/* ロゴ + タグライン */}
        <div className="mb-10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-white">
            <Car className="h-6 w-6" />
            <span className="text-lg font-black tracking-tight">
              BUYMO<span className="text-mint-500"> ダイレクト</span>
            </span>
          </div>
          <p className="text-sm">買取保証つき 中古車ダイレクト販売 ／ 合同会社アイズ</p>
        </div>

        {/* リンク（4列） */}
        <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-white">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm transition hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* コピーライト */}
        <div className="border-t border-white/10 pt-6 text-center text-xs text-navy-200">
          © 2026 BUYMO ダイレクト ／ 合同会社アイズ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
