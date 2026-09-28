'use client';

import { updateDealerProfile } from '@/app/dealer/actions';
import { PREFECTURES } from '@/lib/constants';
import { SingleImageUploader, GalleryUploader } from '@/components/ImageUploader';
import type { Dealer } from '@/lib/types';

export function DealerSettingsForm({ d, isOwner }: { d: (Dealer & Record<string, unknown>) | null; isOwner: boolean }) {
  const gallery = Array.isArray(d?.gallery) ? (d!.gallery as string[]) : [];
  const val = (k: string) => (d?.[k] as string | null) ?? '';

  return (
    <form action={updateDealerProfile} className="space-y-6">
      {/* 見た目（画像） */}
      <section className="card space-y-4 p-6">
        <h2 className="font-bold text-slate-700">店舗の見た目</h2>
        <SingleImageUploader name="cover_url" label="カバー画像（お店の雰囲気・横長）" initial={val('cover_url')} aspect="aspect-[3/1]" />
        <div className="flex flex-wrap gap-6">
          <SingleImageUploader name="logo_url" label="ロゴ / 店舗アイコン" initial={val('logo_url')} rounded />
        </div>
        <GalleryUploader name="gallery" label="店内・スタッフ・作業風景など" initial={gallery} max={6} />
      </section>

      {/* 基本情報 */}
      <section className="card space-y-4 p-6">
        <h2 className="font-bold text-slate-700">基本情報</h2>
        <div><label className="label">店舗名 *</label><input name="name" required className="input" defaultValue={val('name')} /></div>
        <div><label className="label">法人名</label><input name="company_name" className="input" defaultValue={val('company_name')} /></div>
        <div><label className="label">キャッチコピー</label>
          <input name="tagline" className="input" defaultValue={val('tagline')} placeholder="例）地域No.1の安心整備。車のことなら何でもお任せ！" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">都道府県</label>
            <select name="prefecture" className="input" defaultValue={val('prefecture')}>
              <option value="">選択</option>{PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select></div>
          <div><label className="label">対応エリア</label><input name="service_area" className="input" defaultValue={val('service_area')} placeholder="例）いわき市・双葉郡" /></div>
        </div>
        <div><label className="label">住所</label><input name="address" className="input" defaultValue={val('address')} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">電話番号</label><input name="phone" type="tel" className="input" defaultValue={val('phone')} /></div>
          <div><label className="label">営業時間</label><input name="business_hours" className="input" defaultValue={val('business_hours')} placeholder="例）9:00〜18:00" /></div>
          <div><label className="label">定休日</label><input name="holidays" className="input" defaultValue={val('holidays')} placeholder="例）日曜・祝日" /></div>
        </div>
        <div><label className="label">創業・設立</label><input name="established" className="input" defaultValue={val('established')} placeholder="例）2015年" /></div>
      </section>

      {/* 担当者 */}
      <section className="card space-y-4 p-6">
        <h2 className="font-bold text-slate-700">担当者紹介</h2>
        <div className="flex flex-wrap items-start gap-6">
          <SingleImageUploader name="rep_photo_url" label="担当者の顔写真" initial={val('rep_photo_url')} rounded />
          <div className="min-w-[220px] flex-1 space-y-4">
            <div><label className="label">担当者名</label><input name="rep_name" className="input" defaultValue={val('rep_name')} placeholder="例）代表 山田 太郎" /></div>
            <div><label className="label">担当者からの一言</label>
              <textarea name="rep_message" rows={3} className="input" defaultValue={val('rep_message')} placeholder="例）どんな小さなことでもお気軽にご相談ください。丁寧・迅速に対応します！" /></div>
          </div>
        </div>
      </section>

      {/* 紹介・SNS */}
      <section className="card space-y-4 p-6">
        <h2 className="font-bold text-slate-700">紹介・リンク</h2>
        <div><label className="label">店舗紹介文</label>
          <textarea name="description" rows={4} className="input" defaultValue={val('description')} placeholder="お店の強み・実績・こだわりなど" /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">公式サイト</label><input name="website_url" type="url" className="input" defaultValue={val('website_url')} placeholder="https://" /></div>
          <div><label className="label">Instagram</label><input name="instagram_url" type="url" className="input" defaultValue={val('instagram_url')} placeholder="https://instagram.com/..." /></div>
          <div><label className="label">LINE公式</label><input name="line_url" type="url" className="input" defaultValue={val('line_url')} placeholder="https://lin.ee/..." /></div>
        </div>
      </section>

      {!isOwner && <p className="text-xs text-slate-400">※ 設定変更はオーナーのみ可能です。</p>}
      <button type="submit" disabled={!isOwner} className="btn-accent w-full disabled:opacity-50">保存する</button>
    </form>
  );
}
