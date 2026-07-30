'use client';

import type { ReactNode } from 'react';
import { Dimension, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import type { Locale } from '@/lib/i18n';

// 回合信息 + 5 維歸檔進度卡。單機與 PVP 共用同一份（老闆：兩邊永遠保持一致），
// PC 與移動端也是同一套排版，只有字號跟着格子寬度縮放。
//
// 一格 = 一個維度，分三個區域（老闆定的版式）：
//   ① 字母 O/C/E/A/N —— 字號最大
//   ② 維度單詞 —— 保證在小屏手機上也讀得清；格子窄到放不下全稱就換縮寫（Conscient.）
//   ③ 卡位 —— 「這維度要幾張牌」，要 3 張擺 3 格
// ①② 在實色帶上（帶吃滿整格寬），③ 在淺色底。
//
// 卡位只有兩態（空/滿）——引擎只公開「該維度是否已歸檔」，不公開手上湊了幾張，
// 所以這裏不能畫「2/3」那種進度，否則等於幫玩家數牌（規則要求玩家自己算）。
//
// 字號：每格自己是 container，用 cqw 跟着格子寬度動態變化。
//   ① 字母只有 1 個字符 → 可以放得很大：min(30cqw, 22px)。
//   ② 單詞改成首字母大寫（比全大寫窄約 30%）+ 下限 10px，手機上也讀得清；
//      放不下全稱時由容器查詢換成縮寫（見 globals.css 的 [data-dim-word-*]）。
//   ⚠️ 溢出防線是 overflow-wrap: anywhere，不是 break-word —— 後者允許折行但
//      【不縮小 min-content 寬度】，shrink-to-fit 的盒子會被撐到整個單詞那麼寬、
//      直接頂出格子。anywhere 才會讓盒子肯縮。
const LETTER_FONT = 'min(30cqw, 22px)';
const WORD_FONT_EN = 'clamp(10px, 12cqw, 14px)';
const WORD_FONT_ZH = 'clamp(11px, 20cqw, 15px)';

// 窄格子用的英文縮寫（Openness 本來就短，不縮）。閾值在 globals.css：
// 格子 ≤ 140px 時顯示縮寫 —— 全稱 Conscientiousness 在 14px 下要 ~127px，
// 加上留白得 ~135px 才放得下。
const WORD_ABBR_EN: Record<Dimension, string> = {
  O: 'Openness',
  C: 'Conscient.',
  E: 'Extraver.',
  A: 'Agreeable.',
  N: 'Neurotic.',
};

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
              {/* 實色帶：① 字母（最大） + ② 單詞（窄格自動換縮寫）。
                  帶吃滿整格寬；格子開了 overflow-hidden，帶的上緣兩角跟着格子圓角走。 */}
              <span
                className="block w-full"
                style={{
                  padding: 'min(1.6cqw, 4px) 0 min(2cqw, 5px)',
                  background: color,
                  color: '#2a1c06',
                  borderBottom: '1px solid rgba(154,116,72,0.35)',
                }}
              >
                <span
                  className="psy-serif block font-bold leading-none"
                  style={{ fontSize: LETTER_FONT, letterSpacing: '0.02em' }}
                >
                  {meta.key}
                </span>
                <span
                  lang={en ? 'en' : undefined}
                  className="psy-sans block font-semibold leading-tight"
                  style={{
                    fontSize: en ? WORD_FONT_EN : WORD_FONT_ZH,
                    marginTop: 'min(0.8cqw, 2px)',
                    padding: '0 1px',
                    hyphens: 'auto',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {en ? (
                    <>
                      <span data-dim-word-full>{meta.nameEn}</span>
                      <span data-dim-word-abbr>{WORD_ABBR_EN[dimension]}</span>
                    </>
                  ) : (
                    meta.name
                  )}
                </span>
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
