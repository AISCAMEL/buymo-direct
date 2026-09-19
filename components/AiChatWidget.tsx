'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { QUICK_REPLIES } from '@/lib/faq';

type Message = { role: 'user' | 'assistant'; content: string };

const GREETING =
  'こんにちは！BUYMO サポートです🚗\n買取・ダイレクト販売・エスクロー・手数料など、お気軽にご質問ください。';

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? '申し訳ありません。回答できませんでした。' },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '申し訳ありません。エラーが発生しました。お問い合わせフォームからご連絡ください。' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const showQuickReplies = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end sm:bottom-6">
      {open && (
        <div className="mb-3 flex h-[520px] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-navy-600 to-navy-500 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Sparkles className="h-4 w-4 text-white" /></span>
              <div>
                <p className="text-sm font-bold leading-none text-white">BUYMO サポート</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />オンライン・すぐに回答</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="チャットを閉じる">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'bg-navy-600 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
              </div>
            )}

            {/* クイック返信 */}
            {showQuickReplies && !loading && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-slate-400">よくある質問</p>
                {QUICK_REPLIES.map((q) => (
                  <button key={q} onClick={() => void send(q)} className="block w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-left text-xs font-bold text-navy-700 transition hover:border-navy-400 hover:bg-navy-50">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* お問い合わせ導線 */}
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-white px-3 py-1.5 text-[11px] font-bold">
            <Link href="/listings/valuation" onClick={() => setOpen(false)} className="text-gold-600 hover:underline">無料査定</Link>
            <span className="text-slate-300">|</span>
            <Link href="/contact" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">お問い合わせ</Link>
            <span className="text-slate-300">|</span>
            <Link href="/sell" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">出品する</Link>
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-slate-100 bg-white p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="メッセージを入力..."
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy-400"
            />
            <button onClick={() => void send()} disabled={!input.trim() || loading} className="rounded-xl bg-navy-600 p-2 text-white hover:bg-navy-700 disabled:opacity-40" aria-label="送信">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)} className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-600 text-white shadow-lg transition hover:bg-navy-700" aria-label="サポートチャットを開く">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
