/**
 * AI電話の運用設定（管理画面から編集・即反映）。保存先は app_settings('voice_settings')。
 * 受付ON/OFF・挨拶文（第一声）・AIへの追加指示・営業時間の案内 を担当者がノーコードで変更できる。
 */
import { getAppSetting, setAppSetting } from '@/lib/settings';

export type VoiceSettings = {
  /** AI受付を有効にするか（falseなら「準備中」案内に切替） */
  enabled: boolean;
  /** 第一声の挨拶文 */
  greeting: string;
  /** オペレーターAIへの追加指示（話し方・強調点・NGなど） */
  instructions: string;
  /** 営業時間の案内文（任意・聞かれたら使う） */
  hours: string;
  /** 会社・サービスの豆知識（料金・流れ・よくある質問など。AIが正確に答えるための事実） */
  knowledge: string;
};

export const DEFAULT_GREETING =
  'お電話ありがとうございます。中古車のバイモダイレクト、AI音声案内です。査定・買取、故障や修理、ご購入のご相談など、折り返しのご予約も承ります。ご用件をお話しください。';

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  greeting: DEFAULT_GREETING,
  instructions: '',
  hours: '',
  knowledge: '',
};

const KEY = 'voice_settings';

/** 現在の設定を取得（未設定・失敗時は既定値）。 */
export async function getVoiceSettings(): Promise<VoiceSettings> {
  try {
    const raw = await getAppSetting(KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    const j = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      enabled: j.enabled !== false,
      greeting: typeof j.greeting === 'string' && j.greeting.trim() ? j.greeting : DEFAULT_GREETING,
      instructions: typeof j.instructions === 'string' ? j.instructions : '',
      hours: typeof j.hours === 'string' ? j.hours : '',
      knowledge: typeof j.knowledge === 'string' ? j.knowledge : '',
    };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

/** 設定を保存。 */
export async function setVoiceSettings(s: Partial<VoiceSettings>): Promise<{ ok: boolean; error?: string }> {
  const payload: VoiceSettings = {
    enabled: s.enabled !== false,
    greeting: (typeof s.greeting === 'string' && s.greeting.trim() ? s.greeting : DEFAULT_GREETING).slice(0, 600),
    instructions: (typeof s.instructions === 'string' ? s.instructions : '').slice(0, 2000),
    hours: (typeof s.hours === 'string' ? s.hours : '').slice(0, 300),
    knowledge: (typeof s.knowledge === 'string' ? s.knowledge : '').slice(0, 3000),
  };
  return setAppSetting(KEY, JSON.stringify(payload));
}
