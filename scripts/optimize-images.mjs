import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PUB = process.argv[2]; // public dir
if (!PUB) { console.error('usage: node optimize-images.mjs <publicDir>'); process.exit(1); }

// ルール: [globベース, 最大幅, 品質]
const rules = [
  { files: ['hero-photo.jpg','hero-transport.jpg','hero-escrow.jpg','hero-franchise.jpg','hero-seminar.jpg','hero-buyback.jpg'], w: 1600, q: 74 },
  { dir: 'genre', w: 1200, q: 72 },
  { dir: 'area',  w: 1000, q: 70 },
  { dir: 'cars',  w: 760,  q: 72 },
];

async function optimize(file, maxW, q) {
  try {
    const before = (await stat(file)).size;
    const img = sharp(file, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    let pipe = img;
    if (meta.width && meta.width > maxW) pipe = pipe.resize({ width: maxW, withoutEnlargement: true });
    const buf = await pipe.jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (buf.length < before) { await writeFile(file, buf); return [before, buf.length, true]; }
    return [before, before, false];
  } catch (e) { console.error('skip', file, e.message); return [0,0,false]; }
}

async function run() {
  let tb = 0, ta = 0, n = 0;
  // OG: 1200x630 cover
  try {
    const og = path.join(PUB, 'og-image.jpg');
    const before = (await stat(og)).size;
    const buf = await sharp(og).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    if (buf.length < before) { await writeFile(og, buf); tb += before; ta += buf.length; n++; console.log(`og-image.jpg ${(before/1024|0)}K -> ${(buf.length/1024|0)}K`); }
  } catch (e) { console.error('og skip', e.message); }

  for (const r of rules) {
    const files = [];
    if (r.files) for (const f of r.files) files.push(path.join(PUB, f));
    if (r.dir) { try { for (const f of await readdir(path.join(PUB, r.dir))) if (/\.jpe?g$/i.test(f)) files.push(path.join(PUB, r.dir, f)); } catch {} }
    for (const f of files) {
      const [b, a, changed] = await optimize(f, r.w, r.q);
      if (changed) { tb += b; ta += a; n++; }
    }
  }
  console.log(`\n${n} files optimized: ${(tb/1024/1024).toFixed(1)}MB -> ${(ta/1024/1024).toFixed(1)}MB (saved ${((1-ta/tb)*100|0)}%)`);
}
run();
