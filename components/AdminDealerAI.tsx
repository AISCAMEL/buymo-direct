'use client';

import { useRef, useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, Send, Sparkles, RotateCcw } from 'lucide-react';

type Settings = { enabled: boolean; tone: string; extraKnowledge: string };
type Msg = { role: 'user' | 'assistant'; content: string };

const DEFAULT_TONE =
  'やさしく、かんたんな日本語で。専門用語は避けるか、使うときは一言で説明する。手順は「どの画面（パス）で何をするか」を具体的に。1回の回答は要点を絞り、長くなりすぎない。わからない・本部確認が必要なことは正直に伝え、/community から本部へ相談するよう案内する。';

export function AdminDealerAI({ initial, aiOn }: { initial: Settings; aiOn: boolean }) {
  const [s, setS] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // その場テスト
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/dealer-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', settings: s }),
      });
      const data = await res.json();
      if (data.ok) setSavedAt(Date.now());
      else setErr(data.error ?? '保存に失敗しました');
    } catch {
      setErr('通信に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function test(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setQ('');
    const history = msgs;
    setMsgs((m) => [...m, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/dealer-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 下書き（未保存）の設定でテスト
        body: JSON.stringify({ action: 'test', settings: s, question, history }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply ?? data.error ?? '応答なし' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: '通信に失敗しました。' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 設定 */}
      <div className="card space-y-4 p-5">
        <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-bold text-navy-800">加盟店ヘルプAIを有効にする</span>
          <button
            type="button"
            onClick={() => setS((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative h-6 w-11 rounded-full transition ${s.enabled ? 'bg-accent-600' : 'bg-slate-300'}`}
            aria-pressed={s.enabled}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${s.enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-navy-800">話し方・回答方針</label>
            <button
              type="button"
              onClick={() => setS((p) => ({ ...p, tone: DEFAULT_TONE }))}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              <RotateCcw className="h-3 w-3" /> 既定に戻す
            </button>
          </div>
          <textarea
            value={s.tone}
            onChange={(e) => setS((p) => ({ ...p, tone: e.target.value }))}
            rows={4}
            className="input mt-1 w-full text-sm"
            placeholder="例：やさしい敬語で、専門用語は避けて…"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-navy-800">追加ナレッジ・最新ルール・FAQ</label>
          <p className="mt-0.5 text-xs text-slate-500">
            ここに書いた内容が最優先で回答に反映されます（一般ガイドより優先）。手数料率・締め日・連絡先・最近の変更点・よくある質問などを自由に追記してください。コードの変更・再デプロイは不要です。
          </p>
          <textarea
            value={s.extraKnowledge}
            onChange={(e) => setS((p) => ({ ...p, extraKnowledge: e.target.value }))}
            rows={12}
            className="input mt-1 w-full font-mono text-[13px] leading-relaxed"
            placeholder={'例）\n・手数料は成約額の◯%です。締め日は毎月末、翌月◯日に締め請求を発行します。\n・緊急の連絡先：本部サポート 03-xxxx-xxxx（平日9-18時）。\n・Q. 見積はいつ送る？ A. 案件画面で内容を確認後、合意前に送ってください。'}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{s.extraKnowledge.length} / 20000</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="btn-accent inline-flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存して反映
          </button>
          {savedAt && !saving && (
            <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> 保存しました（加盟店に即反映）
            </span>
          )}
          {err && <span className="text-sm font-bold text-red-600">{err}</span>}
        </div>
      </div>

      {/* その場テスト */}
      <div className="card flex h-[640px] flex-col overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-200 p-3">
          <Sparkles className="h-5 w-5 text-accent-600" />
          <div className="leading-tight">
            <p className="text-sm font-black text-navy-800">加盟店になりきってテスト</p>
            <p className="text-[11px] text-slate-400">上の下書き設定で回答します（保存前でも試せます）</p>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {msgs.length === 0 && (
            <div className="rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              加盟店からの質問を入力して、回答を確認できます。{!aiOn && '（※AI未設定のため現在はテスト不可）'}
              <div className="mt-3 flex flex-wrap gap-2">
                {['見積書はどこで作る？', '手数料はどうなってる？', 'スタッフを増やしたい', '審査が進まない'].map((x) => (
                  <button
                    key={x}
                    onClick={() => test(x)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:border-accent-400 hover:text-accent-700"
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            test(q);
          }}
          className="flex items-center gap-2 border-t border-slate-200 p-3"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="加盟店の質問を入力してテスト…"
            className="input h-10 flex-1 text-sm"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !q.trim()} className="btn-accent h-10 px-4 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
