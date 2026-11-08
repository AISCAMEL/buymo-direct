'use client';

import { useState } from 'react';
import { Loader2, Image as ImageIcon, Wand2, Save, RotateCcw, Pin } from 'lucide-react';

type Props = { initialStyle: string; initialRef: string; defaultStyle: string; aiOn: boolean };

export function AdminImageStyle({ initialStyle, initialRef, defaultStyle, aiOn }: Props) {
  const [style, setStyle] = useState(initialStyle);
  const [refUrl, setRefUrl] = useState(initialRef);
  const [subject, setSubject] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'preview' | 'save' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function doPreview() {
    setBusy('preview');
    setMsg(null);
    setPreview(null);
    try {
      const res = await fetch('/api/admin/image-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, style, ref: refUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setPreview(data.url);
        setMsg({ kind: 'ok', text: `生成しました（モデル: ${data.model ?? '-'}）` });
      } else {
        setMsg({ kind: 'err', text: `生成できませんでした：${data.error ?? '不明'}` });
      }
    } catch {
      setMsg({ kind: 'err', text: '通信に失敗しました' });
    } finally {
      setBusy(null);
    }
  }

  async function doSave() {
    setBusy('save');
    setMsg(null);
    try {
      const res = await fetch('/api/admin/image-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, ref: refUrl }),
      });
      const data = await res.json();
      if (data.ok) setMsg({ kind: 'ok', text: '保存しました。以降の自動生成に反映されます。' });
      else setMsg({ kind: 'err', text: `保存に失敗：${data.error ?? '不明'}` });
    } catch {
      setMsg({ kind: 'err', text: '通信に失敗しました' });
    } finally {
      setBusy(null);
    }
  }

  function useAsReference() {
    if (preview) {
      setRefUrl(preview);
      setMsg({ kind: 'ok', text: 'この画像を基準に設定しました。「保存」で確定してください。' });
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-bold">
          <ImageIcon className="h-5 w-5 text-accent-600" /> 画像生成スタイル（詳細設定）
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          画像の雰囲気を指示文で細かく調整できます。「プレビュー生成」で試し、気に入ったら「保存」。さらに気に入った画像を
          <b>基準画像</b>にすると、以降は同じ雰囲気に寄せて生成します（お手本参照方式）。
        </p>
      </div>

      {!aiOn && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          OPENROUTER_API_KEY / ANTHROPIC_API_KEY が未設定だと生成できません。
        </p>
      )}

      {/* スタイル指示文 */}
      <div>
        <label className="text-sm font-bold">スタイル指示文（英語推奨）</label>
        <textarea
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          rows={7}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 font-mono text-xs leading-relaxed focus:border-accent-500 focus:outline-none"
          placeholder="画像の雰囲気・画風・構図などの指示（英語）"
        />
        <button
          onClick={() => setStyle(defaultStyle)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:underline"
        >
          <RotateCcw className="h-3 w-3" /> 既定（写真風・正方形）に戻す
        </button>
      </div>

      {/* 基準画像 */}
      <div>
        <label className="text-sm font-bold">基準画像URL（任意・スタイル参照）</label>
        <input
          value={refUrl}
          onChange={(e) => setRefUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs focus:border-accent-500 focus:outline-none"
          placeholder="空欄＝参照なし。下でプレビューを作り「基準に設定」でここに入ります。"
        />
      </div>

      {/* プレビュー被写体 */}
      <div>
        <label className="text-sm font-bold">プレビュー用の被写体（任意）</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-accent-500 focus:outline-none"
          placeholder="例：書類とペンと車のカギが置かれた机（空欄なら車のサンプル）"
        />
      </div>

      {/* 操作ボタン */}
      <div className="flex flex-wrap gap-2">
        <button onClick={doPreview} disabled={busy !== null || !aiOn} className="btn-accent disabled:opacity-50">
          {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} プレビュー生成
        </button>
        <button
          onClick={doSave}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 保存（確定）
        </button>
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {/* プレビュー表示 */}
      {preview && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="プレビュー" className="mx-auto block aspect-square w-full max-w-sm object-cover" />
          </div>
          <button
            onClick={useAsReference}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3.5 py-2 text-sm font-bold text-white hover:bg-navy-700"
          >
            <Pin className="h-4 w-4" /> この画像を基準に設定
          </button>
          <p className="text-xs text-slate-400">※ これはプレビューです（記事・SNS投稿はされません）。</p>
        </div>
      )}
    </div>
  );
}
