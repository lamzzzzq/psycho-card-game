'use client';

import type { ReactNode } from 'react';
import { Dimension, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import type { Locale } from '@/lib/i18n';

// 回合信息 + 5 維歸檔進度卡。單機與 PVP 共用同一份（老闆：兩邊永遠保持一致），
// PC 與移動端也是同一套排版，只有字號跟着格子寬度縮放。
//
// 一格 = 一個維度：上面是牌上那種實色維度角標，下面是「需要幾張牌」的卡位。
// 卡位只有兩態（空/滿）——引擎只公開「該維度是否已歸檔」，不公開手上湊了幾張，
// 所以這裏不能畫「2/3」那種進度，否則等於幫玩家數牌（規則要求玩家自己算）。
//
// 字號：每格自己是 container，直接用 cqw 跟着格子寬度動態變化。
//   標題橫幅【左右內距為 0】——老闆要求字從格子最左邊就開始，把整個寬度用盡。
//   可用寬度 = 100cqw。「CONSCIENTIOUSNESS」在 Noto Sans 粗體下 17 個大寫字符
//   ≈ 11.7–12.5em（各字寬 0.34~0.80em），取 7.8cqw ≈ 91~98cqw，貼着邊但不溢出。
//   上限 20px（格子 ~256px 封頂）。
//   ⚠️ 刻意【不設下限】（老闆要求「一行不折、多小都行」）：手機一格 ~70px 時約 5.5px。
//      安全網是 overflow-wrap:anywhere —— 萬一某個設備的字體比估算寬，
//      它會折成兩行而不是溢出。真機看到折行就把 7.8 往下調。
//   zh 名字都是 3 個字 ≈ 3.0em，寬鬆得多 → min(30cqw, 20px)。
//
// ⚠️ 溢出防線是 overflow-wrap: anywhere，不是 break-word：
//    break-word 允許折行但【不縮小 min-content 寬度】，所以 shrink-to-fit 的角標
//    會被撐到整個單詞那麼寬、直接頂出格子（桌面上就是這麼溢出的）。
//    anywhere 才會把 min-content 算成「可以斷在任何位置」，盒子才肯縮。
const NAME_FONT_EN = 'min(7.8cqw, 20px)';
const NAME_FONT_ZH = 'min(30cqw, 20px)';

interface FilingProgressCardProps {
  locale?: Locale;
  /** 第一行左端：「第 X/n 輪」。 */
  roundText: string;
  /** 第一行輪次右邊的內容（單機=棄牌提示／已完成；PVP=輪到誰＋已完成）。 */
  info?: ReactNode;
  targets: Partial<Record<Dimension, number>>;
  /** 已歸檔的維度。 */
  declaredDims: Set<Dimension>;
  /** 點任一格 → 展開歸檔詳情。 */
  onOpenArchive: () => void;
}

export function FilingProgressCard({
  locale = 'zh',
  roundText,
  info,
  targets,
  declaredDims,
  onOpenArchive,
}: FilingProgressCardProps) {
  const en = locale === 'en';

  return (
    <div className="psy-panel psy-etched flex shrink-0 flex-col gap-1.5 rounded-[1.2rem] p-1.5 sm:gap-2 sm:p-2">
      {/* 第一行：輪次 + 右側信息 */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(154,116,72,0.2)] bg-[var(--psy-card-content)] px-3 py-1.5 text-xs text-[var(--psy-ink-soft)] sm:text-sm">
        <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{roundText}</span>
        {info}
      </div>

      {/* 第二行：5 維 —— 角標 + 卡位 */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5" aria-label={en ? 'Filing progress' : '歸檔進度'}>
        {DIMENSIONS.map((dimension) => {
          const meta = DIMENSION_META[dimension];
          const color = meta.colorHex;
          const name = en ? meta.nameEn : meta.name;
          const target = targets[dimension] ?? 0;
          const isDone = declaredDims.has(dimension);

          return (
            <button
              key={dimension}
              type="button"
              onClick={onOpenArchive}
              // containerType 讓下面的 cqw 按「這一格的寬度」解析。
              style={{
                containerType: 'inline-size',
                background: isDone ? `${color}1f` : '#f5ecdd',
                borderColor: isDone ? `${color}99` : 'rgba(154,116,72,0.26)',
                boxShadow: isDone ? `inset 0 0 0 1px ${color}40` : undefined,
              }}
              className="flex min-w-0 flex-col items-stretch overflow-hidden rounded-lg border text-center transition active:scale-95"
              aria-label={`${name}${en ? `: needs ${target} cards, ${isDone ? 'filed' : 'not filed'}` : `：需要 ${target} 張，${isDone ? '已歸檔' : '未歸檔'}`}`}
            >
              {/* 維度標題：實色橫幅吃滿整格寬（老闆要求：不要圓角膠囊，字能用到 full width）。
                  格子開了 overflow-hidden，橫幅上緣兩角就跟着格子的圓角走。 */}
              <span
                lang={en ? 'en' : undefined}
                className="psy-sans block w-full font-bold uppercase leading-tight"
                style={{
                  fontSize: en ? NAME_FONT_EN : NAME_FONT_ZH,
                  letterSpacing: '0',
                  padding: 'min(2.2cqw, 6px) 0',
                  background: color,
                  color: '#2a1c06',
                  borderBottom: '1px solid rgba(154,116,72,0.35)',
                  hyphens: 'auto',
                  overflowWrap: 'anywhere',
                }}
              >
                {name}
              </span>

              {/* 卡位：要幾張就幾格，居中。空 = 淡色描邊；滿 = 實色（該維度已歸檔）。 */}
              <span
                className="flex flex-wrap items-center justify-center"
                // 卡位區高度比原來厚一點（老闆要求），卡位本身也放大一档。
                style={{ gap: 'min(2cqw, 4px)', padding: 'min(4cqw, 10px) 2px' }}
              >
                {Array.from({ length: target }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 'min(10cqw, 15px)',
                      aspectRatio: '3 / 4',
                      borderRadius: 'min(2cqw, 2.5px)',
                      background: isDone ? color : `${color}14`,
                      border: `1px solid ${isDone ? 'rgba(154,116,72,0.5)' : `${color}8c`}`,
                      boxShadow: isDone ? 'inset 0 1px 0 rgba(255,255,255,0.45)' : undefined,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
