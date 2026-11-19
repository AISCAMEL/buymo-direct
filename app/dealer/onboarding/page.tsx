import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { ONBOARDING_STEPS, getOnboardingVideos } from '@/lib/onboarding';
import { OnboardingHub } from '@/components/OnboardingHub';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'はじめに・研修 | 加盟店' };

export default async function DealerOnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/onboarding');
  const ctx = await getDealerForUser(user.id);
  if (!ctx) redirect('/dealer/register');

  const { data } = await supabase.from('dealers').select('name').eq('id', ctx.dealerId).maybeSingle();
  const storeName = (data as { name?: string } | null)?.name ?? '加盟店';
  const videos = await getOnboardingVideos();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black text-navy-800">
          <GraduationCap className="h-6 w-6 text-accent-600" /> はじめに・研修（スタートアップ）
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          事前収録の動画で、好きな時に・自分のペースで学べます。各章を見たら「完了」にすると、進み具合が記録されます。
        </p>
      </div>
      <OnboardingHub steps={ONBOARDING_STEPS} videos={videos} dealerId={ctx.dealerId} storeName={storeName} />
    </div>
  );
}
