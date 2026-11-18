// ジャンルのアイコン画像（AI生成）。管理画面で一括生成し、トップの「車種・ジャンルから探す」に表示する。
// 未生成のジャンルは lucide アイコンにフォールバックする。
import { getAppSetting, setAppSetting } from '@/lib/settings';

export const SETTING_GENRE_ICONS = 'genre_icons';

// 全アイコン共通のスタイル（フラットなアイコン絵・ティール/ミント・統一感重視）。
export const ICON_STYLE =
  'Flat minimalist vector icon illustration for a Japanese used-car marketplace, a single centered car, ' +
  'simple clean geometric shapes, deep teal (#0F766E) and soft mint (#12B3A0) color palette, ' +
  'very light mint solid background, consistent thick rounded strokes and even line weight, ' +
  'modern friendly app-icon style, three-quarter front-side view, centered with generous even padding, ' +
  'square 1:1, no text no letters no numbers no logo no watermark, not a photo, no realistic 3D render.';

export type GenreIcon = { key: string; label: string; scene: string };

// key は app/page.tsx の GENRE_ICON / ジャンル slug と一致させる。
export const GENRE_ICONS: GenreIcon[] = [
  { key: 'kei', label: '軽自動車', scene: 'a small tall boxy kei mini car' },
  { key: 'suv', label: 'SUV', scene: 'a rugged SUV with roof rails and big wheels' },
  { key: 'minivan', label: 'ミニバン', scene: 'a roomy family minivan one-box shape' },
  { key: 'alphard', label: 'アルファード', scene: 'a large premium luxury minivan with a bold front grille' },
  { key: 'hiace', label: 'ハイエース', scene: 'a commercial one-box cargo van' },
  { key: 'prius', label: 'プリウス', scene: 'a sleek hybrid sedan with a small green leaf accent' },
  { key: 'jimny', label: 'ジムニー', scene: 'a boxy off-road four-by-four with chunky tires' },
  { key: 'jiko', label: '事故車', scene: 'a car with a wrench, accident and repair theme' },
  { key: 'haisha', label: '廃車', scene: 'a car with circular recycle arrows around it, scrap and recycle theme' },
  { key: 'ev', label: 'EV・電気自動車', scene: 'an electric car with a charging plug and a small lightning bolt' },
  { key: 'import', label: '輸入車', scene: 'a car with a small globe accent, imported car theme' },
  { key: 'truck', label: 'トラック', scene: 'a simple cargo truck, side view' },
];

/** シーンから完成プロンプトを作る。 */
export function buildIconPrompt(scene: string): string {
  return `${ICON_STYLE} Subject: ${scene}.`;
}

/** 保存済みのアイコンURLマップ（key→url）。 */
export async function getGenreIconMap(): Promise<Record<string, string>> {
  const raw = await getAppSetting(SETTING_GENRE_ICONS);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? (obj as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** 1件分のURLを保存（他は維持）。 */
export async function setGenreIconUrl(key: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const map = await getGenreIconMap();
  map[key] = url;
  return setAppSetting(SETTING_GENRE_ICONS, JSON.stringify(map));
}
