import { TrendingDown } from 'lucide-react';
import { MarketCompare } from '@/components/MarketCompare';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '市場価格くらべ｜BUYMOはどれくらいお得？',
  description: '車種・年式・走行距離を入れるだけ。大手中古車サイトやディーラーの相場と、BUYMOの販売価格をAIが比較します。',
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ maker?: string; model?: string; year?: string; km?: string }>;
}) {
  const sp = await searchParams;
  const initial = {
    maker: sp.maker,
    model: sp.model,
    year: sp.year ? Number(sp.year) : undefined,
    mileageKm: sp.km ? Number(sp.km) : undefined,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-black text-navy-800">
          <TrendingDown className="h-6 w-6 text-accent-600" /> 市場価格くらべ
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          気になる車の相場を、大手中古車サイト・ディーラー認定中古などと<span className="font-bold">BUYMOの販売価格</span>で並べて比較。
          手数料を含めても、BUYMOならどれくらいお得かがひと目で分かります。
        </p>
      </div>
      <MarketCompare initial={initial} />
    </div>
  );
}
