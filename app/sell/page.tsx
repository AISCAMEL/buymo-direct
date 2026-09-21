import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bot, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ListingForm, type ListingInitial } from '@/components/ListingForm';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ fromAppraisal?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/sell');

  const sp = await searchParams;
  const fromAppraisalId = sp.fromAppraisal;

  // 査定からの引き継ぎ（本人の査定 or 管理者のみ）
  let initial: ListingInitial | undefined;
  let initialImages: { url: string; caption?: string | null }[] = [];
  let carriedFrom = false;
  if (fromAppraisalId) {
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = (prof as { role?: string } | null)?.role === 'admin';
    try {
      const service = createServiceClient();
      const { data: ap } = await service.from('appraisal_requests').select('*').eq('id', fromAppraisalId).maybeSingle();
      const a = ap as Record<string, unknown> | null;
      if (a && (isAdmin || a.user_id === user.id) && !a.listing_id) {
        const descParts: string[] = [];
        if (a.grade) descParts.push(`グレード: ${a.grade}`);
        if (a.equipment) descParts.push(`装備・オプション: ${a.equipment}`);
        const flags = [a.one_owner && 'ワンオーナー', a.has_records && '整備記録簿あり', a.non_smoking && '禁煙車'].filter(Boolean);
        if (flags.length) descParts.push(flags.join(' / '));
        if (a.shaken_until) descParts.push(`車検満了: ${a.shaken_until}`);
        if (a.notes) descParts.push(String(a.notes));

        initial = {
          maker: (a.maker as string) || '',
          model: a.model === '(未指定)' ? '' : (a.model as string) || '',
          year: a.year as number,
          mileage_km: a.mileage_km as number,
          price: (a.price_high as number) ?? (a.ai_price_high as number) ?? undefined,
          body_type: (a.body_type as string) ?? null,
          transmission: (a.transmission as string) ?? null,
          fuel: (a.fuel as string) ?? null,
          color: (a.color as string) ?? null,
          prefecture: a.prefecture === '(未指定)' ? null : (a.prefecture as string) ?? null,
          repair_history: !!a.repair_detail,
          vin: (a.vin as string) ?? null,
          description: descParts.join('\n') || null,
          listing_type: 'direct',
        };
        const photos = Array.isArray(a.photos) ? (a.photos as { url?: string; caption?: string }[]) : [];
        initialImages = photos
          .filter((p) => p && typeof p.url === 'string')
          .map((p) => ({ url: p.url as string, caption: p.caption ?? null }));
        carriedFrom = true;
      }
    } catch {
      /* 引き継ぎ失敗は通常出品として続行 */
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-0.5 text-2xl font-black">出品して、もっと高く売る</h1>
          <p className="text-sm text-slate-500">写真と車両情報を入力するだけ。出品は無料、売れなくても買取保証つきで安心です。</p>
        </div>
        <Link
          href="/listings/sell-wizard"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600 transition-colors hover:bg-gold-100"
        >
          <Bot className="h-3.5 w-3.5" />
          AI相場診断から始める
        </Link>
      </div>

      {carriedFrom && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-700">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
          <span>査定でご入力いただいた<span className="font-bold">車両情報と写真を引き継ぎました</span>。内容を確認し、タイトルと価格を入れて出品してください。</span>
        </div>
      )}

      {/* 安心・導線バー */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-navy-50 px-4 py-2.5 text-xs font-bold text-navy-700">
        <span>✓ 出品手数料無料</span>
        <span>✓ 買取保証つき</span>
        <span>✓ エスクロー決済で安全</span>
        <span>✓ 名義変更まで代行</span>
        <Link href="/listings/valuation" className="ml-auto text-accent-600 hover:underline">
          すぐ現金化したい方は「無料査定（買取）」→
        </Link>
      </div>

      <Suspense>
        <ListingForm userId={user.id} initial={initial} initialImages={initialImages} fromAppraisalId={carriedFrom ? fromAppraisalId : undefined} />
      </Suspense>
    </div>
  );
}
