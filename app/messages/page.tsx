import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { isUnread } from '@/lib/unread';
import { ConversationListUpdater } from '@/components/ConversationListUpdater';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/messages');

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, listings(id, title, maker, model, price, listing_images(url, sort_order)), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  const rows = (conversations ?? []) as any[];

  return (
    <div className="mx-auto max-w-3xl">
      <ConversationListUpdater userId={user.id} />
      <h1 className="mb-4 text-2xl font-black">メッセージ</h1>
      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          まだメッセージはありません。気になる車両の出品者に問い合わせてみましょう。
          <div className="mt-4"><Link href="/listings" className="btn-primary">車を探す</Link></div>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const isBuyer = c.buyer_id === user.id;
            const other = isBuyer ? c.seller?.display_name : c.buyer?.display_name;
            const cover = c.listings?.listing_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.url;
            const unread = isUnread(c, user.id);
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="card flex items-center gap-4 p-3 transition hover:shadow-md">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {cover && (
                      <Image src={cover} alt="" fill className="object-cover" sizes="56px" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${unread ? 'font-black' : 'font-bold'}`}>{c.listings?.title ?? '車両'}</p>
                    <p className="text-xs text-slate-500">
                      {isBuyer ? '売主' : '買主'}：{other ?? 'ユーザー'} ・ {c.listings?.maker} {c.listings?.model}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-slate-400">{formatDateTime(c.last_message_at)}</span>
                    {unread && <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-label="未読" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
