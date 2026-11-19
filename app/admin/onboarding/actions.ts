'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { setAppSetting } from '@/lib/settings';
import { ONBOARDING_STEPS, videoSettingKey } from '@/lib/onboarding';

/** 各章の研修動画URLをまとめて保存。 */
export async function saveOnboardingVideos(formData: FormData): Promise<void> {
  await requireAdmin();
  for (const s of ONBOARDING_STEPS) {
    const url = String(formData.get('video_' + s.key) || '').trim();
    await setAppSetting(videoSettingKey(s.key), url);
  }
  revalidatePath('/admin/onboarding');
  revalidatePath('/dealer/onboarding');
}
