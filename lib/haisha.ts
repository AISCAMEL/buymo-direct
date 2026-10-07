// 廃車買取の価格エンジン（全国買取価格表ベース）と還付金・必要書類の算定。
// 価格は「全国買取価格表（都道府県 × 排気量区分）」を基準額とし、その場提示額は基準額 − ¥5,000。
// 還付金（自動車税・重量税・自賠責）は買取価格とは別枠で概算する。

export const HAISHA_OFFER_DISCOUNT = 5000;

// 排気量区分（全国買取価格表の列）
export const DISP_CLASSES = [
  '軽',
  '〜1,300cc',
  '1,301〜1,800cc',
  '1,801〜2,000cc',
  '2,001〜2,500cc',
  '2,501〜3,000cc',
  '3,001cc〜',
] as const;

// 全国買取価格表（画像の数値をそのまま数値化）。列順は DISP_CLASSES に対応。
export const PRICE_TABLE: Record<string, number[]> = {
  北海道: [8000, 15000, 15000, 20000, 20000, 20000, 25000],
  青森県: [5000, 15000, 20000, 20000, 25000, 25000, 25000],
  秋田県: [5000, 15000, 20000, 20000, 25000, 25000, 25000],
  岩手県: [5000, 15000, 20000, 20000, 25000, 25000, 25000],
  山形県: [5000, 15000, 20000, 20000, 25000, 25000, 25000],
  宮城県: [10000, 15000, 20000, 25000, 30000, 35000, 40000],
  福島県: [5000, 15000, 20000, 20000, 25000, 25000, 25000],
  東京都: [12000, 20000, 25000, 30000, 35000, 40000, 40000],
  埼玉県: [12000, 20000, 25000, 30000, 35000, 40000, 40000],
  千葉県: [12000, 20000, 25000, 30000, 35000, 40000, 40000],
  栃木県: [10000, 15000, 20000, 25000, 30000, 30000, 35000],
  茨城県: [10000, 15000, 20000, 25000, 30000, 30000, 35000],
  山梨県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  神奈川県: [12000, 20000, 25000, 30000, 35000, 40000, 40000],
  新潟県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  群馬県: [10000, 15000, 20000, 25000, 30000, 30000, 35000],
  長野県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  静岡県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  愛知県: [10000, 15000, 20000, 25000, 25000, 30000, 30000],
  岐阜県: [10000, 15000, 20000, 25000, 25000, 30000, 30000],
  富山県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  石川県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  福井県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  和歌山県: [15000, 20000, 30000, 40000, 50000, 55000, 60000],
  奈良県: [15000, 20000, 30000, 40000, 50000, 55000, 60000],
  滋賀県: [10000, 15000, 20000, 25000, 30000, 35000, 35000],
  大阪府: [15000, 20000, 30000, 40000, 50000, 55000, 60000],
  '京都府 日本海側': [10000, 15000, 20000, 25000, 30000, 35000, 35000],
  '京都府 太平洋側': [15000, 20000, 30000, 40000, 50000, 55000, 60000],
  '兵庫県 日本海側': [10000, 15000, 20000, 25000, 30000, 35000, 35000],
  '兵庫県 太平洋側': [15000, 20000, 30000, 40000, 50000, 55000, 60000],
  香川県: [8000, 15000, 20000, 20000, 25000, 25000, 25000],
  愛媛県: [8000, 15000, 20000, 20000, 25000, 25000, 25000],
  高知県: [8000, 15000, 20000, 20000, 25000, 25000, 25000],
  徳島県: [8000, 15000, 20000, 20000, 25000, 25000, 25000],
  鳥取県: [10000, 15000, 20000, 25000, 30000, 30000, 30000],
  島根県: [10000, 15000, 20000, 25000, 30000, 30000, 30000],
  岡山県: [10000, 15000, 20000, 25000, 30000, 30000, 30000],
  広島県: [10000, 15000, 20000, 25000, 30000, 30000, 30000],
  山口県: [13000, 20000, 20000, 30000, 35000, 35000, 35000],
  福岡県: [12000, 20000, 25000, 30000, 35000, 38000, 40000],
  佐賀県: [12000, 20000, 25000, 30000, 35000, 38000, 40000],
  大分県: [12000, 20000, 25000, 30000, 35000, 38000, 40000],
  熊本県: [10000, 18000, 20000, 30000, 35000, 35000, 40000],
  長崎県: [10000, 18000, 20000, 30000, 35000, 40000, 45000],
  宮崎県: [10000, 15000, 20000, 25000, 30000, 35000, 40000],
  鹿児島県: [8000, 15000, 20000, 20000, 25000, 25000, 30000],
  沖縄県: [10000, 15000, 15000, 20000, 20000, 20000, 20000],
};

