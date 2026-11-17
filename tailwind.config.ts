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
          100: '#CFE7E1',
          200: '#ABD7CF',
          400: '#1FA592',
          500: '#0F766E', // primary（BUYMOグリーン）
          600: '#0B5A54', // hover
          700: '#0C3A44', // 濃地（ヘッダー/フッター/濃い見出し）
          800: '#0A2C34', // より濃い見出し
          900: '#071E24', // 最濃（ヒーロー等）
        },
        // 差し色・ハイライト ＝ BUYMO ミント（バッジ等に白文字が乗る想定で少し濃いめ）
        accent: {
          50: '#E6FAF6',
          200: '#A7E4DB',
          400: '#1BB6A4',
          500: '#0E9C8C',
          600: '#0B7A70',
        },
        // 強ハイライト用ミント／小差し色ゴールド
        mint: {
          400: '#2DE1BC',
          500: '#14B8A6',
        },
        gold: {
          50: '#FBF6EA',
          100: '#F6ECD3',
          200: '#EDDBA9',
          400: '#E0BD6A',
          500: '#D4AF65',
          600: '#C5A04E',
        },
        // 支え色（用途の色分け用）。白地で上品に見えるよう彩度は控えめ。
        // 買取・急ぎ＝コーラル／廃車・エコ＝リーフ（sky/violet/amberはTailwind標準色を使用）
        coral: {
          50: '#FDECE8',
          100: '#FBD9D0',
          500: '#EC6A52',
          600: '#D65038',
          700: '#B23B28',
        },
        leaf: {
          50: '#E7F3EC',
          100: '#CDE7D6',
          500: '#4E9A6B',
          600: '#3F8056',
          700: '#357050',
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
