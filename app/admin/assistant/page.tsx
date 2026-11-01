import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { AdminAssistant } from '@/components/AdminAssistant';
import { Sparkles, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAssistantPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Sparkles className="h-6 w-6 text-accent-600" /> AI運用アシスタント
        </h1>
        <p className="text-sm text-slate-500">
          管理機能の使い方の案内と、運営状況の監視サマリーをAIがサポートします（Claude API）。
        </p>
      </div>

      {!aiOn && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">AIが未設定です</p>
            <p className="mt-0.5">
              Vercel の環境変数に <span className="font-mono font-bold">ANTHROPIC_API_KEY</span>（Claude APIキー）を設定すると有効になります。
              設定後は再デプロイで反映されます。未設定でも画面は開けますが、回答は行えません。
            </p>
          </div>
        </div>
      )}

      <AdminAssistant />

      <p className="text-xs text-slate-400">
        ※ 監視サマリーは取引・通報・審査などの「件数」をもとに要約します。個人情報はAIに渡していません。
      </p>
    </div>
  );
}
