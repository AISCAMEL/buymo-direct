'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessagesSquare, Wallet, Heart, UserCog, Menu, X,
  Store, Shield, GraduationCap,
} from 'lucide-react';

type Item = { href: string; label: string };
type Group = { key: string; label: string; icon: typeof LayoutDashboard; items: Item[] };

const GROUPS: Group[] = [
  { key: 'home', label: 'マイページ', icon: LayoutDashboard, items: [
    { href: '/dashboard/listings', label: '出品管理' },
    { href: '/dashboard/stats', label: 'アナリティクス' },
    { href: '/dashboard/points', label: 'ポイント' },
  ] },
  { key: 'deal', label: '取引・やりとり', icon: MessagesSquare, items: [
    { href: '/messages', label: 'メッセージ' },
    { href: '/dashboard/cases', label: '案件' },
    { href: '/dashboard/offers', label: 'オファー' },
    { href: '/dashboard/appointments', label: '来店・訪問予約' },
  ] },
  { key: 'money', label: 'お金・書類', icon: Wallet, items: [
    { href: '/dashboard/quotes', label: '見積' },
    { href: '/dashboard/invoices', label: '請求書' },
    { href: '/dashboard/loans', label: 'ローン' },
    { href: '/dashboard/warranty', label: '保証' },
  ] },
  { key: 'buy', label: '買う・集める', icon: Heart, items: [
    { href: '/dashboard/favorites', label: 'お気に入り' },
    { href: '/dashboard/searches', label: '保存した検索' },
    { href: '/dashboard/parts', label: 'パーツ出品・入札' },
  ] },
  { key: 'account', label: '本人確認・設定', icon: UserCog, items: [
    { href: '/dashboard/profile', label: 'プロフィール' },
    { href: '/dashboard/kyc', label: '本人確認' },
    { href: '/dashboard/phone', label: '電話認証' },
    { href: '/dashboard/reviews', label: '評価・レビュー' },
    { href: '/dashboard/settings', label: '通知・メール設定' },
  ] },
];

export function DashboardSidebar({
  isDealer = false,
  isAdmin = false,
  businessTrack = false,
}: {
  isDealer?: boolean;
  isAdmin?: boolean;
  businessTrack?: boolean;
}) {
  const pathname = usePathname() || '/dashboard/listings';
  const [open, setOpen] = useState(false); // モバイル用トグル

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const extra: Item[] = [];
  if (businessTrack) {
    extra.push({ href: '/dealers', label: '車のプロを探す' });
    extra.push({ href: '/learn', label: '買取を学ぶ' });
    extra.push({ href: '/community', label: 'コミュニティ' });
  }

  const nav = (
    <nav className="space-y-4">
      {GROUPS.map((g) => {
        const Icon = g.icon;
        return (
          <div key={g.key}>
            <p className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
              <Icon className="h-3.5 w-3.5" />{g.label}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                      isActive(i.href) ? 'bg-accent-600 text-white' : 'text-slate-600 hover:bg-accent-50 hover:text-accent-700'
                    }`}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {(extra.length > 0 || isDealer || isAdmin) && (
        <div className="border-t border-slate-200 pt-3">
          <ul className="space-y-0.5">
            {extra.map((i) => (
              <li key={i.href}>
                <Link href={i.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-1.5 text-sm font-bold transition ${isActive(i.href) ? 'bg-accent-600 text-white' : 'text-slate-600 hover:bg-accent-50 hover:text-accent-700'}`}>
                  {i.label}
                </Link>
              </li>
            ))}
            {isDealer && (
              <li>
                <Link href="/dealer/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-navy-700 hover:bg-navy-50">
                  <Store className="h-4 w-4" /> 加盟店ポータル
                </Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-accent-600 hover:bg-accent-50">
                  <Shield className="h-4 w-4" /> 運営管理
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* モバイル：メニュー開閉ボタン */}
      <div className="mb-3 lg:hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} メニュー
        </button>
        {open && <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">{nav}</div>}
      </div>

      {/* PC：左サイドバー（常時表示） */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 flex items-center gap-1.5 px-2 text-sm font-black text-navy-800">
            <GraduationCap className="h-4 w-4 text-accent-600" /> マイメニュー
          </p>
          {nav}
        </div>
      </aside>
    </>
  );
}
