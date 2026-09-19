// BUYMO 統合カタログ：ジャンル(29)・カテゴリ(5)・エリア(47)
// buymo.me の URL 体系（/genre/<slug>/・/area/<slug>/）をそのまま踏襲し、SEO資産を引き継ぐ。

export type GenreFilter = {
  q?: string;
  body?: string;
  maker?: string;
  fuel?: string;
};

export type Genre = {
  slug: string;
  label: string; // 一般名（例：軽自動車）
  buyback: string; // 買取表記（例：軽自動車買取）
  cat: string; // カテゴリslug
  desc: string;
  filter?: GenreFilter; // ダイレクト在庫の絞り込み（無ければ買取査定中心のLP）
  buybackOnly?: boolean; // 販売在庫の概念が薄い（廃車・パーツ等）→ 査定訴求中心
};

export const GENRE_CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'condition', label: '状態・お悩みで探す' },
  { slug: 'popular', label: '人気車種で探す' },
  { slug: 'type', label: 'タイプ・区分で探す' },
  { slug: 'classic', label: '旧車・希少車で探す' },
  { slug: 'parts', label: 'パーツ・用品' },
];

export const GENRES: Genre[] = [
  // 状態・お悩み（買取中心）
  { slug: 'haisha', label: '廃車', buyback: '廃車買取', cat: 'condition', desc: '廃車予定の車も、費用をかける前にまず査定。無料引取り・還付金の案内まで対応します。', buybackOnly: true },
  { slug: 'jiko', label: '事故車', buyback: '事故車買取', cat: 'condition', desc: '事故車も部品・鉄資源に価値があり売れるケースが多数。無料でレッカー引取りに伺います。', buybackOnly: true },
  { slug: 'fudou', label: '不動車', buyback: '不動車買取', cat: 'condition', desc: '動かない車でも買取対象。廃車費用をかける前に査定を。無料引取り対応。', buybackOnly: true },
  { slug: 'kasoukou', label: '過走行車', buyback: '過走行車買取', cat: 'condition', desc: '10万km超の過走行でも買取可能。海外需要・部品需要で値がつくことも。', buybackOnly: true },
  { slug: 'loan', label: 'ローン中の車', buyback: 'ローン中の車買取', cat: 'condition', desc: 'ローンが残っていても売却可能。名義解除の手続きもサポートします。', buybackOnly: true },
  // 人気車種
  { slug: 'hiace', label: 'ハイエース', buyback: 'ハイエース買取', cat: 'popular', desc: '国内外で需要が高いハイエース。買取もダイレクト販売も高値が狙えます。', filter: { q: 'ハイエース' } },
  { slug: 'landcruiser', label: 'ランドクルーザー', buyback: 'ランドクルーザー買取', cat: 'popular', desc: '世界的人気のランドクルーザー。高価買取・ダイレクト販売に対応。', filter: { q: 'ランドクルーザー' } },
  { slug: 'alphard', label: 'アルファード', buyback: 'アルファード買取', cat: 'popular', desc: '高級ミニバンの代名詞アルファード。買取・ダイレクト販売ともに人気。', filter: { q: 'アルファード' } },
  { slug: 'prius', label: 'プリウス', buyback: 'プリウス買取', cat: 'popular', desc: '定番ハイブリッドのプリウス。年式・走行に応じて高値が期待できます。', filter: { q: 'プリウス' } },
  { slug: 'jimny', label: 'ジムニー', buyback: 'ジムニー買取', cat: 'popular', desc: '希少で人気のジムニー。中古相場も堅調。買取・販売どちらも強気で。', filter: { q: 'ジムニー' } },
  { slug: 'keitora', label: '軽トラ', buyback: '軽トラ買取', cat: 'popular', desc: '農業・商用で需要が絶えない軽トラ。過走行でも値がつきやすい車種です。', filter: { q: '軽トラ' } },
  { slug: 'harrier', label: 'ハリアー', buyback: 'ハリアー買取', cat: 'popular', desc: '人気SUVハリアー。買取もダイレクト販売も高値が狙えます。', filter: { q: 'ハリアー' } },
  { slug: 'velfire', label: 'ヴェルファイア', buyback: 'ヴェルファイア買取', cat: 'popular', desc: '高級ミニバンのヴェルファイア。安定した人気で高価買取。', filter: { q: 'ヴェルファイア' } },
  { slug: 'noahvoxy', label: 'ノア・ヴォクシー', buyback: 'ノア・ヴォクシー買取', cat: 'popular', desc: 'ファミリー定番のノア／ヴォクシー。買取・ダイレクト販売に対応。', filter: { q: 'ヴォクシー' } },
  { slug: 'nbox', label: 'N-BOX', buyback: 'N-BOX買取', cat: 'popular', desc: '軽の大定番N-BOX。中古需要が高く高値が期待できます。', filter: { q: 'N-BOX' } },
  // タイプ・区分
  { slug: 'kei', label: '軽自動車', buyback: '軽自動車買取', cat: 'type', desc: '維持費が安く街乗りに最適な軽自動車。買取・ダイレクト販売どちらも。', filter: { body: '軽自動車' } },
  { slug: 'suv', label: 'SUV', buyback: 'SUV買取', cat: 'type', desc: '人気のSUVを買取・ダイレクト販売。オフロードからシティユースまで。', filter: { body: 'SUV' } },
  { slug: 'minivan', label: 'ミニバン', buyback: 'ミニバン買取', cat: 'type', desc: 'ファミリーに人気のミニバン。買取・ダイレクト販売に対応。', filter: { body: 'ミニバン' } },
  { slug: 'sedan', label: 'セダン', buyback: 'セダン買取', cat: 'type', desc: '落ち着いた乗り味のセダン。買取・ダイレクト販売どちらも。', filter: { body: 'セダン' } },
  { slug: 'truck', label: 'トラック・商用車', buyback: 'トラック・商用車買取', cat: 'type', desc: '商用需要の高いトラック・バン。買取・ダイレクト販売に対応。', filter: { q: 'トラック' } },
  { slug: 'import', label: '輸入車', buyback: '輸入車買取', cat: 'type', desc: 'BMW・ベンツ・アウディなど輸入車。専門的に評価し高価買取。', filter: { maker: '輸入車' } },
  { slug: 'luxury', label: '高級車', buyback: '高級車買取', cat: 'type', desc: 'レクサス等の高級車を適正評価。買取・ダイレクト販売に対応。', filter: { q: 'レクサス' } },
  { slug: 'ev', label: 'EV・ハイブリッド', buyback: 'EV・ハイブリッド買取', cat: 'type', desc: '電動化で需要が伸びるEV・ハイブリッド。買取・ダイレクト販売に対応。', filter: { fuel: 'EV,ハイブリッド' } },
  { slug: 'camper', label: 'キャンピングカー', buyback: 'キャンピングカー買取', cat: 'type', desc: 'アウトドア人気で需要が高いキャンピングカー。買取・ダイレクト販売に。', filter: { q: 'キャンピング' } },
  // 旧車・希少車
  { slug: 'kyusha', label: '旧車', buyback: '旧車買取', cat: 'classic', desc: '希少な旧車・ヴィンテージを専門評価。買取・ダイレクト販売に対応。', buybackOnly: true },
  { slug: 'zeppan', label: '絶版・ネオクラ', buyback: '絶版・ネオクラ買取', cat: 'classic', desc: '絶版車・ネオクラシックの価値を正しく評価。高価買取・販売。', buybackOnly: true },
  // パーツ・用品
  { slug: 'wheel', label: 'アルミホイール', buyback: 'アルミホイール買取', cat: 'parts', desc: '純正・社外アルミホイールを買取。写真査定で手軽に。', buybackOnly: true },
  { slug: 'tire', label: 'タイヤ', buyback: 'タイヤ買取', cat: 'parts', desc: '中古・新品タイヤを買取。まとめ売りも歓迎。', buybackOnly: true },
  { slug: 'parts', label: 'カー用品・パーツ', buyback: 'カー用品・パーツ買取', cat: 'parts', desc: 'カーナビ・エアロ等のカー用品・パーツを買取。写真査定で。', buybackOnly: true },
];

