import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { getDealerAiSettings } from '@/lib/dealer-ai-settings';
import { AdminDealerAI } from '@/components/AdminDealerAI';
import { Bot, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDealerAiPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();
  const settings = await getDealerAiSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Bot className="h-6 w-6 text-accent-600" /> 加盟店ヘルプAI（ブラッシュアップ）
        </h1>
        <p className="text-sm text-slate-500">
          加盟店ポータルの全ページ右下に常設される「わからないことをAIに質問」の回答品質を、本部がここで調整します。
          追加ナレッジや話し方を保存すると、加盟店側に即反映されます（再デプロイ不要）。
        </p>
      </div>

      {!aiOn && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">AIが未設定です</p>
            <p className="mt-0.5">
              Vercel の環境変数に <span className="font-mono font-bold">ANTHROPIC_API_KEY</span>（Claude APIキー）を設定すると有効になります。
              設定・追加ナレッジは今のうちに保存できますが、回答・テストは有効化後に動作します。
            </p>
          </div>
        </div>
      )}

      <AdminDealerAI initial={settings} aiOn={aiOn} />
    </div>
  );
}
