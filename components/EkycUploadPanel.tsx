'use client';

import { useState, useRef } from 'react';
import {
  ShieldCheck,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
} from 'lucide-react';

type DocumentType = 'drivers_license' | 'my_number' | 'passport' | 'residence_card';
type Mode = 'select' | 'hosted' | 'manual';
type Step = 'doc' | 'selfie' | 'reviewing' | 'done';

interface UploadResult {
  verified: boolean;
  error?: string;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  drivers_license: '運転免許証',
  my_number: 'マイナンバーカード',
  passport: 'パスポート',
  residence_card: '在留カード',
};

const STEPS: { key: Step; label: string }[] = [
  { key: 'doc', label: '①書類撮影' },
  { key: 'selfie', label: '②自撮り' },
  { key: 'reviewing', label: '③審査中' },
  { key: 'done', label: '④完了' },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-navy-600 text-white'
                    : 'bg-slate-200 text-slate-400',
                ].join(' ')}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={[
                  'text-[10px] whitespace-nowrap',
                  isActive ? 'font-bold text-navy-700' : 'text-slate-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'mx-1 mb-4 h-0.5 flex-1 transition-colors',
                  isDone ? 'bg-emerald-400' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ImagePickerProps {
  preview: string | null;
  onPick: (file: File, preview: string) => void;
  onClear: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}

function ImagePicker({ preview, onPick, onClear, icon, label, hint }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onPick(file, url);
    e.target.value = '';
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <span className="text-navy-500">{icon}</span>
        <p className="font-bold">{label}</p>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={label}
            className="h-48 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="削除"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50"
          onClick={() => inputRef.current?.click()}
        >
          <span className="h-8 w-8">{icon}</span>
          <span className="mt-2 text-sm">タップして画像を選択</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleChange}
          />
        </label>
      )}
    </div>
  );
}

