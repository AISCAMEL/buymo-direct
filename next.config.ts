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
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/signup',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
