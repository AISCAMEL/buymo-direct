import { GraduationCap } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { ONBOARDING_STEPS, videoSettingKey } from '@/lib/onboarding';
import { getAppSetting } from '@/lib/settings';
import { isPlayableVideo } from '@/lib/video';
import { saveOnboardingVideos } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '加盟店研修の動画設定 | 管理' };

export default async function AdminOnboardingPage() {
  await requireAdmin();
  const current = await Promise.all(
    ONBOARDING_STEPS.map(async (s) => [s.key, await getAppSetting(videoSettingKey(s.key))] as const),
  );
  const videos = Object.fromEntries(current) as Record<string, string | null>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><GraduationCap className="h-6 w-6 text-accent-600" /> 加盟店研修の動画設定</h1>
        <p className="text-sm text-slate-500">
          各章の動画URL（YouTube・Vimeo・mp4など）を設定すると、加盟店の「はじめに・研修」ページ（/dealer/onboarding）に表示されます。空欄にすると「準備中」になります。
        </p>
      </div>

      <form action={saveOnboardingVideos} className="space-y-3">
        {ONBOARDING_STEPS.map((s) => {
          const url = videos[s.key] ?? '';
          return (
            <div key={s.key} className="card p-4">
              <label className="block text-sm font-black text-navy-800">{s.title}</label>
              <p className="mb-2 text-xs text-slate-500">{s.summary}</p>
              <input
                name={'video_' + s.key}
                defaultValue={url}
                placeholder="https://youtu.be/… または https://player.vimeo.com/… / .mp4"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {url && (
                <p className={`mt-1 text-xs ${isPlayableVideo(url) ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isPlayableVideo(url) ? '✓ 埋め込み再生できます' : '⚠ 埋め込みできないURLです（リンクとして表示されます）'}
                </p>
              )}
            </div>
          );
        })}
        <button type="submit" className="btn-accent">保存する</button>
      </form>
    </div>
  );
}
