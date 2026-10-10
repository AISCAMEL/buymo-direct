'use client';

import { useState } from 'react';
import { ImagePlus, Loader2, X, Gavel } from 'lucide-react';
import { createPartAuction } from '@/app/parts/actions';
import { createClient } from '@/lib/supabase/client';
import { PART_CATEGORY_LABEL, DURATION_OPTIONS, type PartCategory } from '@/lib/part-auction';

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

export function PartAuctionForm() {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
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
        <label className="label">説明</label>
        <textarea name="description" rows={4} className="input" placeholder="メーカー・型番・サイズ・使用状況・付属品・発送方法など" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">開始価格（円）*</label>
          <input name="start_price" type="number" min={0} step={100} required className="input" placeholder="1000" />
        </div>
        <div>
          <label className="label">即決価格（任意）</label>
          <input name="buy_now_price" type="number" min={0} step={100} className="input" placeholder="未設定可" />
        </div>
        <div>
          <label className="label">出品期間</label>
          <select name="duration" className="input" defaultValue={3}>
            {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
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
