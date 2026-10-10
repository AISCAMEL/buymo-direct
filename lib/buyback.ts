// 買取保証（個人会員の出品のみ対象）の共通ロジック。
// 出品画面には出さず、会員のマイページ内でのみ提示する。

import { estimateTransport } from '@/lib/transport';

/** 買取車両を集約する拠点の都道府県（陸送費の着地点）。 */
export const BUYBACK_BASE_PREF = '東京都';

/**
 * 遠方の場合に買取保証額から差し引く陸送費の目安（発送元→拠点）。
 * 同一拠点・不明は 0。普通車・通常車両を基準に中央値を1,000円丸めで算出する。
 * 最終額は管理画面で確認・調整できる（あくまで目安）。
 */
export function estimateBuybackTransport(fromPref: string | null | undefined): number {
  if (!fromPref || fromPref === BUYBACK_BASE_PREF) return 0;
  const est = estimateTransport(fromPref, BUYBACK_BASE_PREF, 'normal', 'standard');
  if (!est) return 0;
  return Math.round((est.low + est.high) / 2 / 1000) * 1000;
}

/** 出品からの保証期間（日）。この期間内に売れなければ買取保証の対象。 */
export const GUARANTEE_DAYS = 30;
/** 期限の何日前からリマインドするか。 */
export const REMIND_DAYS = 7;
/** 延長時に追加する日数。 */
export const EXTEND_DAYS = 30;

const DAY = 86_400_000;

/** AI査定レンジから買取保証価格（中央値の75%・1万円丸め）。 */
export function buybackPriceOf(aiMin: number, aiMax: number): number {
  const mid = (aiMin + aiMax) / 2;
  return Math.round((mid * 0.75) / 10000) * 10000;
}

/** 保証期限を算出（guarantee_until 優先、なければ created_at + 既定日数）。 */
export function guaranteeUntil(createdAt: string, guaranteeUntilCol: string | null): Date {
  if (guaranteeUntilCol) return new Date(guaranteeUntilCol);
  return new Date(new Date(createdAt).getTime() + GUARANTEE_DAYS * DAY);
}

export type GuaranteeState = 'active' | 'expiring' | 'expired';

/** 期限までの残日数と状態。 */
export function guaranteeStatus(until: Date, now: number = Date.now()): { daysLeft: number; state: GuaranteeState } {
  const daysLeft = Math.ceil((until.getTime() - now) / DAY);
  const state: GuaranteeState = daysLeft < 0 ? 'expired' : daysLeft <= REMIND_DAYS ? 'expiring' : 'active';
  return { daysLeft, state };
}
