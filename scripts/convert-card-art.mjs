// 卡牌插画转换：card-art-src/{id}.png → public/cards/{id}.webp（1024×1024, webp）。
// 用法：node scripts/convert-card-art.mjs
// 反复跑：只转 card-art-src 里现有的 {id}.png，已有的会覆盖更新。
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'card-art-src');
const OUT = resolve(root, 'public/cards');

const files = (await readdir(SRC)).filter((f) => /^\d+\.png$/i.test(f));
if (files.length === 0) { console.log('card-art-src 里没有 {id}.png'); process.exit(0); }
await mkdir(OUT, { recursive: true });

files.sort((a, b) => parseInt(a) - parseInt(b));
let ok = 0;
for (const f of files) {
  const id = parseInt(f);
  const out = resolve(OUT, `${id}.webp`);
  try {
    await sharp(resolve(SRC, f)).resize(1024, 1024, { fit: 'cover' }).webp({ quality: 82 }).toFile(out);
    ok++;
    process.stdout.write(`✓ ${f} → cards/${id}.webp\n`);
  } catch (e) {
    process.stdout.write(`✗ ${f}: ${e.message}\n`);
  }
}
console.log(`\n完成 ${ok}/${files.length} 张 → public/cards/`);
