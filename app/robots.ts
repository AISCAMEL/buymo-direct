import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://buymo.me';

// 非公開・内部用（人間・ボット共通でクロール不要）
const DISALLOW = ['/dashboard/', '/admin/', '/escrow/', '/api/', '/messages/', '/auth/'];

// 生成AI・AI検索のクローラー。公開コンテンツをAIの回答に載せたいので明示的に許可。
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',           // OpenAI
  'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'Claude-User', // Anthropic
  'PerplexityBot', 'Perplexity-User',                  // Perplexity
  'Google-Extended',                                   // Google (Gemini / AI Overviews 学習)
  'Applebot-Extended',                                 // Apple
  'Amazonbot', 'Bytespider', 'Meta-ExternalAgent',     // Amazon / TikTok / Meta
  'CCBot', 'cohere-ai', 'Diffbot', 'Timpibot', 'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      // AIクローラーも同条件で明示許可（公開部分はAIの回答・AI検索に載せてOK）
      { userAgent: AI_BOTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
