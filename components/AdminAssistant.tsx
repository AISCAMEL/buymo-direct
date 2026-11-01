'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Loader2, Sparkles, BookOpen, Activity } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };
type Mode = 'howto' | 'monitor';

const SUGGESTIONS: Record<Mode, string[]> = {
  howto: [
    '銀行振込の入金確認はどこでやる？',
    '保全口座（振込先）を変更する手順は？',
    '通報が来たときの対応の流れは？',
    '加盟店への締め請求のやり方は？',
  ],
  monitor: [
    '今の運営状況を要約して、優先度つきで注意点を教えて',
    '滞留している取引や審査はある？',
    '係争中・未対応の通報はどうなってる？',
  ],
};

export function AdminAssistant() {
  const [mode, setMode] = useState<Mode>('howto');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history, mode }),
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
    <div className="card flex h-[70vh] flex-col overflow-hidden p-0">
      {/* モード切替 */}
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <button
          onClick={() => setMode('howto')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${mode === 'howto' ? 'bg-navy-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <BookOpen className="h-4 w-4" /> 使い方アシスト
        </button>
        <button
          onClick={() => setMode('monitor')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${mode === 'monitor' ? 'bg-navy-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Activity className="h-4 w-4" /> 監視サマリー
        </button>
        <span className="ml-auto text-[11px] text-slate-400">
          {mode === 'howto' ? '機能の使い方・手順を案内します' : '現況（件数）をもとに注意点を指摘します'}
        </span>
      </div>

      {/* 会話 */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="flex items-center gap-1.5 font-bold text-navy-700">
              <Sparkles className="h-4 w-4" /> 運営サポートAI
            </p>
            <p className="mt-1">
              {mode === 'howto'
                ? '管理画面の使い方や操作手順を質問できます。下の例から選ぶか、自由に入力してください。'
                : '「今の運営状況を要約して」と聞くと、滞留や要対応を優先度つきで整理します。'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS[mode].map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:border-navy-400 hover:text-navy-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-navy-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
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
        className="flex items-center gap-2 border-t border-slate-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'howto' ? '使い方を質問…（例：入金確認はどこ？）' : '監視について質問…（例：滞留している取引は？）'}
          className="input h-10 flex-1 text-sm"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-accent h-10 px-4 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
