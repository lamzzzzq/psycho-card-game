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
//   en 最長「CONSCIENTIOUSNESS」17 個大寫字符 ≈ 11.6em 寬 → 要 7.4cqw 才不溢出；
//   但手機一格只有 ~69px，7.4cqw ≈ 5px 沒人看得見 → 給 8px 下限，
//   窄到放不下就讓它按音節折成兩行（lang="en" + hyphens:auto），不硬切詞。
//   zh 名字都是 3 個字 ≈ 3.2em → 可以開到 22cqw，桌面 13px 封頂。
const NAME_FONT_EN = 'clamp(8px, 7.4cqw, 13px)';
const NAME_FONT_ZH = 'min(22cqw, 14px)';

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
              className="flex min-w-0 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 text-center transition active:scale-95 sm:py-2"
              aria-label={`${name}${en ? `: needs ${target} cards, ${isDone ? 'filed' : 'not filed'}` : `：需要 ${target} 張，${isDone ? '已歸檔' : '未歸檔'}`}`}
            >
              {/* 維度角標：與牌面上的角標同款（實色底 + 深色字 + 大寫） */}
              <span
                lang={en ? 'en' : undefined}
                className="psy-sans inline-flex max-w-full items-center justify-center rounded-full font-bold uppercase leading-tight"
                style={{
                  fontSize: en ? NAME_FONT_EN : NAME_FONT_ZH,
                  letterSpacing: en ? '0.03em' : '0.02em',
                  padding: 'min(1.4cqw, 3px) min(4cqw, 9px)',
                  background: color,
                  color: '#2a1c06',
                  border: '1px solid rgba(154,116,72,0.45)',
                  hyphens: 'auto',
                  overflowWrap: 'break-word',
                }}
              >
                {name}
              </span>

              {/* 卡位：要幾張就幾格，居中。空 = 淡色描邊；滿 = 實色（該維度已歸檔）。 */}
              <span
                className="flex flex-wrap items-center justify-center"
                style={{ gap: 'min(1.8cqw, 3px)' }}
              >
                {Array.from({ length: target }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 'min(9cqw, 13px)',
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
