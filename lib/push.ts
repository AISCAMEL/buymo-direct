import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase/service';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY!;
const vapidEmail = `mailto:${process.env.VAPID_EMAIL ?? 'noreply@buymo.me'}`;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!vapidPublic || !vapidPrivate) return;

  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) return;

  const text = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        text
      ).catch(async (err) => {
        // 410 Gone = subscription expired; clean up
        if (err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', s.endpoint);
        }
      })
    )
  );
}
