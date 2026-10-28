// エスクロー進捗タイムラインのイベント定義（純粋設定・サーバー/クライアント共用）。
// 実データは public.escrow_events テーブル（supabase/escrow_events.sql）に保存。

export type EscrowEventRole = 'admin' | 'seller' | 'buyer';

export type EscrowEventType =
  | 'payment_reported'          // 買主：振込しました（入金報告）
  | 'transport_arranged'        // 売主：陸送を手配しました
  | 'docs_ready'                // 本部：必要書類が揃いました
  | 'eta'                       // 到着予定のご案内
  | 'vehicle_received'          // 買主：車両を受け取りました
  | 'title_completed'           // 本部：名義変更が完了しました
  | 'warranty_record_submitted' // 買主：保証記録簿を提出しました
  | 'warranty_cert_sent';       // 本部：保証書を発送しました

export type EscrowEventDef = {
  type: EscrowEventType;
  emoji: string;
  label: string;
  /** この種別を投稿できる役割（admin は常に全種別を投稿可）。 */
  roles: EscrowEventRole[];
  /** 到着予定日数(ETA)の入力欄を出すか。 */
  hasEta?: boolean;
  /** 受信者向け通知の定型文（相手に届く本文）。 */
  notify: string;
};

export const ESCROW_EVENT_DEFS: EscrowEventDef[] = [
  { type: 'payment_reported',          emoji: '💴', label: '入金（振込）を報告', roles: ['buyer', 'admin'], notify: '買主より入金（お振込み）の報告がありました。' },
  { type: 'transport_arranged',        emoji: '🚚', label: '陸送を手配しました', roles: ['seller', 'admin'], hasEta: true, notify: '車両の陸送が手配されました。' },
  { type: 'docs_ready',                emoji: '📄', label: '必要書類が揃いました', roles: ['admin'], notify: '名義変更に必要な書類が揃いました。' },
  { type: 'eta',                       emoji: '🗓', label: '到着予定のご案内', roles: ['admin', 'seller'], hasEta: true, notify: '車両の到着予定をご案内します。' },
  { type: 'vehicle_received',          emoji: '📦', label: '車両を受け取りました', roles: ['buyer', 'admin'], notify: '買主が車両を受け取りました。' },
  { type: 'title_completed',           emoji: '📝', label: '名義変更が完了しました', roles: ['admin'], notify: '名義変更の手続きが完了しました。' },
  { type: 'warranty_record_submitted', emoji: '🛡', label: '保証記録簿を提出しました', roles: ['buyer', 'admin'], notify: '故障保証の点検記録簿が提出されました。' },
  { type: 'warranty_cert_sent',        emoji: '📮', label: '保証書を発送しました', roles: ['admin'], notify: '故障保証の保証書を発送しました。' },
];

const BY_TYPE = new Map(ESCROW_EVENT_DEFS.map((d) => [d.type, d]));

export function escrowEventDef(type: string): EscrowEventDef | undefined {
  return BY_TYPE.get(type as EscrowEventType);
}

/** その役割が投稿できるイベント定義一覧（admin は全種別）。 */
export function escrowEventsForRole(role: EscrowEventRole): EscrowEventDef[] {
  if (role === 'admin') return ESCROW_EVENT_DEFS;
  return ESCROW_EVENT_DEFS.filter((d) => d.roles.includes(role));
}

export const ESCROW_ROLE_LABEL: Record<EscrowEventRole, string> = {
  admin: '本部',
  seller: '売主',
  buyer: '買主',
};