export const GENRE_BY_SLUG: Record<string, Genre> = Object.fromEntries(GENRES.map((g) => [g.slug, g]));

// ── エリア（47都道府県：英語slug ↔ 日本語名・地方）buymo.me と同一slug ──
export type Area = { slug: string; name: string; region: string };

export const AREAS: Area[] = [
  { slug: 'hokkaido', name: '北海道', region: '北海道' },
  { slug: 'aomori', name: '青森県', region: '東北' }, { slug: 'iwate', name: '岩手県', region: '東北' },
  { slug: 'miyagi', name: '宮城県', region: '東北' }, { slug: 'akita', name: '秋田県', region: '東北' },
  { slug: 'yamagata', name: '山形県', region: '東北' }, { slug: 'fukushima', name: '福島県', region: '東北' },
  { slug: 'ibaraki', name: '茨城県', region: '関東' }, { slug: 'tochigi', name: '栃木県', region: '関東' },
  { slug: 'gunma', name: '群馬県', region: '関東' }, { slug: 'saitama', name: '埼玉県', region: '関東' },
  { slug: 'chiba', name: '千葉県', region: '関東' }, { slug: 'tokyo', name: '東京都', region: '関東' },
  { slug: 'kanagawa', name: '神奈川県', region: '関東' },
  { slug: 'niigata', name: '新潟県', region: '中部' }, { slug: 'toyama', name: '富山県', region: '中部' },
  { slug: 'ishikawa', name: '石川県', region: '中部' }, { slug: 'fukui', name: '福井県', region: '中部' },
  { slug: 'yamanashi', name: '山梨県', region: '中部' }, { slug: 'nagano', name: '長野県', region: '中部' },
  { slug: 'gifu', name: '岐阜県', region: '中部' }, { slug: 'shizuoka', name: '静岡県', region: '中部' },
  { slug: 'aichi', name: '愛知県', region: '中部' },
  { slug: 'mie', name: '三重県', region: '近畿' }, { slug: 'shiga', name: '滋賀県', region: '近畿' },
  { slug: 'kyoto', name: '京都府', region: '近畿' }, { slug: 'osaka', name: '大阪府', region: '近畿' },
  { slug: 'hyogo', name: '兵庫県', region: '近畿' }, { slug: 'nara', name: '奈良県', region: '近畿' },
  { slug: 'wakayama', name: '和歌山県', region: '近畿' },
  { slug: 'tottori', name: '鳥取県', region: '中国' }, { slug: 'shimane', name: '島根県', region: '中国' },
  { slug: 'okayama', name: '岡山県', region: '中国' }, { slug: 'hiroshima', name: '広島県', region: '中国' },
  { slug: 'yamaguchi', name: '山口県', region: '中国' },
  { slug: 'tokushima', name: '徳島県', region: '四国' }, { slug: 'kagawa', name: '香川県', region: '四国' },
  { slug: 'ehime', name: '愛媛県', region: '四国' }, { slug: 'kochi', name: '高知県', region: '四国' },
  { slug: 'fukuoka', name: '福岡県', region: '九州' }, { slug: 'saga', name: '佐賀県', region: '九州' },
  { slug: 'nagasaki', name: '長崎県', region: '九州' }, { slug: 'kumamoto', name: '熊本県', region: '九州' },
  { slug: 'oita', name: '大分県', region: '九州' }, { slug: 'miyazaki', name: '宮崎県', region: '九州' },
  { slug: 'kagoshima', name: '鹿児島県', region: '九州' }, { slug: 'okinawa', name: '沖縄県', region: '沖縄' },
];

export const AREA_BY_SLUG: Record<string, Area> = Object.fromEntries(AREAS.map((a) => [a.slug, a]));
export const AREA_REGIONS: string[] = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', '沖縄'];

// buymo.me に存在した「ジャンル×エリア」64組（SEO用に踏襲）
export const CROSS_GENRE_SLUGS = ['haisha', 'jiko', 'fudou', 'hiace', 'landcruiser', 'keitora', 'truck', 'wheel'];
export const CROSS_AREA_SLUGS = ['hokkaido', 'fukushima', 'tokyo', 'kanagawa', 'aichi', 'osaka', 'fukuoka', 'okinawa'];
