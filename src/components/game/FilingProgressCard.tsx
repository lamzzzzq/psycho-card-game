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
const LETTER_FONT = 'min(24cqw, 18px)';
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
    // 內距與行間距都放寬一档（老闆：margin 變寬、卡片變高）。
    <div className="psy-panel psy-etched flex shrink-0 flex-col gap-2 rounded-[1.2rem] p-2 sm:gap-2.5 sm:p-3">
      {/* 第一行：輪次 + 右側信息 */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(154,116,72,0.2)] bg-[var(--psy-card-content)] px-3 py-1.5 text-xs text-[var(--psy-ink-soft)] sm:text-sm">
        <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{roundText}</span>
        {info}
      </div>

      {/* 第二行：5 維 —— 角標 + 卡位 */}
      {/* 格子之間的間距放寬（老闆要求） */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5" aria-label={en ? 'Filing progress' : '歸檔進度'}>
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
              // 底色用該維度的 tint；已歸檔 = 主色 30% 加深 + 主色描邊，一眼看出區別。
              style={{
                containerType: 'inline-size',
                background: isDone ? `${color}33` : meta.tintHex,
                borderColor: isDone ? color : `${color}59`,
                boxShadow: isDone ? `inset 0 0 0 1px ${color}66` : undefined,
              }}
              className="flex min-w-0 flex-col items-stretch overflow-hidden rounded-lg border text-center transition active:scale-95"
              aria-label={`${name}${en ? `: needs ${target} cards, ${isDone ? 'filed' : 'not filed'}` : `：需要 ${target} 張，${isDone ? '已歸檔' : '未歸檔'}`}`}
            >
              {/* ① 字母：主色實底吃滿整格寬。字母是大號粗體，壓實底也有足夠對比
                  （onAccentHex 是逐維按實測對比度挑的）。格子開了 overflow-hidden，
                  帶的上緣兩角跟着格子圓角走。 */}
              <span
                className="psy-serif block w-full font-bold leading-none"
                style={{
                  fontSize: LETTER_FONT,
                  letterSpacing: '0.02em',
                  padding: 'min(2.2cqw, 6px) 0',
                  background: color,
                  color: meta.onAccentHex,
                  borderBottom: `1px solid ${color}`,
                }}
              >
                {meta.key}
              </span>

              {/* ② 單詞：放在【淺色底】上用深色字 —— 小字壓在 amber/coral 實底上
                  對比度只有 ~3，放淺底才有 7+ 的對比度，手機 10px 也讀得清。
                  窄格自動換縮寫（見 globals.css 的容器查詢）。 */}
              <span
                lang={en ? 'en' : undefined}
                className="psy-sans block font-semibold leading-tight"
                style={{
                  fontSize: en ? WORD_FONT_EN : WORD_FONT_ZH,
                  color: meta.inkHex,
                  // 下方留白拉開（老闆：單詞跟卡位靠太近）
                  padding: 'min(2.4cqw, 6px) 2px min(3.6cqw, 9px)',
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

              {/* 卡位：要幾張就幾格，居中。
                  空 = 虛線待放置位（與棄牌堆空態同一套視覺語言：虛線 = 這裏要放牌）；
                  滿 = 漸層實色 + 內圈白細線 + 投影，看起來像一張蓋在位上的牌
                       （內圈細線呼應牌面的雙線金框；◈ 是牌背符號，窄格會隱藏）。 */}
              <span
                className="flex flex-wrap items-center justify-center"
                style={{ gap: 'min(2.4cqw, 5px)', padding: '0 2px min(5cqw, 12px)' }}
              >
                {Array.from({ length: target }).map((_, i) => (
                  <span
                    key={i}
                    data-dim-slot
                    className="flex items-center justify-center leading-none"
                    style={{
                      width: 'min(12cqw, 19px)',
                      aspectRatio: '3 / 4',
                      borderRadius: 'min(2cqw, 3px)',
                      fontSize: 'min(6cqw, 10px)',
                      color: isDone ? 'rgba(255,255,255,0.9)' : `${color}99`,
                      background: isDone
                        ? `linear-gradient(160deg, ${color}, ${color}cc)`
                        : 'rgba(255,255,255,0.45)',
                      border: isDone ? `1px solid ${color}` : `1px dashed ${color}8c`,
                      boxShadow: isDone
                        ? `0 1px 2px rgba(96,72,38,0.28), inset 0 0 0 1px rgba(255,255,255,0.42)`
                        : undefined,
                    }}
                  >
                    <span data-dim-slot-mark>◈</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
