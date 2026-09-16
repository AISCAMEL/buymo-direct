import type { Metadata } from 'next';
import Link from 'next/link';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationRefresher } from '@/components/NotificationRefresher';
import { BottomNav } from '@/components/BottomNav';
import { AiChatWidget } from '@/components/AiChatWidget';
import { CompareBar } from '@/components/CompareBar';
import { createClient } from '@/lib/supabase/server';
import type { Announcement } from '@/lib/types';
import { validateEnv } from '@/lib/env';

// Validate required environment variables at server startup.
// Throws immediately on missing vars so misconfigured deployments fail fast.
validateEnv();

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me'),
  title: {
    default: 'BUYMO ダイレクト | 買取保証つき 中古車ダイレクト販売',
    template: '%s | BUYMO',
  },
  description:
    '買取保証つきで安心の中古車ダイレクト販売。オンラインで完結、全国どこでもOK。出品・検索・チャット・エスクロー決済・名義変更まで、BUYMOがまるごとサポート。',
  openGraph: {
    siteName: 'BUYMO ダイレクト',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  manifest: '/manifest.json',
  themeColor: '#0F766E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BUYMO',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: banner } = await supabase
    .from('announcements')
    .select('id, title, level')
    .eq('published', true)
    .eq('pinned', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const ann = banner as Pick<Announcement, 'id' | 'title' | 'level'> | null;

  const {
    data: { user: navUser },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja" className={noto.variable}>
      <body className="pb-16 sm:pb-0">
        {ann && <AnnouncementBanner id={ann.id} title={ann.title} level={ann.level} />}
        <Header />
        {navUser && <NotificationRefresher userId={navUser.id} />}
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-6">{children}</main>
        <BottomNav />
        <CompareBar />
        <AiChatWidget />
        <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
          <p>BUYMO ダイレクト — 買取保証つき 中古車ダイレクト販売</p>
          <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-navy-400">
            <Link href="/announcements" className="hover:underline">お知らせ</Link>
            <Link href="/terms" className="hover:underline">利用規約</Link>
            <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="hover:underline">特定商取引法に基づく表記</Link>
          </nav>
          <p className="mt-2 text-xs">※ 本サイトはデモ実装です。決済・名義変更は連携先サービスを通じて行われます。</p>
        </footer>
      </body>
    </html>
  );
}
