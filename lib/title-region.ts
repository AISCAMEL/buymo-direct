import { PREF_REGION } from '@/lib/transport';

export type TitleDistance = 'near' | 'far' | 'unknown';

/**
 * 買主の登録地域と車両の所在地から、名義変更の「通常／遠隔」を自動判定する。
 *  - 同一地方（例：東京⇔神奈川）＝近距離 → 通常代行（standard）
 *  - 異なる地方（例：東京⇔大阪）＝遠距離 → 遠隔代行（出張封印・remote）
 *  - どちらかの地域が不明な場合は判定不能（unknown）。既定は通常。
 */
export function judgeTitleTransfer(
  buyerPref?: string | null,
  carPref?: string | null,
): {
  option: 'standard' | 'remote';
  distance: TitleDistance;
  buyerRegion: string | null;
  carRegion: string | null;
} {
  const buyerRegion = buyerPref ? PREF_REGION[buyerPref] ?? null : null;
  const carRegion = carPref ? PREF_REGION[carPref] ?? null : null;
  if (!buyerRegion || !carRegion) {
    return { option: 'standard', distance: 'unknown', buyerRegion, carRegion };
  }
  const near = buyerRegion === carRegion;
  return {
    option: near ? 'standard' : 'remote',
    distance: near ? 'near' : 'far',
    buyerRegion,
    carRegion,
  };
}
