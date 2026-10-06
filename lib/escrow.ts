import type { EscrowStatus } from '@/lib/types';

export type EscrowActor = 'buyer' | 'seller' | 'both';
export type EscrowNextAction = { label: string; by: EscrowActor; hint: string };

/** 各ステータスで次に必要な操作（実行者の役割つき）。 */
export const ESCROW_NEXT_ACTION: Partial<Record<EscrowStatus, EscrowNextAction>> = {
  initiated: { label: '代金をエスクローに入金する', by: 'buyer', hint: '買主が代金を入金すると第三者が保全します。' },
  funds_held: { label: '現車確認を完了する', by: 'both', hint: '受け渡し・現車確認が済んだら次へ進めます。' },
  inspection: { label: '名義変更を開始する', by: 'both', hint: '必要書類を揃え、名義変更手続きに進みます。' },
  title_transfer: { label: '取引を完了して送金する', by: 'buyer', hint: '名義変更完了を確認したら売主へ送金されます。' },
};

/** その役割の人が今アクションすべきか。 */
export function isMyTurn(status: EscrowStatus, role: 'buyer' | 'seller'): boolean {
  const a = ESCROW_NEXT_ACTION[status];
  if (!a) return false;
  return a.by === 'both' || a.by === role;
}
