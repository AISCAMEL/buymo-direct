'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, ImagePlus, X, Loader2, ShieldCheck, Users, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import { MAKERS, BODY_TYPES, TRANSMISSIONS, FUELS, PREFECTURES, DRIVETRAINS, COLORS, EQUIPMENT_GROUPS } from '@/lib/constants';
import type { Listing, ListingImage } from '@/lib/types';
import { AiDescriptionButton } from '@/components/AiDescriptionButton';
import { formatYen } from '@/lib/format';
import { PHOTO_GUIDE, guideIndex } from '@/lib/photo-guide';

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_MARKER = '/listing-images/';

function pathFromUrl(url: string): string | null {
  const i = url.indexOf(STORAGE_MARKER);
  return i >= 0 ? url.slice(i + STORAGE_MARKER.length) : null;
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

type ImageItem = {
  key: string;
  url: string;
  file?: File;
  dbId?: string;
  caption?: string;
  carried?: boolean; // 査定から引き継いだ既存URL（再アップロード不要）
};

export type ListingInitial = {
  maker?: string;
  model?: string;
  year?: number;
  mileage_km?: number;
  price?: number;
  body_type?: string | null;
  transmission?: string | null;
  fuel?: string | null;
  color?: string | null;
  prefecture?: string | null;
  repair_history?: boolean;
  vin?: string | null;
  description?: string | null;
  listing_type?: 'direct' | 'proxy';
};

export function ListingForm({
  userId,
  listing,
  existingImages = [],
  initial,
  initialImages = [],
  fromAppraisalId,
  dealerId = null,
}: {
  userId: string;
  listing?: Listing;
  existingImages?: ListingImage[];
  initial?: ListingInitial;
  initialImages?: { url: string; caption?: string | null }[];
  fromAppraisalId?: string;
  dealerId?: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const isEdit = !!listing;
  const ownedEquipment = new Set<string>((listing as unknown as { equipment?: string[] | null } | undefined)?.equipment ?? []);

  // ウィザード/査定から引き継いだパラメータ（クエリ優先、なければ initial）
  const wizardMaker       = sp.get('maker') ?? initial?.maker ?? '';
  const wizardModel       = sp.get('model') ?? initial?.model ?? '';
  const wizardYear        = sp.get('year') ? Number(sp.get('year')) : (initial?.year ?? null);
  const wizardMileage     = sp.get('mileage_km') ? Number(sp.get('mileage_km')) : (initial?.mileage_km ?? null);
  const wizardAiMin       = sp.get('ai_price_min') ? Number(sp.get('ai_price_min')) : (initial?.price ?? null);
  const wizardAiMax       = sp.get('ai_price_max') ? Number(sp.get('ai_price_max')) : null;
  const wizardType        = (sp.get('listing_type') ?? initial?.listing_type ?? 'direct') as 'direct' | 'proxy';

  const [maker, setMaker] = useState(listing?.maker ?? wizardMaker);
  const [modelVal, setModelVal] = useState(listing?.model ?? wizardModel);
  const [year, setYear] = useState(listing?.year ?? wizardYear ?? CURRENT_YEAR - 3);
  const [mileageKm, setMileageKm] = useState(listing?.mileage_km ?? wizardMileage ?? 0);
  const [listingType, setListingType] = useState<'direct' | 'proxy'>(listing?.listing_type ?? wizardType);
  const [description, setDescription] = useState(listing?.description ?? initial?.description ?? '');
  const [images, setImages] = useState<ImageItem[]>(() => {
    if (existingImages.length > 0) {
      return [...existingImages]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((img) => ({ key: img.id, url: img.url, dbId: img.id, caption: img.caption ?? undefined }));
    }
    // 査定から引き継いだ写真（既存URL・再アップロード不要）
    return initialImages.map((img, i) => ({
      key: `carried-${i}`,
      url: img.url,
      caption: img.caption ?? undefined,
      carried: true,
    }));
  });
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ガイドスロット（角度指定）にアップロード。既に同じ角度があれば差し替え。
  function onPickSlot(e: React.ChangeEvent<HTMLInputElement>, label: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const existing = images.find((im) => im.caption === label);
    if (existing?.dbId) setRemovedIds((prev) => [...prev, existing.dbId!]);
    setImages((prev) => [
      ...prev.filter((im) => im.caption !== label),
      { key: `slot-${label}-${Date.now()}`, url: URL.createObjectURL(file), file, caption: label },
    ]);
    e.target.value = '';
  }

  // その他の写真（自由・角度指定なし）
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, 15 - images.length);
    const items: ImageItem[] = picked.map((file, i) => ({
      key: `extra-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...items]);
    e.target.value = '';
  }

  function removeByKey(key: string) {
    const img = images.find((im) => im.key === key);
    if (img?.dbId) setRemovedIds((prev) => [...prev, img.dbId!]);
    setImages((prev) => prev.filter((im) => im.key !== key));
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
      drivetrain: String(fd.get('drivetrain') || '') || null,
      shaken_until: String(fd.get('shaken_until') || '') || null,
      prefecture: String(fd.get('prefecture')),
      repair_history: fd.get('repair_history') === 'on',
      description: String(fd.get('description')) || null,
      owner_comment: String(fd.get('owner_comment') || '').trim() || null,
      equipment: fd.getAll('equipment').map(String),
      vin: String(fd.get('vin') || '').trim() || null,
      video_url: String(fd.get('video_url') || '').trim() || null,
      expires_at: expiresVal ? new Date(expiresVal).toISOString() : null,
      listing_type: listingType,
      fee_rate: listingType === 'proxy' ? 7.00 : 3.00,
      ai_price_min: wizardAiMin,
      ai_price_max: wizardAiMax,
      // 加盟店の出品なら販売店(B2C)として分類。ダイレクト販売の価格内訳も保存。
      ...(dealerId
        ? {
            dealer_id: dealerId,
            registration_fee: numOrNull(fd.get('registration_fee')),
            recycle_fee: numOrNull(fd.get('recycle_fee')),
            warranty_fee: numOrNull(fd.get('warranty_fee')),
            delivery_fee: numOrNull(fd.get('delivery_fee')),
            misc_fees: numOrNull(fd.get('misc_fees')),
            tax_amount: numOrNull(fd.get('tax_amount')),
            sale_terms: String(fd.get('sale_terms') || '').trim() || null,
          }
        : {}),
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

      // ガイド順（フロント→リア→…→その他）に並べて保存。
      // 既存は sort_order / caption を更新、新規はアップロード後に INSERT。
      const ordered = [...images].sort((a, b) => guideIndex(a.caption) - guideIndex(b.caption));
      for (let sortOrder = 0; sortOrder < ordered.length; sortOrder++) {
        const img = ordered[sortOrder];
        if (img.dbId) {
          await supabase
            .from('listing_images')
            .update({ sort_order: sortOrder, caption: img.caption ?? null })
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
            caption: img.caption ?? null,
          });
        } else if (img.carried && img.url) {
          // 査定から引き継いだ既存URLはそのまま登録（再アップロード不要）
          await supabase.from('listing_images').insert({
            listing_id: listingId,
            url: img.url,
            sort_order: sortOrder,
            caption: img.caption ?? null,
          });
        }
      }

      // 査定から作成した場合は、その査定を「出品済み」に紐付け（ベストエフォート）
      if (fromAppraisalId && !isEdit && listingId) {
        fetch('/api/appraisal/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appraisalId: fromAppraisalId, listingId }),
        }).catch(() => {});
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
        <div className="mb-1 flex items-center gap-2">
          <Camera className="h-4 w-4 text-navy-500" />
          <label className="label mb-0">車両写真</label>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          下のガイドに沿って撮影・アップロードすると、購入者に伝わりやすくなります。
          先頭（フロント）が一覧のサムネイルになります。すべて任意ですが、多いほど反応が上がります。
        </p>

        {/* 撮影ガイド スロット */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PHOTO_GUIDE.map((g, i) => {
            const img = images.find((im) => im.caption === g.label);
            return (
              <div key={g.label} className="space-y-1">
                <label
                  className={`group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition ${
                    img
                      ? 'border-navy-300'
                      : 'border-dashed border-slate-300 hover:border-navy-300 hover:bg-slate-50'
                  }`}
                >
                  {img ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={g.label} className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="badge absolute bottom-1 left-1 bg-navy-500 text-white">表紙</span>
                      )}
                      <span className="absolute right-1 top-1 rounded-full bg-navy-500 p-0.5 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mb-1 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-navy-50 group-hover:text-navy-500">
                        <ImagePlus className="h-4 w-4" />
                      </span>
                      <span className="px-1 text-center text-[11px] font-bold text-slate-600">{g.label}</span>
                      <span className="px-1 text-center text-[10px] leading-tight text-slate-400">{g.hint}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickSlot(e, g.label)}
                  />
                </label>
                {img && (
                  <div className="flex items-center justify-between px-0.5">
                    <span className="truncate text-[11px] font-bold text-navy-700">{g.label}</span>
                    <button
                      type="button"
                      onClick={() => removeByKey(img.key)}
                      className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`${g.label}を削除`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* その他の写真（自由） */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-bold text-slate-600">その他の写真（自由・任意）</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images
              .filter((im) => guideIndex(im.caption) >= 100)
              .map((img) => (
                <div
                  key={img.key}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeByKey(img.key)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            {images.length < 15 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
                <ImagePlus className="h-6 w-6" />
                <span className="mt-1 text-xs">追加</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
              </label>
            )}
          </div>
        </div>
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
            {dealerId && <p className="mt-1 text-xs text-slate-400">※ ここは「車両本体価格」です。諸費用は下記に入力してください。</p>}
          </div>
        </div>

        {/* ダイレクト販売の価格内訳（加盟店のみ） */}
        {dealerId && (
          <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-4">
            <p className="mb-1 font-bold text-navy-700">ダイレクト販売の価格内訳（任意）</p>
            <p className="mb-3 text-xs text-slate-500">
              入力すると車両ページに「お支払い総額」として表示されます。税務判断はシステムでは行いません。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['registration_fee', '登録費用'],
                ['recycle_fee', 'リサイクル料金'],
                ['warranty_fee', '保証料'],
                ['delivery_fee', '納車費用'],
                ['misc_fees', '諸費用（その他）'],
                ['tax_amount', 'うち消費税（表示用）'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}（円）</label>
                  <input
                    name={key}
                    type="number"
                    min={0}
                    defaultValue={(listing as unknown as Record<string, number | null>)?.[key] ?? undefined}
                    className="input"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="label">販売条件（保証内容・納車条件など）</label>
              <textarea
                name="sale_terms"
                rows={2}
                defaultValue={(listing as unknown as Record<string, string | null>)?.sale_terms ?? undefined}
                className="input"
                placeholder="例）1年保証付き。県外納車は別途ご相談。"
              />
            </div>
          </div>
        )}

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
            <select name="body_type" className="input" defaultValue={listing?.body_type ?? initial?.body_type ?? ''}>
              <option value="">指定なし</option>
              {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label">ミッション</label>
            <select name="transmission" className="input" defaultValue={listing?.transmission ?? initial?.transmission ?? ''}>
              <option value="">指定なし</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">燃料</label>
            <select name="fuel" className="input" defaultValue={listing?.fuel ?? initial?.fuel ?? ''}>
              <option value="">指定なし</option>
              {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">駆動方式</label>
            <select name="drivetrain" className="input" defaultValue={(listing as unknown as { drivetrain?: string } | undefined)?.drivetrain ?? ''}>
              <option value="">指定なし</option>
              {DRIVETRAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">車検満了日</label>
            <input
              name="shaken_until"
              type="date"
              className="input"
              defaultValue={(listing as unknown as { shaken_until?: string } | undefined)?.shaken_until ?? ''}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">カラー</label>
            <input
              name="color"
              list="color-suggestions"
              className="input"
              defaultValue={listing?.color ?? initial?.color ?? ''}
              placeholder="ホワイト"
            />
            <datalist id="color-suggestions">
              {COLORS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="label">地域 *</label>
            <select name="prefecture" required className="input" defaultValue={listing?.prefecture ?? initial?.prefecture ?? ''}>
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            name="repair_history"
            defaultChecked={listing?.repair_history ?? initial?.repair_history}
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
              currentText={description}
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

        {/* オーナーからのひとこと（アピール） */}
        <div>
          <label className="label">オーナーからのひとこと（アピール・任意）</label>
          <textarea
            name="owner_comment"
            rows={3}
            defaultValue={(listing as unknown as { owner_comment?: string | null } | undefined)?.owner_comment ?? ''}
            className="input"
            placeholder="例）新車から大切に乗ってきた一台です。高速も街乗りも燃費がよく、気に入っていました。次のオーナーにも可愛がってほしいです。"
          />
          <p className="mt-0.5 text-xs text-slate-400">車両詳細に、あなたのお名前とともに「オーナーからのひとこと」として表示され、購入検討者への安心・アピールになります。</p>
        </div>

        {/* 装備・オプション（アピールポイント） */}
        <div>
          <label className="label">装備・オプション（当てはまるものを選択）</label>
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            {EQUIPMENT_GROUPS.map((grp) => (
              <div key={grp.group}>
                <p className="mb-1.5 text-xs font-bold text-slate-500">{grp.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {grp.items.map((item) => (
                    <label key={item} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 has-[:checked]:border-navy-400 has-[:checked]:bg-navy-50 has-[:checked]:text-navy-700">
                      <input
                        type="checkbox"
                        name="equipment"
                        value={item}
                        defaultChecked={ownedEquipment.has(item)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">選んだ装備は車両詳細に「装備・オプション」バッジとして表示されます。</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">VIN（車台番号）</label>
            <input
              name="vin"
              className="input font-mono uppercase tracking-wider"
              defaultValue={listing?.vin ?? initial?.vin ?? ''}
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
