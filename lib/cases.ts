// 案件(Case)とスキルの共通定義（ラベル・ステータス・表示整形）。

export type CaseSource = 'HQ' | 'DIRECT' | 'PARTNER';
export type CaseStatus = 'new' | 'accepted' | 'in_progress' | 'awaiting' | 'completed' | 'paid' | 'closed' | 'declined';

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  new: '新規', accepted: '受注', in_progress: '対応中', awaiting: '確認待ち',
  completed: '完了', paid: '報酬確定', closed: '終了', declined: '辞退',
};
export const CASE_STATUS_CLS: Record<CaseStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  accepted: 'bg-navy-100 text-navy-700',
  in_progress: 'bg-blue-100 text-blue-700',
  awaiting: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
  declined: 'bg-red-100 text-red-600',
};
export const CASE_SOURCE_LABEL: Record<CaseSource, string> = { HQ: '本部配信', DIRECT: '直接', PARTNER: '直接依頼' };

/**
 * 加盟店が次に取れる状態遷移（「完了」は成約金額の入力が必要なため含めない。
 * 完了は canCompleteCase() が true の案件で専用フォームから確定する）。
 */
export function partnerNextStatuses(current: string): { status: CaseStatus; label: string }[] {
  switch (current) {
    case 'new': return [{ status: 'accepted', label: '受ける' }, { status: 'declined', label: '辞退' }];
    case 'accepted': return [{ status: 'in_progress', label: '対応開始' }];
    case 'in_progress': return [{ status: 'awaiting', label: '確認待ちにする' }];
    default: return [];
  }
}

/** この案件を「完了（成約金額の入力あり）」にできるか。 */
export function canCompleteCase(current: string): boolean {
  return current === 'accepted' || current === 'in_progress' || current === 'awaiting';
}

/** スキルキー→日本語名（フォールバックはキーそのもの）。DBのskillsと重複するが表示用に最低限保持。 */
export const SKILL_LABEL: Record<string, string> = {
  appraisal: '車両査定', buyback: '中古車買取', sales: '中古車販売',
  maintenance: '整備', inspection: '車検', bodywork: '板金', painting: '塗装', tire: 'タイヤ交換',
  coating: 'コーティング', cleaning: 'ルームクリーニング',
  nav_install: 'ナビ取付', drive_recorder: 'ドラレコ取付', electrical: '電装',
  transport: '陸送', delivery: '納車', registration: '名義変更', scrap: '廃車', dismantle: '解体', other: 'その他',
};
export function skillLabel(key: string): string {
  return SKILL_LABEL[key] ?? key;
}

/** CASE-000001 形式に整形。 */
export function formatCaseNo(no: number | null | undefined): string {
  if (no == null) return 'CASE-—';
  return 'CASE-' + String(no).padStart(6, '0');
}
