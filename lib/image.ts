// クライアント側の画像リサイズ／再エンコード。
// canvas で描き直すことで EXIF（位置情報含む）を除去し、長辺を上限に縮小して
// JPEG で再エンコードする。アップロード前に呼び出す。依存ライブラリなし。

const MAX_DIM = 1600;     // 長辺の上限(px)
const QUALITY = 0.82;     // JPEG 品質

export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  const maxDim = opts.maxDim ?? MAX_DIM;
  const quality = opts.quality ?? QUALITY;

  try {
    // EXIF の向きを反映しつつデコード
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    // 元より大きくなった場合は元を使う
    if (blob.size >= file.size && scale === 1) return file;

    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    // 失敗時は元ファイルをそのまま使う
    return file;
  }
}