// 注記（対応不可エリア有・一部減額など）
export const PREF_NOTE: Record<string, string> = {
  岐阜県: '対応不可エリア有',
  石川県: '対応不可エリア有',
  和歌山県: '一部エリア減額',
  奈良県: '一部エリア減額',
  島根県: '一部エリア減額',
};

// 全国買取価格表に無い県（料金表対象外＝別途見積り）
export const OUT_OF_TABLE: string[] = ['三重県'];

// 地域（日本海側/太平洋側）の選択が必要な県
export const SIDE_PREFS: string[] = ['京都府', '兵庫県'];

// セレクト表示順（47都道府県）
export const PREF_ORDER: string[] = [
  '北海道', '青森県', '秋田県', '岩手県', '山形県', '宮城県', '福島県',
  '東京都', '埼玉県', '千葉県', '栃木県', '茨城県', '山梨県', '神奈川県',
  '新潟県', '群馬県', '長野県', '静岡県', '愛知県', '岐阜県', '富山県', '石川県', '福井県', '三重県',
  '和歌山県', '奈良県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '香川県', '愛媛県', '高知県', '徳島県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '福岡県', '佐賀県', '大分県', '熊本県', '長崎県', '宮崎県', '鹿児島県', '沖縄県',
];

// 欠品・不足の減額（目安）。※実際は車両確認後に確定
const MISSING_CUT: Record<string, number> = {
  battery: 2000,
  muffler: 8000,
  tire: 3000,
  ext: 3000,
  doc: 3000,
};

// リサイクル料金（概算・未預託時の差引用）。排気量区分indexで引く。
const RECYCLE_FEE: Record<number, number> = { 0: 7000, 1: 9000, 2: 11000, 3: 12000, 4: 14000, 5: 16000, 6: 18000 };

// 還付金の概算用テーブル（排気量区分index）
const JIDOSHA_ZEI: Record<number, number> = { 0: 0, 1: 30500, 2: 36000, 3: 36000, 4: 43500, 5: 50000, 6: 57000 }; // 自動車税 年額（軽は月割還付なし）
const JURYO_ZEI_Y: Record<number, number> = { 0: 3300, 1: 8200, 2: 12300, 3: 16400, 4: 16400, 5: 20500, 6: 24600 }; // 重量税 年相当（概算）
const JIBAI_MONTH = { kei: 840, normal: 950 }; // 自賠責 月額（概算）

// 表示ラベル
export const OWNER_LABELS: Record<string, string> = {
  self: '本人（所有者）',
  user: '本人（使用者・所有者は別）',
  lien: '所有権留保（ローン・信販・ディーラー）',
  deceased: '名義人が死亡（相続）',
  other: '親族・法人名義など',
};
export const RUN_LABELS: Record<string, string> = {
  run: '自走できる',
  idle: '始動するが不動',
  nostart: 'エンジン始動不可',
  accident: '事故・損傷大',
  flood: '水没・冠水',
  burn: '火災・全焼',
};
export const MISSING_LABELS: Record<string, string> = {
  battery: 'バッテリー欠品',
  muffler: 'マフラー・触媒欠品',
  tire: 'タイヤ・ホイールなし',
  ext: '外装パーツ欠品',
  engine: 'エンジン・ミッションなし',
  doc: '車検証なし（再発行）',
  recycle: 'リサイクル料金 未預託',
};
export const MILEAGE_OPTIONS = [
  '〜1万km', '〜3万km', '〜5万km', '〜7万km', '〜10万km',
  '〜15万km', '〜20万km', '〜30万km', '〜40万km', '〜50万km', '50万km超',
];

export type HaishaInput = {
  pref: string;
  side?: string; // 京都府/兵庫県のとき '日本海側' | '太平洋側'
  dispIdx: number;
  mileage?: string;
  run?: string;
  key?: string; // 'ok' | 'nokey'
  shakenMonths?: number;
  rep?: string; // 'yes' | 'no'
  missing?: string[];
  owner?: string;
  matsu?: string; // 'eikyu' | 'ichiji'
};

export type PriceLine = { label: string; amount: number; base?: boolean };
export type HaishaPrice = {
  outOfTable: boolean;
  base: number;
  lines: PriceLine[];
  offer: number;
  blocked: boolean; // 引取不可/別途査定の可能性
  warnings: string[];
};

