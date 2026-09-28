'use client';

import { useState, useRef } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/dealer/upload', { method: 'POST', body: fd });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'アップロードに失敗しました');
  return data.url;
}

/** 単一画像アップロード。hidden input(name) にURLを格納。 */
export function SingleImageUploader({ name, label, initial = '', rounded = false, aspect = 'aspect-[3/1]' }:
  { name: string; label: string; initial?: string; rounded?: boolean; aspect?: string }) {
  const [url, setUrl] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true); setError(null);
    try { setUrl(await uploadFile(f)); } catch (err) { setError(err instanceof Error ? err.message : '失敗しました'); }
    finally { setLoading(false); if (ref.current) ref.current.value = ''; }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <input type="hidden" name={name} value={url} />
      <div className={`relative overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 ${rounded ? 'h-24 w-24 rounded-full' : `${aspect} w-full rounded-xl`}`}>
        {url ? (
          <>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setUrl('')} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X className="h-3.5 w-3.5" /></button>
          </>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:text-navy-500">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[11px] font-bold">{loading ? 'アップロード中' : '画像を選ぶ'}</span>
          </button>
        )}
      </div>
      {url && <button type="button" onClick={() => ref.current?.click()} className="mt-1 text-xs font-bold text-navy-600 hover:underline">画像を変更</button>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** 複数画像（ギャラリー）。hidden input(name) にJSON配列を格納。 */
export function GalleryUploader({ name, label, initial = [], max = 6 }:
  { name: string; label: string; initial?: string[]; max?: number }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setLoading(true); setError(null);
    try {
      const room = Math.max(0, max - urls.length);
      const picked = files.slice(0, room);
      const uploaded = await Promise.all(picked.map(uploadFile));
      setUrls((prev) => [...prev, ...uploaded]);
    } catch (err) { setError(err instanceof Error ? err.message : '失敗しました'); }
    finally { setLoading(false); if (ref.current) ref.current.value = ''; }
  }

  return (
    <div>
      <label className="label">{label}<span className="ml-1 text-xs font-normal text-slate-400">（最大{max}枚）</span></label>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((u, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setUrls((p) => p.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {urls.length < max && (
          <button type="button" onClick={() => ref.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:text-navy-500">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px] font-bold">{loading ? '追加中' : '追加'}</span>
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
