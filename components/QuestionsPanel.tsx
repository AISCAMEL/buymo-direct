'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircleQuestion, Loader2, CornerDownRight } from 'lucide-react';
import { askQuestion, answerQuestion } from '@/app/parts/actions';

export interface QAItem {
  id: string;
  asker: string;          // マスク済み表示名
  body: string;
  answer: string | null;
  created_at: string;
}

export function QuestionsPanel({
  auctionId,
  items,
  isOwner,
  loggedIn,
}: {
  auctionId: string;
  items: QAItem[];
  isOwner: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  async function submitQuestion() {
    setError(null);
    if (body.trim().length === 0) { setError('質問内容を入力してください。'); return; }
    setSending(true);
    const fd = new FormData();
    fd.set('auction_id', auctionId);
    fd.set('body', body.trim());
    const res = await askQuestion(fd);
    setSending(false);
    if (res && !res.ok) { setError(res.error ?? '送信に失敗しました'); return; }
    setBody('');
    router.refresh();
  }

  async function submitAnswer(questionId: string) {
    setError(null);
    if (answerText.trim().length === 0) return;
    setSending(true);
    const fd = new FormData();
    fd.set('question_id', questionId);
    fd.set('auction_id', auctionId);
    fd.set('answer', answerText.trim());
    const res = await answerQuestion(fd);
    setSending(false);
    if (res && !res.ok) { setError(res.error ?? '保存に失敗しました'); return; }
    setAnswerFor(null);
    setAnswerText('');
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-bold text-navy-800">
        <MessageCircleQuestion className="h-5 w-5 text-navy-500" /> 商品Q&A
      </h2>

      {/* 質問フォーム（出品者以外） */}
      {!isOwner && (
        <div className="mb-4 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={loggedIn ? '出品者への質問を入力（例：発送方法は選べますか？）' : 'ログインすると質問できます'}
            className="input"
            disabled={sending}
          />
          <div className="flex justify-end">
            <button onClick={submitQuestion} disabled={sending} className="btn-accent px-4 disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : '質問する'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      {/* 一覧 */}
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">まだ質問はありません。</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className="rounded-lg border border-slate-100 p-3">
              <p className="text-sm text-slate-700"><span className="font-bold text-navy-600">Q. </span>{q.body}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{q.asker}</p>
              {q.answer ? (
                <p className="mt-2 flex gap-1 text-sm text-slate-600">
                  <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span><span className="font-bold text-emerald-600">A. </span>{q.answer}</span>
                </p>
              ) : isOwner ? (
                answerFor === q.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="回答を入力"
                      className="input"
                      disabled={sending}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setAnswerFor(null); setAnswerText(''); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">キャンセル</button>
                      <button onClick={() => submitAnswer(q.id)} disabled={sending} className="btn-accent px-3 py-1.5 text-xs disabled:opacity-50">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : '回答する'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAnswerFor(q.id); setAnswerText(''); }} className="mt-2 text-xs font-bold text-accent-600 hover:underline">回答する</button>
                )
              ) : (
                <p className="mt-1 text-xs text-slate-400">回答待ち</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
