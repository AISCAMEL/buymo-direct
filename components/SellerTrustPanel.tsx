import Image from 'next/image';
import { ShieldCheck, Phone, Star, Handshake, CalendarClock, MapPin, BadgeCheck, Store, Lock } from 'lucide-react';

// 取引の安心を伝える保証バッジ（イラスト）
const GUARANTEE_BADGES = [
  { img: '/badge/escrow.png', label: 'エスクロー保護' },
  { img: '/badge/identity.png', label: '本人確認制度' },
  { img: '/badge/reviews.png', label: '口コミ評価' },
];

type Trust = {
  verified: boolean;
  phoneVerified: boolean;
  reviewCount: number;
  avgRating: number;
  soldCount: number;
  memberSince: string | null;
  prefecture: string | null;
  isDealer: boolean;
  hasLicense: boolean;
};

function sinceLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const months = Math.max(0, Math.floor((Date.now() - d.getTime()) / (30 * 86400000)));
  if (months < 1) return '今月から';
  if (months < 12) return `${months}か月`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}年${m}か月` : `${y}年`;
}

/** 出品者の安心情報（本人確認・評価・取引実績など）をシステム連携で自動表示。 */
export function SellerTrustPanel({ t }: { t: Trust }) {
  const since = sinceLabel(t.memberSince);
  const chips: { icon: typeof ShieldCheck; label: string; on: boolean }[] = [
    { icon: ShieldCheck, label: '本人確認済み', on: t.verified },
    { icon: Phone, label: '電話番号認証済み', on: t.phoneVerified },
    { icon: Store, label: '認定加盟店', on: t.isDealer },
    { icon: BadgeCheck, label: '古物商許可登録', on: t.hasLicense },
  ].filter((c) => c.on);

  return (
    <div className="card p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-navy-800">
        <ShieldCheck className="h-4 w-4 text-emerald-500" /> この出品者の安心ポイント
      </p>

      {/* バッジ */}
      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <c.icon className="h-3.5 w-3.5" />{c.label}
            </span>
          ))}
        </div>
      )}

      {/* 実績 */}
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2.5">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><Star className="h-3 w-3" />評価</dt>
          <dd className="mt-0.5 font-black tabular-nums text-navy-800">{t.reviewCount ? `★${t.avgRating.toFixed(1)}` : '—'}</dd>
          <dd className="text-[10px] text-slate-400">{t.reviewCount}件</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><Handshake className="h-3 w-3" />取引実績</dt>
          <dd className="mt-0.5 font-black tabular-nums text-navy-800">{t.soldCount}</dd>
          <dd className="text-[10px] text-slate-400">成約</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5">
          <dt className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><CalendarClock className="h-3 w-3" />利用歴</dt>
          <dd className="mt-0.5 font-black text-navy-800">{since ?? '—'}</dd>
          <dd className="text-[10px] text-slate-400">BUYMO</dd>
        </div>
      </dl>

      {t.prefecture && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />所在地：{t.prefecture}</p>
      )}

      {/* 取引の安心（共通） */}
      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <p className="flex items-start gap-1.5"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />代金は<strong className="mx-0.5">エスクロー</strong>で保護。車両確認後に支払われます。</p>
        <p className="flex items-start gap-1.5"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />やりとりはサイト内チャットで、運営が不審な取引を監視します。</p>
      </div>

      {/* 保証バッジ */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        {GUARANTEE_BADGES.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1 text-center">
            <Image src={b.img} alt="" width={44} height={44} className="h-11 w-11 object-contain" />
            <span className="text-[10px] font-bold leading-tight text-slate-500">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
