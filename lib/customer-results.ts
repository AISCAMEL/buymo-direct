// ご利用実績の画像（AI生成）。管理画面で一括生成し、トップに表示する。
import { getAppSetting, setAppSetting } from '@/lib/settings';

export const SETTING_RESULTS = 'customer_results';

// 全画像共通のスタイル（人物中心・写実・正方形）。
export const RESULTS_STYLE =
  'Warm authentic photorealistic photograph for a Japanese used-car marketplace customer-results section, ' +
  'natural daylight, genuine candid smile, shallow depth of field, true-to-life colors, documentary editorial style, ' +
  'must look like a real photo not an illustration or 3D render or CGI, square 1:1 full-bleed, ' +
  'no text no letters no numbers no logos no watermark.';

export type ResultScene = { key: string; label: string; scene: string };

export const RESULT_SCENES: ResultScene[] = [
  { key: 'keys', label: '納車・鍵の受け渡し', scene: 'a smiling Japanese man in his 40s receiving car keys in front of a clean compact car at a bright dealership' },
  { key: 'family', label: 'ご家族でミニバン', scene: 'a happy young Japanese family, parents and two children, standing in front of their minivan in a residential driveway' },
  { key: 'senior', label: 'ご夫婦で軽自動車', scene: 'an elderly Japanese couple smiling beside their kei car in a calm countryside setting' },
  { key: 'woman-suv', label: '女性オーナー×SUV', scene: 'a confident Japanese woman in her 30s leaning on her white SUV in an urban parking area' },
  { key: 'photo', label: '写真査定で出品', scene: 'a young Japanese man photographing his sedan with a smartphone in a sunny parking lot' },
  { key: 'handshake', label: '商談成立', scene: 'a warm handshake between a customer and a friendly staff member next to a car, deal concluded' },
  { key: 'delivery', label: '納車の瞬間', scene: 'a delighted Japanese woman sitting in the driver seat of her newly bought car, hands on the steering wheel' },
  { key: 'keitora', label: '軽トラで活躍', scene: 'a cheerful older Japanese farmer standing beside his kei truck in a rural field' },
  { key: 'first', label: '初めての愛車', scene: 'a proud Japanese man in his 20s standing by his first compact car on a city street' },
  { key: 'paperwork', label: '手続き完了', scene: 'a customer and staff reviewing paperwork at a desk with a car key, relieved happy expression' },
  { key: 'transport', label: '全国へ陸送', scene: 'a car carrier truck delivering a car in front of a Japanese house on a clear day' },
  { key: 'online', label: 'スマホで完結', scene: 'a person relaxing on a sofa at home using a smartphone to sell their car' },
];

/** シーンから完成プロンプトを作る。 */
export function buildResultPrompt(scene: string): string {
  return `${RESULTS_STYLE} Scene: ${scene}.`;
}

/** 保存済みの画像URLマップ（key→url）。 */
export async function getResultUrlMap(): Promise<Record<string, string>> {
  const raw = await getAppSetting(SETTING_RESULTS);
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? (obj as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** 1件分のURLを保存（他は維持）。 */
export async function setResultUrl(key: string, url: string): Promise<{ ok: boolean; error?: string }> {
  const map = await getResultUrlMap();
  map[key] = url;
  return setAppSetting(SETTING_RESULTS, JSON.stringify(map));
}

/** 表示用：URLがあるシーンだけを順番どおりに返す。 */
export async function getCustomerResults(): Promise<{ key: string; label: string; url: string }[]> {
  const map = await getResultUrlMap();
  return RESULT_SCENES.filter((s) => map[s.key]).map((s) => ({ key: s.key, label: s.label, url: map[s.key] }));
}
