import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationRefresher } from '@/components/NotificationRefresher';
import { BottomNav } from '@/components/BottomNav';
import { AiChatWidget } from '@/components/AiChatWidget';
import { CompareBar } from '@/components/CompareBar';
import { createClient } from '@/lib/supabase/server';
import type { Announcement } from '@/lib/types';
import { validateEnv } from '@/lib/env';
import { OPERATOR } from '@/lib/operator';

// Validate required environment variables at server startup.
// Throws immediately on missing vars so misconfigured deployments fail fast.
validateEnv();

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
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
  keywords: [
    '中古車', '中古車 個人売買', '中古車 ダイレクト販売', '中古車 オンライン',
    '車 個人間売買', '車 買取', '買取保証', 'エスクロー 中古車', '名義変更代行',
    '車庫証明 代行', '陸送 車', '故障保証 中古車', 'マイカーローン', '中古車 通販',
    'BUYMO', 'バイモ', '合同会社アイズ',
  ],
  applicationName: 'BUYMO ダイレクト',
  authors: [{ name: '合同会社アイズ' }],
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
  const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? OPERATOR.url;

  const {
    data: { user: navUser },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja" className={noto.variable}>
      <body className="pb-16 sm:pb-0">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': ['Organization', 'AutoDealer'],
                  '@id': `${SITE}/#org`,
                  name: OPERATOR.brandName,
                  legalName: OPERATOR.companyName,
                  url: SITE,
                  email: OPERATOR.email,
                  areaServed: 'JP',
                  knowsAbout: [
                    '中古車', '中古車の個人間売買', 'ダイレクト販売', 'エスクロー決済',
                    '名義変更代行', '車庫証明代行', '陸送', '故障保証', 'マイカーローン', '買取保証',
                  ],
                  address: {
                    '@type': 'PostalAddress',
                    addressCountry: 'JP',
                    addressRegion: '福島県',
                    streetAddress: OPERATOR.address,
                  },
                  founder: { '@type': 'Person', name: OPERATOR.representative },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE}/#website`,
                  url: SITE,
                  name: OPERATOR.serviceName,
                  inLanguage: 'ja-JP',
                  publisher: { '@id': `${SITE}/#org` },
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/listings?q={search_term_string}` },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />
        {ann && <AnnouncementBanner id={ann.id} title={ann.title} level={ann.level} />}
        <Header />
        {navUser && <NotificationRefresher userId={navUser.id} />}
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 py-6">{children}</main>
        <BottomNav />
        <CompareBar />
        <AiChatWidget />
        <Footer />
      </body>
    </html>
  );
}
