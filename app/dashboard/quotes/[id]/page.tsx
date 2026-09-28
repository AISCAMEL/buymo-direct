import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/PrintButton';
import { QuoteDocument } from '@/components/QuoteDocument';

export const dynamic = 'force-dynamic';

export default async function MyQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/quotes/${id}`);

  // RLS: 宛先ユーザー本人のみ閲覧可
  const { data: q } = await supabase.from('quotes').select('*').eq('id', id).eq('buyer_id', user.id).maybeSingle();
  if (!q) notFound();

  const { data: itemRows } = await supabase.from('quote_items').select('*').eq('quote_id', id).order('sort');
  const items = (itemRows ?? []) as { id: string; label: string; amount: number; taxable: boolean }[];

  const { data: biz } = await supabase
    .from('dealers')
    .select('name, company_name, trade_name, business_type, representative, address, phone, antique_license_no, tax_status, invoice_registered, invoice_number, bank_info')
    .eq('id', (q as { dealer_id: string }).dealer_id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/dashboard/quotes" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 見積一覧へ
        </Link>
        <PrintButton />
      </div>
      <QuoteDocument q={q as any} items={items} biz={(biz as any) ?? null} />
    </div>
  );
}
