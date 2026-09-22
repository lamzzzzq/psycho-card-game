// 把 /print/cards 每張牌輸出成單獨 JPG（印廠格式）。
// 規格：成品 63×88mm，每邊出血 1.5mm → 檔案 66×91mm = 780×1075px @300dpi。
// 頁面本身帶 3mm 出血，這裏以 600dpi 只截中間 66×91mm（每邊留 1.5mm），再縮成 300dpi。
// 用法：npm run dev 後 node print-assets/tools/export_jpg.mjs [輸出目錄]
import { chromium } from '../../remotion-video/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.argv[2] ?? 'print-assets/jpg_300dpi';
const SCALE = 600 / 96; // CSS px → 600dpi
const TMP = path.join(OUT, '_png');
for (const d of ['正面', '卡背', '_png']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: SCALE, viewport: { width: 1200, height: 900 } });

// ⚠️ 不能用 element.screenshot()：卡片座標帶小數（如 x=60.438），Chrome 取整後截圖
// 會多出幾 px 且起點偏移，裁出血後左右不對稱（0922 實測左 51 / 右 55 px）。
// 改成把目標卡固定到 (-1.5mm,-1.5mm)，成品＋1.5mm 出血的區域正好從視窗原點開始，直接 clip。
const MM = 96 / 25.4;
async function shoot(url, selector, nameOf) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: `.trim,.hint{display:none!important} html,body{margin:0;padding:0;overflow:hidden}
    .solo-only{position:fixed!important;left:-1.5mm!important;top:-1.5mm!important;margin:0!important;z-index:9999}` });
  const els = await page.$$(selector);
  const out = [];
  for (let i = 0; i < els.length; i++) {
    const name = await nameOf(els[i], i);
    await page.evaluate(([sel, k]) => {
      document.querySelectorAll(sel).forEach((e, j) => {
        e.classList.toggle('solo-only', j === k);
        e.style.visibility = j === k ? 'visible' : 'hidden';
      });
    }, [selector, i]);
    const f = path.join(TMP, name + '.png');
    await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 66 * MM, height: 91 * MM } });
    out.push([f, name]);
  }
  return out;
}

const fronts = await shoot('/print/cards', '[data-file]', (el) => el.getAttribute('data-file'));
const total = fronts.reduce((n, [, name]) => n + Number(name.match(/_(\d+)張$/)[1]), 0); // 檔名張數加總＝整副張數
const backs = await shoot('/print/cards?side=back', '.solo > div', () => `卡背_${total}張`);
await browser.close();

// 縮 300dpi + 轉 JPG（PIL）
const jobs = [...fronts.map(([f, n]) => [f, path.join(OUT, '正面', n + '.jpg')]),
              ...backs.map(([f, n]) => [f, path.join(OUT, '卡背', n + '.jpg')])];
fs.writeFileSync(path.join(TMP, 'jobs.json'), JSON.stringify(jobs));
execFileSync('python3', ['-c', `
import json, sys
from PIL import Image
for src, dst in json.load(open(sys.argv[1])):
    im = Image.open(src).convert('RGB')   # 已是 66x91mm 區域 @600dpi
    im = im.resize((780, 1075), Image.LANCZOS)
    im.save(dst, quality=95, dpi=(300, 300), subsampling=0)
print('done', len(json.load(open(sys.argv[1]))))
`, path.join(TMP, 'jobs.json')], { stdio: 'inherit' });
fs.rmSync(TMP, { recursive: true });
console.log(`正面 ${fronts.length} 款共 ${total} 張、卡背 ${backs.length} 款 → ${OUT}`);
