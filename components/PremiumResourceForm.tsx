import { PREMIUM_CATEGORIES, type PremiumResource } from '@/lib/premium';

/** 有料会員コンテンツの作成/編集フォーム（action は呼び出し側で bind）。 */
export function PremiumResourceForm({
  action,
  initial,
  submitLabel = '保存する',
}: {
  action: (fd: FormData) => void;
  initial?: Partial<PremiumResource>;
  submitLabel?: string;
}) {
  const v = (k: keyof PremiumResource) => (initial?.[k] as string | number | undefined) ?? '';
  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      <div>
        <label className="label">カテゴリー</label>
        <select name="category" className="input" defaultValue={(v('category') as string) || 'market'}>
          {PREMIUM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div><label className="label">並び順</label><input name="sort" type="number" className="input" defaultValue={(v('sort') as number) || 0} /></div>
      <div className="sm:col-span-2"><label className="label">タイトル *</label><input name="title" required className="input" defaultValue={v('title') as string} placeholder="例）今月の相場ハイライト" /></div>
      <div className="sm:col-span-2"><label className="label">概要</label><input name="summary" className="input" defaultValue={v('summary') as string} placeholder="一覧に表示される短い説明" /></div>
      <div className="sm:col-span-2"><label className="label">本文（任意）</label><textarea name="body" rows={4} className="input" defaultValue={v('body') as string} placeholder="そのまま表示する本文" /></div>
      <div className="sm:col-span-2">
        <label className="label">動画URL（任意）</label>
        <input name="video_url" className="input" defaultValue={v('video_url') as string} placeholder="YouTube / Vimeo の共有URL、または mp4 等の直リンク" />
        <p className="mt-1 text-xs text-slate-400">埋め込みプレーヤーで表示されます（YouTube・Vimeo・mp4対応）。</p>
      </div>
      <div className="sm:col-span-2"><label className="label">リンクURL（任意）</label><input name="url" className="input" defaultValue={v('url') as string} placeholder="https://… 外部資料・ダウンロードなど" /></div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} className="h-4 w-4" /> 公開する
        </label>
      </div>
      <div className="sm:col-span-2"><button className="btn-accent w-full">{submitLabel}</button></div>
    </form>
  );
}
