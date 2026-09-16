'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GripVertical, ImagePlus, X, Loader2, ShieldCheck, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import { MAKERS, BODY_TYPES, TRANSMISSIONS, FUELS, PREFECTURES } from '@/lib/constants';
import type { Listing, ListingImage } from '@/lib/types';
import { AiDescriptionButton } from '@/components/AiDescriptionButton';
import { formatYen } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_MARKER = '/listing-images/';

function pathFromUrl(url: string): string | null {
  const i = url.indexOf(STORAGE_MARKER);
  return i >= 0 ? url.slice(i + STORAGE_MARKER.length) : null;
}

type ImageItem = {
  key: string;
  url: string;
  file?: File;
  dbId?: string;
};

export function ListingForm({
  userId,
  listing,
  existingImages = [],
}: {
  userId: string;
  listing?: Listing;
  existingImages?: ListingImage[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const isEdit = !!listing;

  // ウィザードから引き継いだパラメータ
  const wizardMaker       = sp.get('maker') ?? '';
  const wizardModel       = sp.get('model') ?? '';
  const wizardYear        = sp.get('year') ? Number(sp.get('year')) : null;
  const wizardMileage     = sp.get('mileage_km') ? Number(sp.get('mileage_km')) : null;
  const wizardAiMin       = sp.get('ai_price_min') ? Number(sp.get('ai_price_min')) : null;
  const wizardAiMax       = sp.get('ai_price_max') ? Number(sp.get('ai_price_max')) : null;
  const wizardType        = (sp.get('listing_type') ?? 'direct') as 'direct' | 'proxy';

  const [maker, setMaker] = useState(listing?.maker ?? wizardMaker);
  const [modelVal, setModelVal] = useState(listing?.model ?? wizardModel);
  const [year, setYear] = useState(listing?.year ?? wizardYear ?? CURRENT_YEAR - 3);
  const [mileageKm, setMileageKm] = useState(listing?.mileage_km ?? wizardMileage ?? 0);
  const [listingType, setListingType] = useState<'direct' | 'proxy'>(listing?.listing_type ?? wizardType);
  const [description, setDescription] = useState(listing?.description ?? '');
  const [images, setImages] = useState<ImageItem[]>(
    [...existingImages]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ key: img.id, url: img.url, dbId: img.id }))
  );
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dragFromRef = useRef<number | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, 10 - images.length);
    const items: ImageItem[] = picked.map((file, i) => ({
      key: `new-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...items]);
    e.target.value = '';
  }

  function removeImage(idx: number) {
    const img = images[idx];
    if (img.dbId) setRemovedIds((prev) => [...prev, img.dbId!]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    dragFromRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnter(idx: number) {
    const from = dragFromRef.current;
    if (from === null || from === idx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragFromRef.current = idx;
  }

  function onDragEnd() {
    dragFromRef.current = null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const fd = new FormData(e.currentTarget);

    const expiresVal = String(fd.get('expires_at') || '');
    const fields = {
      title: String(fd.get('title')),
      maker: String(fd.get('maker')),
      model: String(fd.get('model')),
      year: Number(fd.get('year')),
      mileage_km: Number(fd.get('mileage_km')),
      price: Number(fd.get('price')),
      body_type: String(fd.get('body_type')) || null,
      transmission: String(fd.get('transmission')) || null,
      fuel: String(fd.get('fuel')) || null,
      color: String(fd.get('color')) || null,
      prefecture: String(fd.get('prefecture')),
      repair_history: fd.get('repair_history') === 'on',
      description: String(fd.get('description')) || null,
      vin: String(fd.get('vin') || '').trim() || null,
      video_url: String(fd.get('video_url') || '').trim() || null,
      expires_at: expiresVal ? new Date(expiresVal).toISOString() : null,
      listing_type: listingType,
      fee_rate: listingType === 'proxy' ? 7.00 : 3.00,
      ai_price_min: wizardAiMin,
      ai_price_max: wizardAiMax,
    };

    try {
      let listingId = listing?.id;

      if (isEdit) {
        const { error: upErr } = await supabase
          .from('listings')
          .update(fields)
          .eq('id', listingId!)
          .eq('seller_id', userId);
        if (upErr) throw upErr;

        // 削除対象の既存画像を DB / Storage から消す
        if (removedIds.length > 0) {
          await supabase.from('listing_images').delete().in('id', removedIds);
          const paths = removedIds
            .map((id) => {
              const img = existingImages.find((x) => x.id === id);
              return img ? pathFromUrl(img.url) : null;
            })
            .filter((p): p is string => !!p);
          if (paths.length > 0) await supabase.storage.from('listing-images').remove(paths);
        }
      } else {
        const { data: created, error: insErr } = await supabase
          .from('listings')
          .insert({ seller_id: userId, status: 'active', ...fields })
          .select('id')
          .single();
        if (insErr || !created) throw insErr ?? new Error('出品の作成に失敗しました');
        listingId = created.id;
        // フォロワーに通知（fire-and-forget）
        fetch('/api/notify/new-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId }),
        }).catch(() => {});
      }

      // 全画像を現在の並び順で保存（既存は sort_order 更新、新規はアップロード後に INSERT）
      for (let sortOrder = 0; sortOrder < images.length; sortOrder++) {
        const img = images[sortOrder];
        if (img.dbId) {
          await supabase
            .from('listing_images')
            .update({ sort_order: sortOrder })
            .eq('id', img.dbId);
        } else if (img.file) {
          const file = await compressImage(img.file);
          const path = `${userId}/${listingId}/${Date.now()}-${sortOrder}.jpg`;
          const { error: stErr } = await supabase.storage
            .from('listing-images')
            .upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
          if (stErr) throw stErr;
          const { data: pub } = supabase.storage.from('listing-images').getPublicUrl(path);
          await supabase.from('listing_images').insert({
            listing_id: listingId,
            url: pub.publicUrl,
            sort_order: sortOrder,
          });
        }
      }

      router.push(`/listings/${listingId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
      setSubmitting(false);
    }
  }

  const models = maker && MAKERS[maker] ? MAKERS[maker] : [];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 画像 */}
      <div className="card p-5">
        <label className="label">
          車両写真（最大10枚・ドラッグで並び替え・先頭がサムネイル）
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img, idx) => (
            <div
              key={img.key}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={onDragEnd}
              className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-slate-200 active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />

              {/* グリップハンドル */}
              <div className="absolute left-1 top-1 rounded bg-black/40 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
                <GripVertical className="h-3 w-3" />
              </div>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>

              {idx === 0 && (
                <span className="badge absolute bottom-1 left-1 bg-navy-500 text-white">表紙</span>
              )}
            </div>
          ))}
          {images.length < 10 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
              <ImagePlus className="h-6 w-6" />
              <span className="mt-1 text-xs">追加</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
            </label>
          )}
        </div>
        {images.length > 1 && (
          <p className="mt-2 text-xs text-slate-400">
            ドラッグで並び替え可。先頭の画像がサムネイルになります。
          </p>
        )}
      </div>

      {/* 基本情報 */}
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">タイトル *</label>
          <input
            name="title"
            required
            defaultValue={listing?.title}
            className="input"
            placeholder="例：車検2年付き ワンオーナー 禁煙車"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">メーカー *</label>
            <select
              name="maker"
              required
              className="input"
              value={maker}
              onChange={(e) => { setMaker(e.target.value); setModelVal(''); }}
            >
              <option value="">選択してください</option>
              {Object.keys(MAKERS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">モデル *</label>
            <select
              name="model"
              required
              className="input"
              disabled={!maker}
              value={modelVal}
              onChange={(e) => setModelVal(e.target.value)}
            >
              <option value="">{maker ? '選択してください' : '先にメーカーを選択'}</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">年式 *</label>
            <input
              name="year"
              type="number"
              required
              min={1980}
              max={CURRENT_YEAR}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="label">走行距離(km) *</label>
            <input
              name="mileage_km"
              type="number"
              required
              min={0}
              value={mileageKm}
              onChange={(e) => setMileageKm(Number(e.target.value))}
              className="input"
              placeholder="50000"
            />
          </div>
          <div>
            <label className="label">価格(円) *</label>
            {wizardAiMin && wizardAiMax && (
              <p className="mb-1 text-xs text-slate-400">
                🤖 AI推定: {formatYen(wizardAiMin)} 〜 {formatYen(wizardAiMax)}
              </p>
            )}
            <input
              name="price"
              type="number"
              required
              min={1}
              defaultValue={listing?.price ?? (wizardAiMin && wizardAiMax ? Math.round((wizardAiMin + wizardAiMax) / 2) : undefined)}
              className="input"
              placeholder="1500000"
            />
          </div>
        </div>

        {/* 出品方法 */}
        <div>
          <label className="label">出品方法 *</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className="flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors"
              style={{
                borderColor: listingType === 'direct' ? '#0F766E' : '#e5e7eb',
                background: listingType === 'direct' ? '#E6F2EF' : '#fff',
              }}
            >
              <input type="radio" name="listing_type_ui" value="direct" className="mt-0.5"
                checked={listingType === 'direct'} onChange={() => setListingType('direct')} />
              <div>
                <p className="font-bold text-sm text-navy-800 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> 自分で交渉する
                </p>
                <p className="text-xs text-slate-500 mt-0.5">購入者と直接やり取り</p>
                <span className="mt-1 inline-block rounded-full bg-navy-100 px-2 py-0.5 text-xs font-bold text-navy-700">手数料 3%</span>
              </div>
            </label>
            <label
              className="flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors"
              style={{
                borderColor: listingType === 'proxy' ? '#d97706' : '#e5e7eb',
                background: listingType === 'proxy' ? '#fffbeb' : '#fff',
              }}
            >
              <input type="radio" name="listing_type_ui" value="proxy" className="mt-0.5"
                checked={listingType === 'proxy'} onChange={() => setListingType('proxy')} />
              <div>
                <p className="font-bold text-sm text-amber-800 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> BUYMOに任せる
                </p>
                <p className="text-xs text-slate-500 mt-0.5">スタッフが交渉を代行</p>
                <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">手数料 7%</span>
              </div>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">ボディタイプ</label>
            <select name="body_type" className="input" defaultValue={listing?.body_type ?? ''}>
              <option value="">指定なし</option>
              {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ミッション</label>
            <select name="transmission" className="input" defaultValue={listing?.transmission ?? ''}>
              <option value="">指定なし</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">燃料</label>
            <select name="fuel" className="input" defaultValue={listing?.fuel ?? ''}>
              <option value="">指定なし</option>
              {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">カラー</label>
            <input
              name="color"
              className="input"
              defaultValue={listing?.color ?? ''}
              placeholder="パールホワイト"
            />
          </div>
          <div>
            <label className="label">地域 *</label>
            <select name="prefecture" required className="input" defaultValue={listing?.prefecture ?? ''}>
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            name="repair_history"
            defaultChecked={listing?.repair_history}
            className="h-4 w-4 rounded border-slate-300"
          />
          修復歴あり
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">説明・コメント</label>
            <AiDescriptionButton
              maker={maker}
              model={modelVal}
              year={year}
              mileage_km={mileageKm}
              condition="普通"
              onGenerated={(s) => setDescription(s)}
            />
          </div>
          <textarea
            name="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="装備・整備履歴・キズの状態・受け渡し方法など"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">VIN（車台番号）</label>
            <input
              name="vin"
              className="input font-mono uppercase tracking-wider"
              defaultValue={listing?.vin ?? ''}
              placeholder="JTEBx3FJ900XXXXXX"
              maxLength={17}
            />
            <p className="mt-0.5 text-xs text-slate-400">入力すると車台番号確認済みバッジが表示されます</p>
          </div>
          <div>
            <label className="label">動画URL（YouTube など）</label>
            <input
              name="video_url"
              type="url"
              className="input"
              defaultValue={listing?.video_url ?? ''}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>

        <div>
          <label className="label">出品期限（タイマー）</label>
          <input
            name="expires_at"
            type="datetime-local"
            className="input"
            defaultValue={listing?.expires_at ? listing.expires_at.slice(0, 16) : ''}
          />
          <p className="mt-0.5 text-xs text-slate-400">設定すると期限後に自動的に非表示になります（空欄は無期限）</p>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="btn-outline">
          キャンセル
        </button>
        <button type="submit" disabled={submitting} className="btn-accent px-8">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? '保存中…' : isEdit ? '変更を保存する' : 'この内容で出品する'}
        </button>
      </div>
    </form>
  );
}
