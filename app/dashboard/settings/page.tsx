import { redirect } from 'next/navigation';
import { Bell, Mail, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { saveNotificationPrefs } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '通知・メール設定 | マイページ' };

type Prefs = {
  notify_price_drop: boolean;
  notify_saved_search: boolean;
  notify_message: boolean;
  accept_newsletter: boolean;
};

function Toggle({ name, label, desc, on }: { name: string; label: string; desc: string; on: boolean }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3.5">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" name={name} defaultChecked={on} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-teal-600"></span>
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
      </span>
    </label>
  );
}

export default async function NotificationSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/settings');

  const { data } = await supabase
    .from('profiles')
    .select('notify_price_drop, notify_saved_search, notify_message, accept_newsletter')
    .eq('id', user.id)
    .maybeSingle();
  const p = (data ?? {}) as Partial<Prefs>;

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <h1 className="text-2xl font-black">通知・メール設定</h1>

      {sp.saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> 設定を保存しました
        </div>
      )}

      <form action={saveNotificationPrefs} className="space-y-6">
        <div className="card p-5">
          <p className="flex items-center gap-2 font-black text-slate-700"><Bell className="h-5 w-5 text-navy-500" />通知設定</p>
          <div className="mt-1 divide-y divide-slate-100">
            <Toggle name="notify_price_drop" label="お気に入り車の値下げ" desc="お気に入りした車の価格が下がったときにお知らせします。" on={p.notify_price_drop ?? true} />
            <Toggle name="notify_saved_search" label="保存した検索条件の新着" desc="保存した条件に合う車が出品されたときにお知らせします。" on={p.notify_saved_search ?? true} />
            <Toggle name="notify_message" label="メッセージ・取引の通知" desc="問い合わせ・見積・取引の進捗をお知らせします。" on={p.notify_message ?? true} />
          </div>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 font-black text-slate-700"><Mail className="h-5 w-5 text-navy-500" />メールマガジン</p>
          <div className="mt-1">
            <Toggle name="accept_newsletter" label="メールマガジンの購読を希望する" desc="お得な情報・新着車両・使い方のヒントをお届けします。" on={p.accept_newsletter ?? false} />
          </div>
        </div>

        <button type="submit" className="btn-accent w-full py-3">保存する</button>
      </form>
    </div>
  );
}
