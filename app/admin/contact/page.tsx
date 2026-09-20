import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { Mail, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  general: '一般',
  buyback: '買取・査定',
  listing: 'ダイレクト・出品',
  payment: '決済・エスクロー',
  account: 'アカウント',
  dealer: '加盟店',
  other: 'その他',
};

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-gold-100 text-gold-600',
  in_progress: 'bg-navy-50 text-navy-700',
  resolved: 'bg-emerald-50 text-emerald-700',
};
const STATUS_LABEL: Record<string, string> = {
  new: '新規',
  in_progress: '対応中',
  resolved: '対応済み',
};

type ContactRow = {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
};

export default async function AdminContactPage() {
  await requireAdmin();

  let rows: ContactRow[] = [];
  let tableMissing = false;
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('contact_messages')
      .select('id, name, email, category, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) tableMissing = true;
    rows = (data ?? []) as ContactRow[];
  } catch {
    tableMissing = true;
  }

  const newCount = rows.filter((r) => r.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">お問い合わせ</h1>
        {newCount > 0 && (
          <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-black text-gold-600">
            新規 {newCount} 件
          </span>
        )}
      </div>

      {tableMissing && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-bold">contact_messages テーブルが見つかりません。</p>
          <p className="mt-1">
            Supabase SQL エディタで <code>supabase/migrations/20240720_contact_messages.sql</code> を実行すると、
            送信内容がここに表示されます（未適用の間もメール通知は届きます）。
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">お問い合わせはまだありません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </span>
                <span className="font-bold text-slate-800">{r.name}</span>
                <a href={`mailto:${r.email}`} className="text-sm text-accent-600 hover:underline">
                  {r.email}
                </a>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString('ja-JP')}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.message}</p>
              <div className="mt-2 text-right">
                <a
                  href={`mailto:${r.email}?subject=${encodeURIComponent('【BUYMO】お問い合わせの件')}`}
                  className="text-xs font-bold text-navy-600 hover:underline"
                >
                  メールで返信 →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
