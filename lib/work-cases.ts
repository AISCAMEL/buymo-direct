// プロの作業事例（施工事例）の共通定義。副作用なし。

export type WorkCase = {
  id: string;
  dealer_id: string;
  category: string | null;
  title: string;
  description: string | null;
  before_url: string | null;
  after_url: string | null;
  price: number | null;
  duration: string | null;
  car_name: string | null;
  customer_name: string | null;
  customer_voice: string | null;
  rating: number | null;
  work_date: string | null;
  published: boolean;
  sort: number;
};

export const WORK_CASE_CATEGORIES = [
  '整備・車検',
  '板金・塗装',
  'コーティング',
  '電装・取付',
  '美装・クリーニング',
  '査定・買取',
  '陸送・輸送',
  'その他',
];

export const WORK_CASE_CATEGORY_CLS: Record<string, string> = {
  '整備・車検': 'bg-blue-100 text-blue-700',
  '板金・塗装': 'bg-rose-100 text-rose-700',
  'コーティング': 'bg-purple-100 text-purple-700',
  '電装・取付': 'bg-sky-100 text-sky-700',
  '美装・クリーニング': 'bg-emerald-100 text-emerald-700',
  '査定・買取': 'bg-amber-100 text-amber-700',
  '陸送・輸送': 'bg-slate-100 text-slate-600',
  'その他': 'bg-slate-100 text-slate-600',
};
