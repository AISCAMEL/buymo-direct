import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/PrintButton';
import { InvoiceDocument } from '@/components/InvoiceDocument';

export const dynamic = 'force-dynamic';

export default async function MyInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/invoices/${id}`);

  const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).eq('buyer_id', user.id).maybeSingle();
  if (!inv) notFound();

  const { data: itemRows } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort');
  const items = (itemRows ?? []) as { id: string; label: string; amount: number; taxable: boolean }[];

  const { data: biz } = await supabase
    .from('dealers')
    .select('name, company_name, trade_name, business_type, representative, address, phone, antique_license_no, tax_status')
    .eq('id', (inv as { dealer_id: string }).dealer_id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <style>{`@media print { header, footer, .no-print { display: none !important; } .print-area { box-shadow: none !important; border: none !important; } body { background: #fff !important; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> 請求書一覧へ
        </Link>
        <PrintButton />
      </div>
      <InvoiceDocument inv={inv as any} items={items} biz={(biz as any) ?? null} />
    </div>
  );
}
