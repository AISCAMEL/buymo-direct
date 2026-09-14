// Demo seed data — no DB required

export const DEMO_LISTINGS = [
  { id: 'lst-001', title: 'トヨタ プリウス 2022年 ハイブリッド', maker: 'トヨタ', model: 'プリウス', year: 2022, mileage_km: 15200, price: 2480000, prefecture: '東京都', body_type: 'セダン', transmission: 'CVT', fuel: 'ハイブリッド', color: 'パールホワイト', status: 'active', dealer_id: 'dlr-001', created_at: '2026-06-10', repair_history: false, boosted_until: '2026-07-10' },
  { id: 'lst-002', title: 'ホンダ フィット 2021年 e:HEV', maker: 'ホンダ', model: 'フィット', year: 2021, mileage_km: 28400, price: 1680000, prefecture: '神奈川県', body_type: 'ハッチバック', transmission: 'CVT', fuel: 'ハイブリッド', color: 'プラチナホワイト', status: 'active', dealer_id: 'dlr-001', created_at: '2026-06-12', repair_history: false, boosted_until: null },
  { id: 'lst-003', title: '日産 セレナ 2023年 e-POWER', maker: '日産', model: 'セレナ', year: 2023, mileage_km: 8900, price: 3450000, prefecture: '大阪府', body_type: 'ミニバン', transmission: 'CVT', fuel: 'ハイブリッド', color: 'ダイヤモンドシルバー', status: 'active', dealer_id: null, created_at: '2026-06-15', repair_history: false, boosted_until: null },
  { id: 'lst-004', title: 'スバル フォレスター 2020年 2.5i', maker: 'スバル', model: 'フォレスター', year: 2020, mileage_km: 44100, price: 2150000, prefecture: '愛知県', body_type: 'SUV', transmission: 'CVT', fuel: 'ガソリン', color: 'クリスタルホワイト', status: 'reserved', dealer_id: null, created_at: '2026-05-20', repair_history: false, boosted_until: null },
  { id: 'lst-005', title: 'マツダ CX-5 2022年 25S', maker: 'マツダ', model: 'CX-5', year: 2022, mileage_km: 22000, price: 2850000, prefecture: '東京都', body_type: 'SUV', transmission: 'AT', fuel: 'ガソリン', color: 'ソウルレッドクリスタル', status: 'active', dealer_id: 'dlr-001', created_at: '2026-06-18', repair_history: false, boosted_until: null },
  { id: 'lst-006', title: 'レクサス RX 2021年 450h', maker: 'レクサス', model: 'RX', year: 2021, mileage_km: 31500, price: 5480000, prefecture: '東京都', body_type: 'SUV', transmission: 'CVT', fuel: 'ハイブリッド', color: 'ホワイトノーヴァガラスフレーク', status: 'active', dealer_id: 'dlr-002', created_at: '2026-06-05', repair_history: false, boosted_until: '2026-07-05' },
  { id: 'lst-007', title: 'トヨタ ヴォクシー 2023年 S-Z', maker: 'トヨタ', model: 'ヴォクシー', year: 2023, mileage_km: 5100, price: 3980000, prefecture: '埼玉県', body_type: 'ミニバン', transmission: 'CVT', fuel: 'ハイブリッド', color: 'ムーンストーンブルー', status: 'active', dealer_id: 'dlr-001', created_at: '2026-06-20', repair_history: false, boosted_until: null },
  { id: 'lst-008', title: 'ホンダ ヴェゼル 2022年 e:HEV Z', maker: 'ホンダ', model: 'ヴェゼル', year: 2022, mileage_km: 18700, price: 2680000, prefecture: '千葉県', body_type: 'SUV', transmission: 'CVT', fuel: 'ハイブリッド', color: 'プラチナホワイトパール', status: 'sold', dealer_id: null, created_at: '2026-04-10', repair_history: false, boosted_until: null },
];

