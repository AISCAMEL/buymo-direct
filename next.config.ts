import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  images: {
    remotePatterns: [
      // Supabase Storage public URLs (project-specific subdomains)
      { protocol: 'https', hostname: '*.supabase.co' },
      // Supabase Storage alternative domain
      { protocol: 'https', hostname: '*.supabase.in' },
      // BUYMO 本体サイトの車種イメージ（デモ出品のサンプル画像に使用）
      { protocol: 'https', hostname: 'buymo.me' },
      // デモ用プレースホルダー画像（アバター等）
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    // Inline critical CSS to reduce render-blocking resources
    optimizeCss: true,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/register', destination: '/signup', permanent: true },
      // 旧 buymo.me（静的サイト）URL からの引き継ぎ（SEO 301）
      { source: '/index.html', destination: '/', permanent: true },
      // コラム：/column/<slug>.html → /column/<slug>
      { source: '/column/soba.html', destination: '/column/soba', permanent: true },
      { source: '/column/jiko.html', destination: '/column/jiko', permanent: true },
      { source: '/column/shorui.html', destination: '/column/shorui', permanent: true },
      { source: '/column/timing.html', destination: '/column/timing', permanent: true },
      { source: '/column/net.html', destination: '/column/net', permanent: true },
      { source: '/column/keitora.html', destination: '/column/keitora', permanent: true },
      { source: '/column/detail.html', destination: '/column', permanent: false },
      // トップレベル .html ページ → 統合先ルート
      { source: '/appraisal.html', destination: '/listings/valuation', permanent: true },
      { source: '/buymo-contact.html', destination: '/contact', permanent: true },
      { source: '/buymo-partner.html', destination: '/dealer/register', permanent: true },
      { source: '/member.html', destination: '/dashboard/listings', permanent: true },
      { source: '/member-guide.html', destination: '/signup', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
      { source: '/tokushoho.html', destination: '/tokushoho', permanent: true },
      { source: '/houjin.html', destination: '/dealers', permanent: true },
    ];
  },
};

export default nextConfig;