export function EkycUploadPanel({
  initialResult,
}: {
  initialResult?: 'success' | 'failed' | null;
}) {
  const [mode, setMode] = useState<Mode>('select');
  const [docType, setDocType] = useState<DocumentType>('drivers_license');
  const [step, setStep] = useState<Step>('doc');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(
    initialResult === 'success'
      ? { verified: true }
      : initialResult === 'failed'
      ? { verified: false, error: '認証に失敗しました。再度お試しください。' }
      : null
  );

  // ── ホスト型: TRUSTDOCK へリダイレクト ────────────────────────────────
  async function handleHostedStart() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/kyc/ekyc-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `エラー (${res.status})`);
      }
      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'セッション開始に失敗しました');
      setSubmitting(false);
    }
  }

  // ── 手動アップロード: 書類 → 自撮り → 送信 ───────────────────────────
  function handleDocPick(file: File, preview: string) {
    setDocFile(file);
    setDocPreview(preview);
  }

  function handleSelfiePick(file: File, preview: string) {
    setSelfieFile(file);
    setSelfiePreview(preview);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) {
      setError('書類表面の画像を選択してください');
      return;
    }
    setError(null);
    setSubmitting(true);
    setStep('reviewing');

    try {
      // Base64 に変換
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const docBase64 = await toBase64(docFile);
      const selfieBase64 = selfieFile ? await toBase64(selfieFile) : '';

      const res = await fetch('/api/kyc/ekyc-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_image: docBase64,
          selfie_image: selfieBase64,
          document_type: docType,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `エラー (${res.status})`);
      }

      const data = await res.json() as { verified: boolean; error?: string };
      setStep('done');
      setResult({ verified: data.verified, error: data.error });
    } catch (err) {
      setStep('doc');
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  // ── 完了画面 ──────────────────────────────────────────────────────────
  if (result !== null) {
    return (
      <div className="card p-8 text-center">
        {result.verified ? (
          <>
            <div className="mb-3 flex justify-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700">確認済み</p>
            <p className="mt-1 text-sm text-slate-500">
              本人確認が完了しました。プロフィールに認証バッジが表示されます。
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 flex justify-center">
              <XCircle className="h-14 w-14 text-red-500" />
            </div>
            <p className="text-lg font-bold text-red-700">再提出が必要</p>
            {result.error && (
              <p className="mt-1 text-sm text-red-600">{result.error}</p>
            )}
            <button
              type="button"
              className="btn mt-4"
              onClick={() => {
                setResult(null);
                setStep('doc');
                setError(null);
                setDocFile(null);
                setDocPreview(null);
                setSelfieFile(null);
                setSelfiePreview(null);
              }}
            >
              再試行する
            </button>
          </>
        )}
      </div>
    );
  }

  // ── モード選択 ────────────────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-slate-700">認証方法を選択してください</p>

        {/* ホスト型（推奨） */}
        <button
          type="button"
          onClick={() => setMode('hosted')}
          className="card flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-100">
            <ShieldCheck className="h-6 w-6 text-navy-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold">かんたんeKYC認証 <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">推奨</span></p>
            <p className="mt-0.5 text-xs text-slate-500">
              TRUSTDOCKの認証ページで完結。スマートフォンで撮影するだけ。
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>

        {/* 手動アップロード */}
        <button
          type="button"
          onClick={() => setMode('manual')}
          className="card flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50 active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Upload className="h-6 w-6 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold">書類を手動アップロード</p>
            <p className="mt-0.5 text-xs text-slate-500">
              書類表面と自撮り写真を個別にアップロードします。
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </div>
    );
  }

  // ── ホスト型モード ────────────────────────────────────────────────────
  if (mode === 'hosted') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setMode('select')}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← 戻る
        </button>
        <div className="card space-y-4 p-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-100">
              <ShieldCheck className="h-8 w-8 text-navy-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold">かんたんeKYC認証</p>
            <p className="mt-1 text-sm text-slate-500">
              TRUSTDOCKの安全な認証ページに移動します。
              スマートフォンのカメラで書類を撮影するだけで完了します。
            </p>
          </div>
          <ul className="text-left text-xs text-slate-500 space-y-1">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 運転免許証・マイナンバーカード・パスポートに対応</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 書類はTRUSTDOCKが安全に処理</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 完了後は自動的にこのページへ戻ります</li>
          </ul>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            onClick={handleHostedStart}
            disabled={submitting}
            className="btn-accent w-full disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> 移動中…</>
            ) : (
              'かんたんeKYC認証を開始する'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── 手動アップロードモード ────────────────────────────────────────────
  return (
    <form onSubmit={handleManualSubmit} className="space-y-5">
      <button
        type="button"
        onClick={() => setMode('select')}
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        ← 戻る
      </button>

      {/* ステップ表示 */}
      <StepIndicator current={step} />

      {step === 'reviewing' && (
        <div className="card p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-navy-500" />
          <p className="mt-3 font-bold text-slate-700">書類を審査中です…</p>
          <p className="mt-1 text-sm text-slate-500">しばらくお待ちください</p>
        </div>
      )}

      {step !== 'reviewing' && (
        <>
          {/* 書類種別 */}
          <div className="card p-5 space-y-3">
            <p className="font-bold">書類の種類</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
                <label
                  key={type}
                  className={[
                    'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition',
                    docType === type
                      ? 'border-navy-500 bg-navy-50 font-bold text-navy-700'
                      : 'border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="docType"
                    value={type}
                    checked={docType === type}
                    onChange={() => setDocType(type)}
                    className="accent-navy-600"
                  />
                  {DOCUMENT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </div>

          {/* 書類表面 */}
          <ImagePicker
            preview={docPreview}
            onPick={(file, preview) => {
              handleDocPick(file, preview);
              setStep('selfie');
            }}
            onClear={() => { setDocFile(null); setDocPreview(null); setStep('doc'); }}
            icon={<Upload className="h-5 w-5" />}
            label="書類表面（必須）"
            hint="運転免許証・マイナンバーカード・パスポートなどの表面を撮影してください。文字がはっきり読めるようにしてください。"
          />

          {/* 自撮り */}
          <ImagePicker
            preview={selfiePreview}
            onPick={handleSelfiePick}
            onClear={() => { setSelfieFile(null); setSelfiePreview(null); }}
            icon={<Camera className="h-5 w-5" />}
            label="自撮り（推奨）"
            hint="書類を手に持って自撮りした写真を追加すると、本人確認がよりスムーズに進みます。"
          />

          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-bold text-slate-600">個人情報の取り扱いについて</p>
            <p className="mt-1">
              提出いただいた書類は本人確認の目的のみに使用します。審査完了後、書類は安全に管理されます。
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !docFile}
            className="btn-accent w-full disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> 送信中…</>
            ) : (
              '確認書類を提出する'
            )}
          </button>
        </>
      )}
    </form>
  );
}
