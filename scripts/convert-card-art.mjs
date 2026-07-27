// 卡牌插画转换：
//   HEXACO ：card-art-src/hexaco/{id}.png → public/cards/hexaco/{id}.webp
//   Big Five：card-art-src/{id}.png       → public/cards/{id}.webp
// 两套牌分别输出，题号相同也绝不互相覆盖。
//
// ⚠️ 默认只转 HEXACO。Big Five 的 50 张已定稿（奇数=女主角 / 偶数=男主角 交叉配比，
//    见 card-art-src/README.md），2026-07 曾因为顺带重转而被整批换成男主角、配比全毁，
//    所以要动它必须显式指定 deck —— 别让「跑一下 HEXACO」把 Big Five 一起带走。
//
// 用法：
//   node scripts/convert-card-art.mjs                    只转 HEXACO（默认）
//   node scripts/convert-card-art.mjs --deck=big-five    只转 Big Five
//   node scripts/convert-card-art.mjs --all              两套都转
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DECKS = {
  hexaco: { name: 'HEXACO', source: 'card-art-src/hexaco', output: 'public/cards/hexaco', publicPath: 'cards/hexaco' },
  'big-five': { name: 'Big Five', source: 'card-art-src', output: 'public/cards', publicPath: 'cards' },
};

const args = process.argv.slice(2);
const deckArg = args.find((a) => a.startsWith('--deck='))?.split('=')[1];
const selected = args.includes('--all')
  ? Object.keys(DECKS)
  : deckArg
    ? [deckArg]
    : ['hexaco'];

const unknown = selected.filter((d) => !DECKS[d]);
if (unknown.length) {
  console.error(`未知 deck：${unknown.join(', ')}。可选：${Object.keys(DECKS).join(' / ')}，或 --all`);
  process.exit(1);
}
if (!args.length) console.log('（默认只转 HEXACO。要转 Big Five 请加 --deck=big-five，两套都转加 --all）\n');

let totalOk = 0;
let totalFiles = 0;
for (const key of selected) {
  const deck = DECKS[key];
  const src = resolve(root, deck.source);
  const outDir = resolve(root, deck.output);
  const files = (await readdir(src)).filter((f) => /^\d+\.png$/i.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
  if (files.length === 0) {
    console.log(`${deck.name}：${deck.source} 里没有 {id}.png`);
    continue;
  }

  await mkdir(outDir, { recursive: true });
  let ok = 0;
  for (const f of files) {
    const id = parseInt(f);
    try {
      await sharp(resolve(src, f)).resize(1024, 1024, { fit: 'cover' }).webp({ quality: 82 }).toFile(resolve(outDir, `${id}.webp`));
      ok++;
      process.stdout.write(`✓ ${f} → ${deck.publicPath}/${id}.webp\n`);
    } catch (e) {
      process.stdout.write(`✗ ${deck.name}/${f}: ${e.message}\n`);
    }
  }
  totalOk += ok;
  totalFiles += files.length;
  console.log(`${deck.name}：${ok}/${files.length} 张完成`);
}
console.log(`\n完成 ${totalOk}/${totalFiles} 张`);
