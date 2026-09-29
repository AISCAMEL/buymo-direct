import { LEARN_CATEGORY_LABEL, type LearningContent } from '@/lib/learn';

/** 学習コンテンツの作成/編集フォーム（action は呼び出し側で bind）。 */
export function LearningForm({ action, initial }: { action: (fd: FormData) => void; initial?: Partial<LearningContent> }) {
  const v = (k: keyof LearningContent) => (initial?.[k] as string | number | undefined) ?? '';
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label className="label">タイトル *</label>
        <input name="title" required className="input" defaultValue={v('title') as string} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">スラッグ（URL・半角英数字） *</label>
          <input name="slug" required className="input" defaultValue={v('slug') as string} placeholder="appraisal-method" />
        </div>
        <div>
          <label className="label">カテゴリー</label>
          <select name="category" className="input" defaultValue={(v('category') as string) || 'basics'}>
            {Object.entries(LEARN_CATEGORY_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">概要</label>
        <input name="summary" className="input" defaultValue={v('summary') as string} />
      </div>
      <div>
        <label className="label">本文</label>
        <textarea name="body" rows={10} className="input" defaultValue={v('body') as string} placeholder="講座本文（改行はそのまま表示されます）" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" name="is_premium" defaultChecked={initial?.is_premium ?? true} className="h-4 w-4" /> 有料会員限定
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} className="h-4 w-4" /> 公開する
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">並び順</label>
          <input name="sort" type="number" className="input w-24" defaultValue={(v('sort') as number) || 0} />
        </div>
      </div>
      <button type="submit" className="btn-accent w-full">保存する</button>
    </form>
  );
}
