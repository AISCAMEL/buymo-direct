// 車両の登録情報（年式・走行距離・メーカー/ボディ）から、故障保証の対象可否を「自動判定」する。
// 買い手がオプションを操作しなくても、詳細ページでこの車の保証ステータスを自動表示するために使う。
import { isImportMaker } from '@/lib/warranty';
import { ageTier, kmTier } from '@/lib/warranty-domestic';
import { importAgeTier, isImportWarrantyIneligible } from '@/lib/warranty-import';

export type WarrantyAutoStatus = {
  eligible: boolean;
  /** 見出し（例：「故障保証：対象」） */
  headline: string;
  /** 自動判定の内訳（登録年数・走行距離など） */
  detail: string;
  /** 対象外のときの理由コード */
  reason?: 'ev' | 'over' | 'unknown';
};

type Vehicle = { year?: number | null; mileageKm?: number | null; maker?: string | null; bodyType?: string | null };

/** 登録情報から故障保証の可否を自動判定する（国産：13年・13万km / 輸入：10年・8.1万km / EVは対象外）。 */
export function warrantyAutoStatus(v: Vehicle): WarrantyAutoStatus {
  const nowY = new Date().getFullYear();
  const age = v.year ? Math.max(0, nowY - v.year) : null;
  const manKm = v.mileageKm != null ? Math.round(v.mileageKm / 1000) / 10 : null;
  const specBits = [
    age != null ? `登録${age}年相当` : null,
    manKm != null ? `走行${manKm}万km` : null,
  ].filter(Boolean).join('・');
  const specPrefix = specBits || '登録情報';

  // 年式・走行が未登録のときは判定不能
  if (v.year == null && v.mileageKm == null) {
    return { eligible: false, headline: '故障保証：要確認', detail: '年式・走行距離が未登録のため自動判定できません', reason: 'unknown' };
  }

  if (isImportMaker(v.maker)) {
    if (isImportWarrantyIneligible(v.maker)) {
      return { eligible: false, headline: '故障保証：対象外', detail: '電気自動車（EV）は故障保証の対象外です', reason: 'ev' };
    }
    const tier = importAgeTier(v.year, v.mileageKm);
    if (tier == null) {
      return { eligible: false, headline: '故障保証：対象外', detail: `${specPrefix}（輸入車は初度登録10年・走行8.1万kmまでが対象）`, reason: 'over' };
    }
    return { eligible: true, headline: '故障保証：対象（輸入車）', detail: `${specPrefix} → この車は故障保証をおつけいただけます` };
  }

  const a = ageTier(v.year);
  const k = kmTier(v.mileageKm);
  if (a == null || k == null) {
    return { eligible: false, headline: '故障保証：対象外', detail: `${specPrefix}（国産は13年・13万kmまでが対象）`, reason: 'over' };
  }
  return { eligible: true, headline: '故障保証：対象', detail: `${specPrefix} → この車は故障保証をおつけいただけます` };
}
