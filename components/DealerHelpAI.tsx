'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircleQuestion, X, Send, Loader2, Sparkles } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

// パス → わかりやすい画面名（AIに「今どの画面か」を伝える＆見出し表示用）
const PAGE_LABELS: [string, string][] = [
  ['/dealer/dashboard', 'ダッシュボード'],
  ['/dealer/cases', '案件'],
  ['/dealer/quotes', '見積書'],
  ['/dealer/invoices', '請求書'],
  ['/dealer/billing', '手数料・請求'],
  ['/dealer/auctions', 'オークション'],
  ['/dealer/listings', '在庫管理'],
  ['/dealer/works', '作業事例'],
  ['/dealer/skills', 'スキル・サービス'],
  ['/dealer/staff', 'スタッフ管理'],
  ['/dealer/analytics', 'アナリティクス'],
  ['/dealer/api-keys', 'API・Webhook'],
  ['/dealer/settings', '店舗設定'],
  ['/dealer/register', '店舗登録'],
  ['/dealer', '加盟店ポータル'],
];

function labelFor(path: string): string {
  for (const [p, label] of PAGE_LABELS) if (path === p || path.startsWith(p + '/')) return label;
  return '加盟店ポータル';
}

// 画面ごとのおすすめ質問
function suggestionsFor(label: string): string[] {
  const common = ['この画面でできることは？', '最初に何をすればいい？'];
  const map: Record<string, string[]> = {
    案件: ['案件が来たらどう進める？', '見積書はどこで作る？'],
    見積書: ['見積書の作り方を教えて', '送った見積はどこで確認できる？'],
    請求書: ['請求書はいつ発行する？', '入金はどこで確認する？'],
    'スキル・サービス': ['対応サービスを増やすには？', 'スキル登録のコツは？'],
    在庫管理: ['車を出品する手順は？', 'オークションに出すには？'],
    'スタッフ管理': ['スタッフを招待するには？', '権限の違いは？'],
    '手数料・請求': ['手数料の確認はどこ？', '締め請求って何？'],
    店舗設定: ['振込先を変えるには？', '営業時間はどこで設定する？'],
  };
  return [...(map[label] ?? []), ...common].slice(0, 4);
}

export function DealerHelpAI({ dealerName, role }: { dealerName?: string; role?: string }) {
  const pathname = usePathname() || '/dealer';
  const pageLabel = labelFor(pathname);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy, open]);

  // 「やることナビ」等からの呼び出しでパネルを開き、質問を自動送信する。
  useEffect(() => {
    function onHelp(e: Event) {
      setOpen(true);
      const seed = (e as CustomEvent).detail?.seed as string | undefined;
      if (seed) setInput(seed);
    }
    window.addEventListener('buymo:dealer-help', onHelp as EventListener);
    return () => window.removeEventListener('buymo:dealer-help', onHelp as EventListener);
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const res = await fetch('/api/dealer/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history, pageLabel, pagePath: pathname }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [...m, { role: 'assistant', content: data.reply ?? data.error ?? '応答がありませんでした。' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '通信に失敗しました。もう一度お試しください。' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* フローティングボタン */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="ヘルプAIに質問する"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-accent-600 px-4 py-3 font-bold text-white shadow-lg shadow-accent-600/30 transition hover:-translate-y-0.5 hover:bg-accent-700"
        >
          <MessageCircleQuestion className="h-5 w-5" />
          <span className="hidden text-sm sm:inline">わからないことをAIに質問</span>
          <span className="text-sm sm:hidden">AIに質問</span>
        </button>
      )}

      {/* チャットパネル */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center sm:inset-auto sm:bottom-5 sm:right-5">
          <div className="flex h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:h-[70vh] sm:max-h-[560px] sm:w-[400px] sm:rounded-2xl">
            {/* ヘッダー */}
            <div className="flex items-center gap-2 bg-navy-700 px-4 py-3 text-white">
              <Sparkles className="h-5 w-5 text-accent-400" />
              <div className="leading-tight">
                <p className="text-sm font-black">加盟店ヘルプAI</p>
                <p className="text-[11px] text-navy-200">今：{pageLabel} の画面</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="閉じる" className="ml-auto rounded-lg p-1.5 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 会話 */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <p className="flex items-center gap-1.5 font-bold text-navy-700">
                    <Sparkles className="h-4 w-4 text-accent-600" /> こんにちは{dealerName ? `、${dealerName} さん` : ''}！
                  </p>
                  <p className="mt-1">
                    BUYMO加盟店ポータルの使い方や業務の進め方を、なんでも日本語で質問してください。
                    今は「{pageLabel}」の画面を見ているので、この画面のこともそのまま聞けます。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestionsFor(pageLabel).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:border-accent-400 hover:text-accent-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === 'user' ? 'bg-navy-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-slate-500 ring-1 ring-slate-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* 入力 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="質問を入力…（例：見積書はどこで作る？）"
                className="input h-10 flex-1 text-sm"
                disabled={busy}
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-accent h-10 px-4 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