export const DEMO_DEALERS = [
  {
    id: 'dlr-001',
    name: 'カーズ東京 新宿店',
    company_name: '株式会社カーズジャパン',
    prefecture: '東京都',
    address: '新宿区西新宿2-1-1',
    phone: '03-1234-5678',
    website_url: 'https://cars-tokyo.example.com',
    status: 'approved',
    commission_rate: 3.0,
    approved_at: '2026-01-15',
    created_at: '2026-01-10',
    owner_email: 'yamada@cars-tokyo.example.com',
    owner_name: '山田 花子',
    inventory: 24,
    sold: 38,
    gmv: 87400000,
  },
  {
    id: 'dlr-002',
    name: 'プレミアムカーズ横浜',
    company_name: '株式会社プレミアム自動車',
    prefecture: '神奈川県',
    address: '横浜市西区みなとみらい3-5',
    phone: '045-9876-5432',
    website_url: null,
    status: 'approved',
    commission_rate: 2.5,
    approved_at: '2026-02-20',
    created_at: '2026-02-18',
    owner_email: 'ito@premium-cars.example.com',
    owner_name: '伊藤 健司',
    inventory: 12,
    sold: 21,
    gmv: 63200000,
  },
  {
    id: 'dlr-003',
    name: 'オートプラザ大阪',
    company_name: 'オートプラザ大阪有限会社',
    prefecture: '大阪府',
    address: '大阪市北区梅田1-3-1',
    phone: '06-5555-7777',
    website_url: null,
    status: 'pending',
    commission_rate: 3.0,
    approved_at: null,
    created_at: '2026-06-25',
    owner_email: 'tanaka@autoplaza.example.com',
    owner_name: '田中 義弘',
    inventory: 0,
    sold: 0,
    gmv: 0,
  },
  {
    id: 'dlr-004',
    name: 'ファーストカーズ名古屋',
    company_name: '株式会社ファースト',
    prefecture: '愛知県',
    address: '名古屋市中村区名駅5-2-1',
    phone: '052-3333-4444',
    website_url: null,
    status: 'pending',
    commission_rate: 3.0,
    approved_at: null,
    created_at: '2026-06-28',
    owner_email: 'suzuki@first-cars.example.com',
    owner_name: '鈴木 誠一',
    inventory: 0,
    sold: 0,
    gmv: 0,
  },
  {
    id: 'dlr-005',
    name: 'スピードマーケット福岡',
    company_name: 'スピードマーケット株式会社',
    prefecture: '福岡県',
    address: '福岡市博多区博多駅前4-1',
    phone: '092-7777-8888',
    website_url: null,
    status: 'suspended',
    commission_rate: 3.5,
    approved_at: '2026-03-01',
    created_at: '2026-02-25',
    owner_email: 'nakamura@speed.example.com',
    owner_name: '中村 浩',
    inventory: 0,
    sold: 8,
    gmv: 14500000,
  },
];

export const DEMO_STAFF = [
  { id: 'stf-001', name: '山田 花子', email: 'yamada@cars-tokyo.example.com', role: 'owner', joined: '2026-01-10', last_login: '2026-07-02' },
  { id: 'stf-002', name: '佐藤 次郎', email: 'sato@cars-tokyo.example.com', role: 'manager', joined: '2026-02-01', last_login: '2026-07-01' },
  { id: 'stf-003', name: '鈴木 美咲', email: 'suzuki@cars-tokyo.example.com', role: 'staff', joined: '2026-03-15', last_login: '2026-06-30' },
  { id: 'stf-004', name: '田中 健太', email: 'tanaka@cars-tokyo.example.com', role: 'staff', joined: '2026-04-01', last_login: '2026-06-28' },
];

