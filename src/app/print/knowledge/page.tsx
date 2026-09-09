import type { Metadata } from 'next';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';

// 印刷版知識牌卡面（20 張，純文字、無插畫）。
//
// 為什麼是一個頁面而不是一支生圖腳本：卡面文字必須是**向量**的，350dpi 點陣圖在
// 10pt 這種字級下邊緣會糊。這頁用瀏覽器列印成 PDF，文字自動保持向量，
// 而且字體（Noto Sans HK）與電子版完全一致，不必另外嵌字。
//
// 尺寸：成品 63 × 88 mm ＋ 每邊 3 mm 出血 = 69 × 94 mm，一張一頁。
// 規格真相源：/card-lab?deck=print 的 §13。匯出步驟見 print-assets/README.md。
//
// ⚠️ 卡背用與人格牌**完全相同**的那一版（print-assets/card-back_*）。知識牌若有自己的
// 卡背，對手看牌架背面就能數出你手上有幾張廢牌 —— 那是牌面資訊外洩。

// 印前工具頁，不該進搜尋引擎
export const metadata: Metadata = { robots: { index: false, follow: false } };

const GOLD = '#9A7448';
const GOLD_LINE = 'rgba(154,116,72,0.55)';
const GOLD_FAINT = 'rgba(154,116,72,0.32)';

// 版面（mm）——與 §13 的參數表一致
const BLEED = 3;
const TRIM_W = 63;
const TRIM_H = 88;
const SAFE = 4; // 文字距成品邊

/** 術語標題字級：長術語降一級，避免撐破兩行的標題區。實測最長的是
 *  "Erikson's Psychosocial Stages of Development"（44 字元）。 */
function termPt(term: string, isEn: boolean) {
  if (isEn) return term.length > 30 ? 11.5 : 13;
  return term.length > 10 ? 12 : 13.5;
}

/** 定義正文字級：按長度分三檔，最長的英文定義（74 字元）仍在容量內。 */
function defPt(def: string, isEn: boolean) {
  if (!isEn) return 10.5;
  return def.length > 70 ? 9.5 : def.length > 55 ? 10 : 10.5;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const isEn = lang === 'en';

  const css = `
    @page { size: ${TRIM_W + BLEED * 2}mm ${TRIM_H + BLEED * 2}mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #6b6b6b; }
    /* 沒有這兩行，Chrome 列印會把底色與金線整個丟掉 */
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .sheet {
      width: ${TRIM_W + BLEED * 2}mm;
      height: ${TRIM_H + BLEED * 2}mm;
      position: relative;
      overflow: hidden;
      background: linear-gradient(180deg, #EADFC8 0%, #E1D1B2 60%, #D5BE95 100%);
      break-after: page;
      box-sizing: border-box;
    }
    .sheet:last-child { break-after: auto; }

    /* 金色外框畫在成品邊內 3mm 處 */
    .frame {
      position: absolute;
      inset: ${BLEED + 3}mm;
      border: 0.5mm solid ${GOLD_LINE};
      border-radius: 3mm;
    }
    .frame-inner {
      position: absolute;
      inset: ${BLEED + 4.2}mm;
      border: 0.2mm solid ${GOLD_FAINT};
      border-radius: 2.4mm;
    }
    .star { position: absolute; color: ${GOLD}; opacity: 0.7; font-size: 9pt; }
    .star-l { left: ${BLEED + 6}mm; top: ${BLEED + 5}mm; }
    .star-r { right: ${BLEED + 6}mm; top: ${BLEED + 5}mm; }

    /* 安全區：所有文字都在這裏面 */
    .body {
      position: absolute;
      left: ${BLEED + SAFE}mm;
      right: ${BLEED + SAFE}mm;
      top: ${BLEED + SAFE + 6}mm;
      bottom: ${BLEED + SAFE + 4}mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 3.5mm;
    }
    .term {
      font-family: var(--font-sans-cn), "PingFang HK", "Noto Sans TC", system-ui, sans-serif;
      font-weight: 600;
      color: #3D3226;
      line-height: 1.32;
      margin: 0;
      text-wrap: balance;
    }
    .rule { display: flex; align-items: center; gap: 1.6mm; width: 70%; }
    .rule i { flex: 1; height: 0.18mm; background: ${GOLD_FAINT}; }
    .rule span { color: ${GOLD}; font-size: 8pt; }
    .def {
      font-family: var(--font-sans-cn), "PingFang HK", "Noto Sans TC", system-ui, sans-serif;
      color: #5C5142;
      line-height: 1.45;
      margin: 0;
      text-wrap: pretty;
    }
    .no {
      position: absolute;
      right: ${BLEED + 6}mm;
      bottom: ${BLEED + 5}mm;
      font-family: var(--font-sans-cn), system-ui, sans-serif;
      font-size: 6.5pt;
      color: rgba(154,116,72,0.75);
      letter-spacing: 0.02em;
    }

    /* 螢幕上排成網格預覽；列印時每張一頁 */
    @media screen {
      body { padding: 24px; }
      .grid { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
      .sheet { box-shadow: 0 6px 18px rgba(0,0,0,0.35); }
      .trim {
        position: absolute; inset: ${BLEED}mm;
        outline: 0.2mm dashed rgba(220,60,60,0.55); pointer-events: none;
      }
      .safe {
        position: absolute; inset: ${BLEED + SAFE}mm;
        outline: 0.2mm dashed rgba(60,110,220,0.45); pointer-events: none;
      }
      .hint {
        color: #eee; font-family: system-ui, sans-serif; font-size: 13px;
        max-width: 720px; margin: 0 auto 18px; line-height: 1.7;
      }
      .hint code { background: rgba(255,255,255,0.14); padding: 1px 5px; border-radius: 4px; }
    }
    @media print { .trim, .safe, .hint { display: none !important; } .grid { display: block; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="hint">
        知識牌 {KNOWLEDGE_CARDS.length} 張 · {isEn ? '英文版' : '繁中版'}（
        <a href={isEn ? '/print/knowledge' : '/print/knowledge?lang=en'} style={{ color: '#ffd79a' }}>
          切換到{isEn ? '繁中' : '英文'}
        </a>
        ）。成品 {TRIM_W}×{TRIM_H}mm ＋每邊 {BLEED}mm 出血，一張一頁。
        紅虛線＝裁切線、藍虛線＝安全邊，兩者只在螢幕上顯示。
        匯出：<code>⌘P → 目的地「儲存為 PDF」→ 邊界「無」→ 勾選「背景圖形」</code>。
      </p>
      <div className="grid">
        {KNOWLEDGE_CARDS.map((c, i) => {
          const term = isEn ? c.term : c.termZh;
          const def = isEn ? c.definition : c.definitionZh;
          return (
            <div className="sheet" key={c.term}>
              <div className="frame" />
              <div className="frame-inner" />
              <span className="star star-l">✦</span>
              <span className="star star-r">✦</span>
              <div className="body">
                <p className="term" style={{ fontSize: `${termPt(term, isEn)}pt` }}>
                  {term}
                </p>
                <div className="rule">
                  <i />
                  <span>◆</span>
                  <i />
                </div>
                <p className="def" style={{ fontSize: `${defPt(def, isEn)}pt` }}>
                  {def}
                </p>
              </div>
              <span className="no">K{String(i + 1).padStart(2, '0')}</span>
              <div className="trim" />
              <div className="safe" />
            </div>
          );
        })}
      </div>
    </>
  );
}
