/**
 * eKYC プロバイダー抽象化レイヤー
 * 実プロバイダー: TRUSTDOCK (https://trustdock.io)
 * 環境変数: TRUSTDOCK_API_KEY, TRUSTDOCK_CUSTOMER_ID
 *
 * 環境変数未設定時はモック結果を返します（開発・テスト用）。
 */

export interface EkycResult {
  verified: boolean;
  confidence: number; // 0–1
  documentType: 'drivers_license' | 'my_number' | 'passport' | 'residence_card';
  name?: string;
  dateOfBirth?: string;
  address?: string;
  expiryDate?: string;
  error?: string;
}

/** TRUSTDOCK API のレスポンス形状（部分型） */
interface TrustdockVerifyResponse {
  status: 'approved' | 'declined' | 'pending' | 'error';
  confidence_score: number;
  document: {
    type: string;
    name?: string;
    date_of_birth?: string;
    address?: string;
    expiry_date?: string;
  };
  error_message?: string;
}

interface TrustdockSessionResponse {
  session_url: string;
  session_id: string;
}

const TRUSTDOCK_BASE_URL = 'https://api.trustdock.io/v1';

function mapDocumentType(raw: string): EkycResult['documentType'] {
  const map: Record<string, EkycResult['documentType']> = {
    drivers_license: 'drivers_license',
    driving_license: 'drivers_license',
    my_number: 'my_number',
    my_number_card: 'my_number',
    passport: 'passport',
    residence_card: 'residence_card',
    residence: 'residence_card',
  };
  return map[raw.toLowerCase()] ?? 'drivers_license';
}

/**
 * 書類画像と自撮り画像を使って本人確認を実行する。
 *
 * 実プロバイダー呼び出し（TRUSTDOCK_API_KEY 設定時）またはモック結果を返す。
 */
export async function verifyDocumentWithEkyc(
  documentImageBase64: string,
  selfieImageBase64: string,
  documentType: EkycResult['documentType']
): Promise<EkycResult> {
  const apiKey = process.env.TRUSTDOCK_API_KEY;
  const customerId = process.env.TRUSTDOCK_CUSTOMER_ID;

  // ── モードモード（API キー未設定） ──────────────────────────────────────
  if (!apiKey || !customerId) {
    // 開発用スタブ: 常に成功を返す
    await new Promise((resolve) => setTimeout(resolve, 500)); // レイテンシ模倣
    return {
      verified: true,
      confidence: 0.95,
      documentType,
      name: 'テスト 太郎',
      dateOfBirth: '1990-01-01',
      address: '東京都渋谷区テスト町1-2-3',
      expiryDate: '2030-12-31',
    };
  }

  // ── 実 TRUSTDOCK API 呼び出し ─────────────────────────────────────────
  try {
    const response = await fetch(`${TRUSTDOCK_BASE_URL}/verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Customer-Id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_image: documentImageBase64,
        selfie_image: selfieImageBase64,
        document_type: documentType,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return {
        verified: false,
        confidence: 0,
        documentType,
        error: `TRUSTDOCK API エラー (${response.status}): ${text}`,
      };
    }

    const data: TrustdockVerifyResponse = await response.json();

    return {
      verified: data.status === 'approved',
      confidence: data.confidence_score ?? 0,
      documentType: mapDocumentType(data.document?.type ?? documentType),
      name: data.document?.name,
      dateOfBirth: data.document?.date_of_birth,
      address: data.document?.address,
      expiryDate: data.document?.expiry_date,
      error: data.status === 'error' ? (data.error_message ?? '不明なエラー') : undefined,
    };
  } catch (err) {
    return {
      verified: false,
      confidence: 0,
      documentType,
      error: err instanceof Error ? err.message : '通信エラー',
    };
  }
}

/**
 * TRUSTDOCK のホスト型認証セッション URL を取得する。
 * 未設定時はモックデモページ URL を返す。
 *
 * @param userId  - アプリ内のユーザー ID（TRUSTDOCK の external_id として送信）
 * @param redirectUrl - 認証完了後にリダイレクトするアプリ URL
 * @returns 認証ページ URL
 */
export async function getEkycSessionUrl(
  userId: string,
  redirectUrl: string
): Promise<string> {
  const apiKey = process.env.TRUSTDOCK_API_KEY;
  const customerId = process.env.TRUSTDOCK_CUSTOMER_ID;

  // ── モードモード（API キー未設定） ──────────────────────────────────────
  if (!apiKey || !customerId) {
    const params = new URLSearchParams({
      demo: '1',
      user_id: userId,
      redirect_url: redirectUrl,
    });
    return `/kyc/demo?${params.toString()}`;
  }

  // ── 実 TRUSTDOCK セッション作成 ──────────────────────────────────────
  const response = await fetch(`${TRUSTDOCK_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-Customer-Id': customerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: userId,
      redirect_url: redirectUrl,
      // TRUSTDOCK の許可する書類種別をすべて有効にする
      document_types: ['drivers_license', 'my_number', 'passport', 'residence_card'],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`TRUSTDOCK セッション作成失敗 (${response.status}): ${text}`);
  }

  const data: TrustdockSessionResponse = await response.json();
  return data.session_url;
}