/** 全国買取価格表から基準額を引く（対象外は null）。 */
export function lookupBase(pref: string, side: string | undefined, dispIdx: number): number | null {
  if (OUT_OF_TABLE.includes(pref)) return null;
  const key = SIDE_PREFS.includes(pref) ? `${pref} ${side ?? '太平洋側'}` : pref;
  const row = PRICE_TABLE[key];
  if (!row) return null;
  return row[dispIdx] ?? null;
}

/** その場提示 買取額の内訳を算定（基準額 − ¥5,000 − 欠品・状態の減額）。 */
export function calcHaishaPrice(input: HaishaInput): HaishaPrice {
  const base = lookupBase(input.pref, input.side, input.dispIdx);
  if (base === null) {
    return { outOfTable: true, base: 0, lines: [], offer: 0, blocked: true, warnings: [] };
  }
  const lines: PriceLine[] = [{ label: '全国買取価格（基準額）', amount: base, base: true }];
  lines.push({ label: 'その場提示割引', amount: -HAISHA_OFFER_DISCOUNT });

  let blocked = false;
  const warnings: string[] = [];
  const missing = input.missing ?? [];
  for (const m of missing) {
    if (m === 'engine') {
      blocked = true;
      warnings.push('エンジン・ミッションなし → 引取不可または別途査定');
    } else if (m === 'recycle') {
      lines.push({ label: 'リサイクル料金 未預託 差引', amount: -(RECYCLE_FEE[input.dispIdx] ?? 0) });
    } else if (MISSING_CUT[m] != null) {
      lines.push({ label: `${MISSING_LABELS[m]} 減額`, amount: -MISSING_CUT[m] });
    }
  }
  if (input.run === 'accident') lines.push({ label: '事故・損傷大 減額', amount: -5000 });
  if (input.run === 'flood') { blocked = true; warnings.push('水没・冠水 → 別途査定'); }
  if (input.run === 'burn') { blocked = true; warnings.push('火災・全焼 → 別途査定'); }
  if (input.key === 'nokey') lines.push({ label: '鍵なし 減額', amount: -2000 });

  const offer = Math.max(0, lines.reduce((s, l) => s + l.amount, 0));
  return { outOfTable: false, base, lines, offer, blocked, warnings };
}

export type HaishaRefund = {
  jidosha: number;
  juryo: number;
  jibai: number;
  taxRemain: number;
  shakenMonths: number;
  eikyu: boolean;
  total: number;
};

/** 還付金（自動車税・重量税・自賠責）の概算。買取価格とは別枠。 */
export function calcHaishaRefund(input: HaishaInput, now: Date = new Date()): HaishaRefund {
  const di = input.dispIdx;
  const isKei = di === 0;
  const nowM = now.getMonth() + 1;
  const taxRemain = (3 - nowM + 12) % 12; // 自動車税：抹消月の翌月〜翌3月
  const shakenMonths = input.shakenMonths ?? 0;
  const eikyu = (input.matsu ?? 'eikyu') === 'eikyu';
  const jidosha = isKei ? 0 : Math.round((JIDOSHA_ZEI[di] ?? 0) * taxRemain / 12);
  const juryo = eikyu ? Math.round((JURYO_ZEI_Y[di] ?? 0) * shakenMonths / 12) : 0;
  const jibai = (isKei ? JIBAI_MONTH.kei : JIBAI_MONTH.normal) * shakenMonths;
  return { jidosha, juryo, jibai, taxRemain, shakenMonths, eikyu, total: jidosha + juryo + jibai };
}

/** 名義区分ごとの必要書類。 */
export function requiredHaishaDocs(owner: string | undefined): { label: string; required: boolean }[] {
  const base: { label: string; required: boolean }[] = [
    { label: '車検証（自動車検査証）', required: true },
    { label: '自賠責保険証明書', required: true },
    { label: 'リサイクル券', required: false },
    { label: '印鑑証明書（本人）', required: true },
    { label: '実印・委任状', required: true },
    { label: '譲渡証明書', required: true },
    { label: '振込先口座', required: true },
  ];
  if (owner === 'lien') {
    base.push({ label: '所有権解除書類（完済証明・譲渡証明）', required: true });
    base.push({ label: '所有者（信販/ディーラー）の印鑑証明', required: true });
  }
  if (owner === 'deceased') {
    base.push({ label: '被相続人の戸籍（出生〜死亡）', required: true });
    base.push({ label: '相続人全員の戸籍', required: true });
    base.push({ label: '遺産分割協議書 または 相続人の委任', required: true });
    base.push({ label: '相続人の印鑑証明', required: true });
  }
  if (owner === 'user') base.push({ label: '所有者の委任状・印鑑証明', required: true });
  if (owner === 'other') base.push({ label: '名義人の委任状・印鑑証明（法人は登記簿）', required: true });
  return base;
}
