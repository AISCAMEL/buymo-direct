'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export function PushNotificationManager() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.register('/sw.js').catch(() => {/* ignore */});
    }
  }, []);

  async function subscribe() {
    if (loading) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (loading) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPermission('default');
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  if (permission === 'granted') {
    return (
      <button
        onClick={unsubscribe}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        title="プッシュ通知をオフにする"
      >
        <BellOff className="h-4 w-4" />
        通知オン
      </button>
    );
  }

  if (permission === 'denied') return null;

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
    >
      <Bell className="h-4 w-4 text-accent-600" />
      {loading ? '設定中…' : 'プッシュ通知を受け取る'}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
