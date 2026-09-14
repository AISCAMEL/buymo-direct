'use client';

import { useState } from 'react';
import { Upload, Camera, CheckCircle2, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { submitKyc } from '@/app/dashboard/kyc/actions';

export function KycVerificationForm({
  userId,
  currentStatus,
  existingNote,
}: {
  userId: string;
  currentStatus: string;
  existingNote?: string | null;
}) {
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function pickId(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFrontFile(file);
    setIdPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  function pickSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idFrontFile) {
      setError('身分証の写真を選択してください');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const ts = Date.now();

      const idPath = `${userId}/${ts}-id_front`;
      const { error: idErr } = await supabase.storage
        .from('kyc-documents')
        .upload(idPath, idFrontFile, { upsert: true, contentType: idFrontFile.type });
      if (idErr) throw new Error(`身分証のアップロードに失敗しました: ${idErr.message}`);

      let selfiePath: string | null = null;
      if (selfieFile) {
        selfiePath = `${userId}/${ts}-selfie`;
        const { error: selfieErr } = await supabase.storage
          .from('kyc-documents')
          .upload(selfiePath, selfieFile, { upsert: true, contentType: selfieFile.type });
        if (selfieErr) throw new Error(`自撮り写真のアップロードに失敗しました: ${selfieErr.message}`);
      }

      const result = await submitKyc(idPath, selfiePath);
      if (result.error) throw new Error(result.error);

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (done || currentStatus === 'pending') {
    return (
      <div className="card p-8 text-center">
        <div className="mb-3 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </span>
        </div>
        <p className="text-lg font-bold text-amber-700">審査中です</p>
        <p className="mt-1 text-sm text-slate-500">
          書類を受理しました。1〜3営業日以内に審査結果をお知らせします。
        </p>
      </div>
    );
  }

  if (currentStatus === 'verified') {
    return (
      <div className="card p-8 text-center">
        <div className="mb-3 flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <p className="text-lg font-bold text-emerald-700">本人確認が完了しています</p>
        <p className="mt-1 text-sm text-slate-500">
          プロフィールと出品に認証バッジが表示されます。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {currentStatus === 'rejected' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">書類が受理されませんでした</p>
          {existingNote && (
            <p className="mt-1 text-sm text-red-600">理由：{existingNote}</p>
          )}
          <p className="mt-1 text-xs text-red-500">正しい書類を再提出してください。</p>
        </div>
      )}

      {/* 身分証 */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-navy-500" />
          <p className="font-bold">身分証の写真（必須）</p>
        </div>
        <p className="text-xs text-slate-500">
          運転免許証・マイナンバーカード・パスポート等の表面。文字がはっきり読めるよう撮影してください。
        </p>
        {idPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={idPreview} alt="身分証プレビュー" className="h-48 w-full rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => { setIdFrontFile(null); setIdPreview(null); }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
            <Upload className="h-8 w-8" />
            <span className="mt-2 text-sm">タップして画像を選択</span>
            <input type="file" accept="image/*" className="hidden" onChange={pickId} />
          </label>
        )}
      </div>

      {/* 自撮り */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-navy-500" />
          <p className="font-bold">自撮り写真（推奨）</p>
        </div>
        <p className="text-xs text-slate-500">
          身分証を手に持って自撮りした写真を追加すると、審査がスムーズです。
        </p>
        {selfiePreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfiePreview} alt="自撮りプレビュー" className="h-48 w-full rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:bg-slate-50">
            <Camera className="h-8 w-8" />
            <span className="mt-2 text-sm">タップして画像を選択</span>
            <input type="file" accept="image/*" className="hidden" onChange={pickSelfie} />
          </label>
        )}
      </div>

      <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-bold text-slate-600">個人情報の取り扱いについて</p>
        <p className="mt-1">
          提出いただいた書類は本人確認の目的のみに使用します。審査完了後、書類は安全に管理されます。
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !idFrontFile}
        className="btn-accent w-full disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? '送信中…' : '確認書類を提出する'}
      </button>
    </form>
  );
}
