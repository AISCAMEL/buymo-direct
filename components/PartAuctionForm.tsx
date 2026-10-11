'use client';

import { useState, useRef } from 'react';
import { ImagePlus, Loader2, X, Gavel, Sparkles, TrendingUp } from 'lucide-react';
import { createPartAuction } from '@/app/parts/actions';
import { createClient } from '@/lib/supabase/client';
import { AiDescriptionButton } from '@/components/AiDescriptionButton';
import { PART_CATEGORY_LABEL, DURATION_OPTIONS, CAR_MAKERS, type PartCategory } from '@/lib/part-auction';

const supabase = createClient();

/** listing-images バケットへ直接アップロード（一般ユーザー可。先頭フォルダは自分の user id）。 */
async function uploadFile(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインが必要です');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';
  const path = `${user.id}/parts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage
    .from('listing-images')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('listing-images').getPublicUrl(path);
  return pub.publicUrl;
}

interface PriceSuggestion {
  ai: boolean; sample_count: number; median: number;
  start: number; buy_now: number; low: number; high: number; note: string;
}

export function PartAuctionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [buyNow, setBuyNow] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);

  async function suggestPrice() {
    setSuggesting(true); setError(null);
    try {
      const fd = new FormData(formRef.current ?? undefined);
      const res = await fetch('/api/parts/price-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: String(fd.get('title') || ''),
          category: String(fd.get('category') || 'other'),
          item_condition: String(fd.get('item_condition') || 'used'),
          fit_maker: String(fd.get('fit_maker') || ''),
          fit_model: String(fd.get('fit_model') || ''),
        }),
      });
      if (!res.ok) throw new Error('相場の取得に失敗しました');
      const data = (await res.json()) as PriceSuggestion;
      setSuggestion(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '相場の取得に失敗しました');
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    if (suggestion.start > 0) setStartPrice(String(suggestion.start));
    if (suggestion.buy_now > 0) setBuyNow(String(suggestion.buy_now));
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true); setError(null);
    try {
      const urls: string[] = [];
      for (const f of files.slice(0, 10 - images.length)) urls.push(await uploadFile(f));
      setImages((prev) => [...prev, ...urls].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set('images', JSON.stringify(images));
    const res = await createPartAuction(fd);
    setSaving(false);
    if (res && !res.ok) setError(res.error ?? '出品に失敗しました');
    // 成功時はサーバー側で /parts/[id] へリダイレクト
  }

  const cats = Object.keys(PART_CATEGORY_LABEL) as PartCategory[];

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label">商品名 *</label>
        <input name="title" required className="input" placeholder="例）純正アルミホイール 17インチ 4本セット" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">カテゴリ</label>
          <select name="category" className="input" defaultValue="wheel">
            {cats.map((c) => <option key={c} value={c}>{PART_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">状態</label>
          <select name="item_condition" className="input" defaultValue="used">
            <option value="used">中古</option>
            <option value="new">新品</option>
          </select>
        </div>
      </div>

      {/* 画像 */}
      <div>
        <label className="label">画像（最大10枚）</label>
        <div className="flex flex-wrap gap-2">
          {images.map((u, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {images.length < 10 && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="label mb-0">説明</label>
          <AiDescriptionButton kind="parts" currentText={description} onGenerated={setDescription} showGenerate={false} />
        </div>
        <textarea
          name="description"
          rows={4}
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="メーカー・型番・サイズ・使用状況・付属品・発送方法など"
        />
        <p className="mt-1 text-xs text-slate-400">少し書いて「AIで添削」を押すと、状態・発送が伝わる文章に整えます（事実は変えません）。</p>
      </div>

      {/* AI相場 */}
      <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-accent-700"><TrendingUp className="h-4 w-4" /> AIで相場を調べる</p>
          <button type="button" onClick={suggestPrice} disabled={suggesting}
            className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-600 disabled:opacity-50">
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 相場を調べる
          </button>
        </div>
        {suggestion && (
          <div className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-white p-2 text-center"><p className="text-[10px] text-slate-400">推奨開始</p><p className="font-black text-navy-800">¥{suggestion.start.toLocaleString()}</p></div>
              <div className="rounded-lg bg-white p-2 text-center"><p className="text-[10px] text-slate-400">想定落札（下限〜上限）</p><p className="font-black text-navy-800">¥{suggestion.low.toLocaleString()}〜{suggestion.high.toLocaleString()}</p></div>
              <div className="rounded-lg bg-white p-2 text-center"><p className="text-[10px] text-slate-400">推奨即決</p><p className="font-black text-navy-800">¥{suggestion.buy_now.toLocaleString()}</p></div>
              <div className="rounded-lg bg-white p-2 text-center"><p className="text-[10px] text-slate-400">参照データ</p><p className="font-black text-navy-800">{suggestion.sample_count}件{suggestion.ai ? ' +AI' : ''}</p></div>
            </div>
            <p className="text-xs text-slate-500">{suggestion.note}</p>
            <button type="button" onClick={applySuggestion} className="rounded-lg border border-accent-300 px-3 py-1.5 text-xs font-bold text-accent-700 hover:bg-accent-50">この価格を反映する</button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">開始価格（円）*</label>
          <input name="start_price" type="number" min={0} step={100} required className="input" placeholder="1000"
            value={startPrice} onChange={(e) => setStartPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">最低落札価格（任意）</label>
          <input name="reserve_price" type="number" min={0} step={100} className="input" placeholder="未設定可" />
        </div>
        <div>
          <label className="label">即決価格（任意）</label>
          <input name="buy_now_price" type="number" min={0} step={100} className="input" placeholder="未設定可"
            value={buyNow} onChange={(e) => setBuyNow(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">出品期間</label>
          <select name="duration" className="input" defaultValue={3}>
            {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-slate-400">最低落札価格を設定すると、その額に達しない場合は落札されません（非公開）。終了間際の入札で自動延長されます。</p>

      {/* 適合車種（任意） */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="mb-2 text-sm font-bold text-navy-700">適合車種（任意）</p>
        <p className="mb-3 text-xs text-slate-400">入力すると「車種で絞り込み」に表示され、購入者が自分の車に合う物を見つけやすくなります。</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">メーカー</label>
            <select name="fit_maker" className="input" defaultValue="">
              <option value="">指定なし</option>
              {CAR_MAKERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">車種・型式</label>
            <input name="fit_model" className="input" placeholder="例）プリウス 30系 / ZVW30" />
          </div>
          <div>
            <label className="label">年式（から）</label>
            <input name="fit_year_from" type="number" min={1980} max={2100} className="input" placeholder="2009" />
          </div>
          <div>
            <label className="label">年式（まで）</label>
            <input name="fit_year_to" type="number" min={1980} max={2100} className="input" placeholder="2015" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving || uploading} className="btn-accent w-full py-3 disabled:opacity-50">
        {saving ? '出品中…' : <><Gavel className="h-4 w-4" /> この内容で出品する</>}
      </button>
      <p className="text-center text-xs text-slate-400">パーツは買取保証の対象外です。オークション形式での販売になります。</p>
    </form>
  );
}
