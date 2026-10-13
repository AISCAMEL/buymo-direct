'use client';

import { SingleImageUploader } from '@/components/ImageUploader';
import { WORK_CASE_CATEGORIES, type WorkCase } from '@/lib/work-cases';

/** 作業事例の作成/編集フォーム（action は呼び出し側で bind）。 */
export function WorkCaseForm({
  action,
  initial,
  submitLabel = '保存する',
}: {
  action: (fd: FormData) => void;
  initial?: Partial<WorkCase>;
  submitLabel?: string;
}) {
  const v = (k: keyof WorkCase) => (initial?.[k] as string | number | null | undefined) ?? '';
  return (
    <form action={action} className="card space-y-5 p-6">
      {/* ビフォーアフター写真 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SingleImageUploader name="before_url" label="施工前の写真（ビフォー）" initial={(v('before_url') as string) || ''} aspect="aspect-[4/3]" />
        <SingleImageUploader name="after_url" label="施工後の写真（アフター）" initial={(v('after_url') as string) || ''} aspect="aspect-[4/3]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">カテゴリー</label>
          <select name="category" className="input" defaultValue={(v('category') as string) || WORK_CASE_CATEGORIES[0]}>
            {WORK_CASE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">対象車種</label><input name="car_name" className="input" defaultValue={v('car_name') as string} placeholder="例）トヨタ アクア" /></div>
      </div>

      <div><label className="label">タイトル *</label><input name="title" required className="input" defaultValue={v('title') as string} placeholder="例）フロントバンパーのキズ・へこみ補修" /></div>
      <div><label className="label">作業内容</label><textarea name="description" rows={3} className="input" defaultValue={v('description') as string} placeholder="どんな作業をしたか、仕上がりのポイントなど" /></div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="label">料金（円）</label><input name="price" type="number" className="input" defaultValue={(v('price') as number) || ''} placeholder="22000" /></div>
        <div><label className="label">所要時間</label><input name="duration" className="input" defaultValue={v('duration') as string} placeholder="例）半日 / 30分" /></div>
        <div><label className="label">実施日</label><input name="work_date" type="date" className="input" defaultValue={v('work_date') as string} /></div>
      </div>

      {/* お客様の声 */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-600">お客様の声（任意）</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">お客様の表示名</label><input name="customer_name" className="input" defaultValue={v('customer_name') as string} placeholder="例）田村 さん" /></div>
          <div>
            <label className="label">評価</label>
            <select name="rating" className="input" defaultValue={(v('rating') as number) || ''}>
              <option value="">選択なし</option>
              <option value="5">★★★★★ 5</option>
              <option value="4">★★★★ 4</option>
              <option value="3">★★★ 3</option>
              <option value="2">★★ 2</option>
              <option value="1">★ 1</option>
            </select>
          </div>
        </div>
        <div><label className="label">コメント</label><textarea name="customer_voice" rows={2} className="input" defaultValue={v('customer_voice') as string} placeholder="例）新品みたいに直りました。見積りどおりで安心でした。" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} className="h-4 w-4" /> 公開する
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">並び順</label>
          <input name="sort" type="number" className="input w-24" defaultValue={(v('sort') as number) || 0} />
        </div>
      </div>

      <button type="submit" className="btn-accent w-full">{submitLabel}</button>
    </form>
  );
}
