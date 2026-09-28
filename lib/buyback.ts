// 買取保証（個人会員の出品のみ対象）の共通ロジック。
// 出品画面には出さず、会員のマイページ内でのみ提示する。

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
