'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { QUICK_REPLIES, DEALER_QUICK_REPLIES, type Audience } from '@/lib/faq';

type Message = { role: 'user' | 'assistant'; content: string };

/** パスからデフォルトの対象（会員/加盟店）を判定。 */
function pathAudience(path: string): Audience {
  const p = path || '/';
  if (p.startsWith('/dealer') || p.startsWith('/hq') || p.startsWith('/admin')) return 'dealer';
  return 'member';
}

const DEALER_CTX = {
  label: '加盟店サポート',
  greeting:
    '加盟店（車のプロ）向けサポートです🔧\n申込・案件の受け方・費用/報酬・出品・スタッフ招待・必要書類など、お気軽にご相談ください。',
  quick: DEALER_QUICK_REPLIES,
};

/** 現在のページからAIの文脈（ラベル・あいさつ・質問例）を決める。 */
function pageContext(path: string): { label: string; greeting: string; quick: string[] } {
  const p = path || '/';
  if (p.startsWith('/sell') || p.includes('appraisal') || p.includes('valuation'))
    return { label: '車を売る・査定ページ', greeting: '車の売却・査定についてサポートします🚗\n「査定の流れ」「写真のコツ」などお気軽にどうぞ。',
      quick: ['車検証はどこを撮ればいい？', '査定方法の違いは？（オンライン/出張/店舗）', '修復歴ってなに？', 'だいたいいくらで売れる？'] };
  if (p.startsWith('/loan'))
    return { label: 'ローンページ', greeting: 'ローン（仮審査）についてサポートします。',
      quick: ['審査の流れは？', '必要なものは？', '月々いくらになる？', '頭金は必要？'] };
  if (p.startsWith('/dealer') || p.startsWith('/dealers'))
    return { label: '加盟店・車のプロページ', greeting: '加盟店（車のプロ）についてサポートします。',
      quick: ['加盟店になるには？', '案件はどう受ける？', '費用・報酬は？', '自分の店舗ページは作れる？'] };
  if (p.startsWith('/escrow') || p.startsWith('/transfer') || p.startsWith('/transport'))
    return { label: 'サービス（エスクロー/名義変更/陸送）ページ', greeting: 'エスクロー・名義変更・陸送についてサポートします。',
      quick: ['エスクローって安全？', '名義変更の費用は？', '陸送はいくら？', '手続きの流れは？'] };
  if (p.startsWith('/listings') || p === '/genre' || p === '/area')
    return { label: '車を買うページ', greeting: '車探し・購入についてサポートします🚗',
      quick: ['総額の内訳を教えて', '保証は付く？', 'ローンの月々は？', '名義変更や陸送は？'] };
  return { label: 'トップ/一般', greeting: 'こんにちは！BUYMO サポートです🚗\n買取・販売・エスクロー・手数料など、お気軽にご質問ください。',
    quick: QUICK_REPLIES };
}

export function AiChatWidget() {
  const pathname = usePathname() || '/';
  const pageCtx = useMemo(() => pageContext(pathname), [pathname]);
  const [audience, setAudience] = useState<Audience>(() => pathAudience(pathname));
  // 会員＝ページ文脈、加盟店＝加盟店サポート文脈
  const ctx = audience === 'dealer' ? DEALER_CTX : pageCtx;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: ctx.greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // 日本語入力（IME）変換中かどうか。変換確定のEnterで誤送信しないために使う。
  const composingRef = useRef(false);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // パスが変わったら既定の対象も追従（まだ会話していないときのみ）
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        setAudience(pathAudience(pathname));
      }
      return prev;
    });
  }, [pathname]);

  // まだ会話していなければ、文脈に合わせてあいさつ・質問例を更新
  useEffect(() => {
    setMessages((prev) => (prev.length === 1 && prev[0].role === 'assistant' ? [{ role: 'assistant', content: ctx.greeting }] : prev));
  }, [ctx.greeting]);

  // 対象（会員/加盟店）を切り替え。会話前なら挨拶も切り替える。
  function switchAudience(next: Audience) {
    if (next === audience) return;
    setAudience(next);
  }

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
        body: JSON.stringify({ message: msg, history, context: ctx.label, audience }),
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
    // IME変換中（日本語の変換確定）のEnterでは送信しない。
    // 変換が未確定のうちは文章を打ち続けられ、確定後のEnterのみ送信される。
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !composingRef.current &&
      !e.nativeEvent.isComposing &&
      (e.nativeEvent as unknown as { keyCode?: number }).keyCode !== 229
    ) {
      e.preventDefault();
      void send();
    }
  }

  const showQuickReplies = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end sm:bottom-6">
      {open && (
        <div className="mb-3 flex h-[min(70dvh,520px)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-600 to-navy-500 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Sparkles className="h-4 w-4 text-white" /></span>
                <div>
                  <p className="text-sm font-bold leading-none text-white">BUYMO サポート</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />{audience === 'dealer' ? '加盟店モード' : '会員モード'}・すぐに回答</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="チャットを閉じる">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* 対象の切り替え（会員 / 加盟店） */}
            <div className="mt-2.5 flex gap-1 rounded-lg bg-white/10 p-0.5">
              <button
                onClick={() => switchAudience('member')}
                className={`flex-1 rounded-md py-1 text-[11px] font-bold transition ${audience === 'member' ? 'bg-white text-navy-700' : 'text-white/80 hover:text-white'}`}
              >
                会員の方
              </button>
              <button
                onClick={() => switchAudience('dealer')}
                className={`flex-1 rounded-md py-1 text-[11px] font-bold transition ${audience === 'dealer' ? 'bg-white text-navy-700' : 'text-white/80 hover:text-white'}`}
              >
                加盟店の方
              </button>
            </div>
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
                <p className="text-[11px] font-bold text-slate-400">{audience === 'dealer' ? 'よくある相談（加盟店）' : 'このページのよくある質問'}</p>
                {ctx.quick.map((q) => (
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
            {audience === 'dealer' ? (
              <>
                <Link href="/dealer/dashboard" onClick={() => setOpen(false)} className="text-gold-600 hover:underline">ダッシュボード</Link>
                <span className="text-slate-300">|</span>
                <Link href="/dealer" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">加盟店申込</Link>
                <span className="text-slate-300">|</span>
                <Link href="/contact" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">お問い合わせ</Link>
              </>
            ) : (
              <>
                <Link href="/listings/valuation" onClick={() => setOpen(false)} className="text-gold-600 hover:underline">無料査定</Link>
                <span className="text-slate-300">|</span>
                <Link href="/contact" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">お問い合わせ</Link>
                <span className="text-slate-300">|</span>
                <Link href="/sell" onClick={() => setOpen(false)} className="text-accent-600 hover:underline">出品する</Link>
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 border-t border-slate-100 bg-white p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              rows={1}
              placeholder="メッセージを入力（Shift+Enterで改行）..."
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
