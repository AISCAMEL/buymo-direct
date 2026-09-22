import Link from 'next/link';
import { Car } from 'lucide-react';

const FOOTER_LINKS = [
  {
    heading: '売る（買取・ダイレクト）',
    links: [
      { label: '無料査定（買取）', href: '/listings/valuation' },
      { label: 'ダイレクト販売で出品', href: '/sell' },
      { label: 'かんたん出品ウィザード', href: '/sell/wizard' },
    ],
  },
  {
    heading: '買う（ダイレクト）',
    links: [
      { label: '車を探す', href: '/listings' },
      { label: 'ジャンルから探す', href: '/genre' },
      { label: 'エリアから探す', href: '/area' },
      { label: '地図から探す', href: '/listings/map' },
      { label: 'ローン審査', href: '/loan/apply' },
      { label: '加盟店一覧', href: '/dealers' },
    ],
  },
  {
    heading: 'サービス',
    links: [
      { label: 'エスクロー決済', href: '/escrow' },
      { label: '名義変更代行', href: '/transfer' },
      { label: '陸送手配', href: '/transport' },
      { label: '加盟店申請', href: '/dealer/register' },
    ],
  },
  {
    heading: '運営',
    links: [
      { label: 'コラム', href: '/column' },
      { label: 'お知らせ', href: '/announcements' },
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