export const DEMO_ESCROWS = [
  { id: 'esc-001', listing_title: 'スバル フォレスター 2020年', buyer: '青木 隆', seller: '小林 明美', amount: 2150000, status: 'inspection', created_at: '2026-06-20', dealer: 'カーズ東京 新宿店' },
  { id: 'esc-002', listing_title: 'ホンダ ヴェゼル 2022年', buyer: '渡辺 浩二', seller: '高橋 英子', amount: 2680000, status: 'completed', created_at: '2026-06-10', dealer: null },
  { id: 'esc-003', listing_title: 'マツダ CX-5 2022年', buyer: '加藤 由美', seller: 'カーズ東京 新宿店', amount: 2850000, status: 'funds_held', created_at: '2026-06-28', dealer: 'カーズ東京 新宿店' },
  { id: 'esc-004', listing_title: 'トヨタ プリウス 2022年', buyer: '中島 良介', seller: 'プレミアムカーズ横浜', amount: 2480000, status: 'initiated', created_at: '2026-07-01', dealer: 'プレミアムカーズ横浜' },
];

export const DEMO_ANALYTICS = [
  { month: '2026-02', gmv: 9800000, sold: 5 },
  { month: '2026-03', gmv: 14200000, sold: 7 },
  { month: '2026-04', gmv: 18500000, sold: 9 },
  { month: '2026-05', gmv: 21300000, sold: 11 },
  { month: '2026-06', gmv: 23600000, sold: 12 },
];

export const DEMO_MY_LISTINGS = [
  { id: 'lst-003', title: '日産 セレナ 2023年 e-POWER', maker: '日産', model: 'セレナ', year: 2023, mileage_km: 8900, price: 3450000, prefecture: '大阪府', status: 'active', views: 142, favorites: 18, created_at: '2026-06-15' },
  { id: 'lst-004', title: 'スバル フォレスター 2020年', maker: 'スバル', model: 'フォレスター', year: 2020, mileage_km: 44100, price: 2150000, prefecture: '愛知県', status: 'reserved', views: 89, favorites: 7, created_at: '2026-05-20' },
  { id: 'lst-008', title: 'ホンダ ヴェゼル 2022年 e:HEV Z', maker: 'ホンダ', model: 'ヴェゼル', year: 2022, mileage_km: 18700, price: 2680000, prefecture: '千葉県', status: 'sold', views: 304, favorites: 31, created_at: '2026-04-10' },
];

export const DEMO_MESSAGES = [
  { id: 'msg-001', other_user: '青木 隆', listing: '日産 セレナ 2023年', last_message: '週末に現車確認できますか？', unread: 2, updated_at: '2026-07-02 14:32' },
  { id: 'msg-002', other_user: '渡辺 浩二', listing: 'スバル フォレスター 2020年', last_message: 'ありがとうございます。書類の件ですが…', unread: 0, updated_at: '2026-07-01 09:15' },
  { id: 'msg-003', other_user: '加藤 由美', listing: '日産 セレナ 2023年', last_message: '価格について相談したいのですが', unread: 1, updated_at: '2026-06-30 18:45' },
];

export const DEMO_KYCS = [
  { id: 'kyc-001', user: '田中 義博', submitted: '2026-06-28', doc_type: '運転免許証', status: 'pending' },
  { id: 'kyc-002', user: '山本 幸子', submitted: '2026-06-27', doc_type: 'マイナンバーカード', status: 'pending' },
  { id: 'kyc-003', user: '伊藤 昭', submitted: '2026-06-25', doc_type: '運転免許証', status: 'approved' },
];

export const DEMO_REPORTS = [
  { id: 'rep-001', type: '虚偽記載疑い', listing: 'トヨタ アルファード 2018年', reporter: '匿名', created_at: '2026-06-29', status: 'open' },
  { id: 'rep-002', type: '不審なユーザー', listing: null, reporter: '中野 健', created_at: '2026-06-28', status: 'resolved' },
];

export const DEMO_API_KEYS = [
  { id: 'key-001', name: '本社DMS連携', prefix: 'bmc_a1b2c3', last_used: '2026-07-01', created: '2026-02-01' },
  { id: 'key-002', name: 'テスト用', prefix: 'bmc_x9y8z7', last_used: null, created: '2026-06-15' },
];

export const DEMO_WEBHOOKS = [
  { id: 'wh-001', url: 'https://dms.cars-tokyo.example.com/webhook', events: ['deal.completed'], active: true, created: '2026-02-01' },
];
