import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/components/ProfileForm';
import type { Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/profile');

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data) redirect('/');
  const profile = data as Profile;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black">プロフィール設定</h1>
        <Link href={`/users/${user.id}`} className="inline-flex items-center gap-1 text-sm font-bold text-navy-400 hover:underline">
          公開ページを見る <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
