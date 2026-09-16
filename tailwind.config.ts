import type { Config } from 'tailwindcss';

// BUYMO ブランドカラー（ティール基調）
// 主役：ティールグリーン #0F766E ／ 差し色：ミント #14B8A6 ／ 濃地：ディープティール
// 既存コンポーネントは navy-* / accent-* を参照しているため、その色をBUYMOへ差し替える。
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主要色（ボタン・見出し・ロゴ）＝ BUYMO ティールグリーン
        navy: {
          50: '#E6F2EF',
          200: '#ABD7CF',
          400: '#1FA592',
          500: '#0F766E', // primary（BUYMOグリーン）
          600: '#0B5A54', // hover
          700: '#0C3A44', // 濃地（ヘッダー/フッター/濃い見出し）
        },
        // 差し色・ハイライト ＝ BUYMO ミント（バッジ等に白文字が乗る想定で少し濃いめ）
        accent: {
          50: '#E6FAF6',
          500: '#0E9C8C',
          600: '#0B7A70',
        },
        // 強ハイライト用ミント／小差し色ゴールド
        mint: {
          400: '#2DE1BC',
          500: '#14B8A6',
        },
        gold: {
          400: '#E0BD6A',
          500: '#D4AF65',
          600: '#C5A04E',
        },
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
