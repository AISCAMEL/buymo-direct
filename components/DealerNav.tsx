'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardCheck, Wallet, TrendingUp, Settings, ChevronDown } from 'lucide-react';

type Item = { href: string; label: string };
type Group = { key: string; label: string; icon: typeof Home; items: Item[] };

// 大項目は5つだけ。細かい機能は各グループの中に凝縮する。
const GROUPS: Group[] = [
  { key: 'home', label: 'ホーム', icon: Home, items: [
    { href: '/dealer/dashboard', label: 'ダッシュボード' },
    { href: '/dealer/onboarding', label: 'はじめに・研修' },
  ] },
  { key: 'serve', label: '接客・査定', icon: ClipboardCheck, items: [
    { href: '/dealer/cases', label: '案件' },
    { href: '/dealer/hearing', label: 'ヒアリング' },
    { href: '/dealer/inspections', label: '査定表' },
    { href: '/dealer/qr', label: '店舗QR' },
  ] },
  { key: 'money', label: '売上・お金', icon: Wallet, items: [
    { href: '/dealer/quotes', label: '見積書' },
    { href: '/dealer/invoices', label: '請求書' },
    { href: '/dealer/billing', label: '手数料・請求' },
    { href: '/dealer/listings', label: '在庫管理' },
    { href: '/dealer/auctions', label: 'オークション' },
  ] },
  { key: 'grow', label: '集客・実績', icon: TrendingUp, items: [
    { href: '/dealer/works', label: '作業事例' },
    { href: '/dealer/skills', label: 'スキル・サービス' },
    { href: '/community', label: 'コミュニティ' },
    { href: '/premium', label: '会員コンテンツ' },
    { href: '/dealer/analytics', label: 'アナリティクス' },
  ] },
  { key: 'settings', label: '設定', icon: Settings, items: [
    { href: '/dealer/staff', label: 'スタッフ管理' },
    { href: '/dealer/settings', label: '店舗設定' },
    { href: '/dealer/api-keys', label: 'API・Webhook' },
  ] },
];

function groupOf(path: string): string {
  for (const g of GROUPS) {
    if (g.items.some((i) => path === i.href || path.startsWith(i.href + '/'))) return g.key;
  }
  return 'home';
}

export function DealerNav() {
  const pathname = usePathname() || '/dealer/dashboard';
  const current = groupOf(pathname);
  const [open, setOpen] = useState<string>(current);
  const active = GROUPS.find((g) => g.key === open) ?? GROUPS[0];

  return (
    <nav className="space-y-2">
      {/* 大項目（5つ） */}
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const isCurrent = g.key === current;
          const isOpen = g.key === open;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setOpen(g.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                isOpen
                  ? 'border-accent-500 bg-accent-600 text-white'
                  : isCurrent
                    ? 'border-accent-300 bg-accent-50 text-accent-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {g.label}
              <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* 選択中グループの詳細メニュー */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-2">
        {active.items.map((i) => {
          const isActive = pathname === i.href || pathname.startsWith(i.href + '/');
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                isActive ? 'bg-accent-600 text-white' : 'bg-white text-slate-600 hover:bg-accent-50 hover:text-accent-700'
              }`}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
