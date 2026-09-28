import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { getPricingConfig } from '@/lib/settings';
import { QuoteForm } from '@/components/QuoteForm';

export const dynamic = 'force-dynamic';

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { supabase } = (await requireDealer()) as any;
  const sp = await searchParams;
  const cfg = await getPricingConfig();

  // 車両を指定して見積を始める場合はプリセット
  let preset: { listingId?: string; summary?: string; price?: number } | null = null;
  if (sp.listing) {
    const { data: l } = await supabase
      .from('listings')
      .select('id, year, maker, model, title, price')
      .eq('id', sp.listing)
      .maybeSingle();
    if (l) preset = { listingId: l.id, summary: `${l.year}年 ${l.maker} ${l.model}`, price: l.price };
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dealer/quotes" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 見積一覧へ
      </Link>
      <h1 className="text-2xl font-black">見積書を作成</h1>
      <QuoteForm taxRate={cfg.consumptionTaxRate ?? 0.1} presetVehicle={preset} />
    </div>
  );
}
