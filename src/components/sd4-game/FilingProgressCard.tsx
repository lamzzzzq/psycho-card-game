'use client';

import { useState, type ReactNode } from 'react';
import { Dimension, DIMENSIONS } from '@/types/sd4-game';
import { SD4_GAME_META } from '@/data/sd4-game-dimensions';
import type { Locale } from '@/lib/i18n';

// 回合信息 + 4 維歸檔進度卡（components/hexaco-game/FilingProgressCard 的 SD4 物理隔離副本）。
// 與 HEXACO 版的結構差異：只有 4 維，移動端單行 4 列就放得下（一格 ~85px，比大五
// 5 列還寬裕）→ 不需要 3+3 折行。其餘版式/字號/卡位規則逐行沿用。
//
// 一格 = 一個維度，分三個區域（老闆定的版式）：
//   ① 字母 M/N/P/S —— 字號最大
//   ② 維度單詞 —— 保證在小屏手機上也讀得清；格子窄到放不下全稱就換縮寫（Conscient.）
//   ③ 卡位 —— 「這維度要幾張牌」，要 3 張擺 3 格
// ①② 在實色帶上（帶吃滿整格寬），③ 在淺色底。
//
// 卡位只有兩態（空/滿）——引擎只公開「該維度是否已歸檔」，不公開手上湊了幾張，
// 所以這裏不能畫「2/3」那種進度，否則等於幫玩家數牌（規則要求玩家自己算）。
//
// ⚠️ 桌面上的高度全靠這些 min()/clamp() 的【px 上限】收着（老闆嫌太占高，
//    2026-07-31 又收了一档）：手機那邊 cqw 算出來的值都小於上限，所以只動上限
//    不會影響手機。
// 字號：每格自己是 container，用 cqw 跟着格子寬度動態變化。
//   ① 字母只有 1 個字符 → 可以放得很大：min(24cqw, 18px)。
//   ② 單詞首字母大寫（比全大寫窄約 30%）+ 下限 9px；格子 ≤140px 換縮寫
//      （容器查詢見 globals.css 的 [data-dim-word-*]）。
//      【禁止換行】：縮寫尾巴那個「.」曾被甩到第二行（iPhone 8 一格只有 65px，
//      10px 下差 1~2px 放不下）→ whiteSpace: nowrap + 下限降到 9px 一起解決。
const LETTER_FONT = 'min(24cqw, 16px)';
const WORD_FONT_EN = 'clamp(9px, 12cqw, 13px)';
const WORD_FONT_ZH = 'clamp(11px, 20cqw, 14px)';

// 窄格子用的英文縮寫（Openness 本來就短，不縮）。閾值在 globals.css：
// 格子 ≤ 140px 時顯示縮寫 —— 全稱 Conscientiousness 在 14px 下要 ~127px，
// 加上留白得 ~135px 才放得下。
const WORD_ABBR_EN: Record<Dimension, string> = {
  M: 'Machiavel.',
  N: 'Narciss.',
  P: 'Psychopa.',
  S: 'Sadism',
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
  /**
   * 教學沙盒專用：當前步驟要玩家看的那一維，畫一圈引導描邊。
   * 正式牌桌【不傳】—— 那裏高亮哪一維等於幫玩家做決定。
   */
  highlightDim?: Dimension | null;
  /** 教學沙盒裏格子不可點（沒有歸檔詳情面板可開）。 */
  disabled?: boolean;
  /**
   * 整條第一行（輪次 + 已完成）可點 → 收起/展開下方維度格，省豎向空間。
   * 點擊區只有第一行，維度格照舊點開歸檔詳情。默認關（教學沙盒等舊用法零變化），
   * 正式牌桌（單機/PVP/SD4）顯式開。
   */
  collapsible?: boolean;
}

export function FilingProgressCard({
  locale = 'zh',
  roundText,
  info,
  targets,
  declaredDims,
  onOpenArchive,
  highlightDim = null,
  disabled = false,
  collapsible = false,
}: FilingProgressCardProps) {
  const en = locale === 'en';
  const [collapsed, setCollapsed] = useState(false);
  const headerClass =
    'flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(154,116,72,0.2)] bg-[var(--psy-card-content)] px-3 py-1.5 text-xs text-[var(--psy-ink-soft)] sm:text-sm';

  return (
    // 內距與行間距都放寬一档（老闆：margin 變寬、卡片變高）。
    <div className="psy-panel psy-etched flex shrink-0 flex-col gap-2 rounded-[1.2rem] p-1.5 sm:p-2.5">
      {/* 第一行：輪次 + 右側信息。collapsible 時整行是按鈕 → 收起/展開下方維度格
          （點擊區只有這一行；維度格的點擊仍是打開歸檔詳情，互不影響）。 */}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={en
            ? (collapsed ? 'Expand filing progress' : 'Collapse filing progress')
            : (collapsed ? '展開歸檔進度' : '收起歸檔進度')}
          className={`${headerClass} text-left transition active:scale-[0.99]`}
        >
          <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{roundText}</span>
          {info}
          {/* 展開 = ▼（點了收起）；收起 = 轉成 ▲（點了展開，用戶指定朝上）。
              info 內部自帶 ml-auto，沒有 info 時箭頭自己靠右。 */}
          <span
            aria-hidden
            className={`${info ? 'ml-0.5' : 'ml-auto'} shrink-0 text-[10px] leading-none text-[var(--psy-muted)] transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>
      ) : (
        <div className={headerClass}>
          <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{roundText}</span>
          {info}
        </div>
      )}

      {/* 第二行：4 維 —— 角標 + 卡位。
          4 格單行放得下（移動端一格 ~85px）；collapsible 收起時整塊不渲染（省豎向空間）。 */}
      {!(collapsible && collapsed) && (
      <div className="grid grid-cols-4 gap-1 sm:gap-2.5" aria-label={en ? 'Filing progress' : '歸檔進度'}>
        {DIMENSIONS.map((dimension) => {
          const meta = SD4_GAME_META[dimension];
          const color = meta.colorHex;
          const name = en ? meta.nameEn : meta.name;
          const target = targets[dimension] ?? 0;
          const isDone = declaredDims.has(dimension);

          return (
            <button
              key={dimension}
              type="button"
              onClick={disabled ? undefined : onOpenArchive}
              disabled={disabled}
              // containerType 讓下面的 cqw 按「這一格的寬度」解析。
              // 底色用該維度的 tint；已歸檔 = 主色 30% 加深 + 主色描邊，一眼看出區別。
              // highlightDim（只有教學沙盒會傳）再加一圈外發光引導視線。
              style={{
                containerType: 'inline-size',
                background: isDone ? `${color}33` : meta.tintHex,
                borderColor: isDone || dimension === highlightDim ? color : `${color}59`,
                boxShadow: isDone
                  ? `inset 0 0 0 1px ${color}66`
                  : dimension === highlightDim
                  ? `0 0 0 2px ${color}55`
                  : undefined,
              }}
              className={`flex min-w-0 flex-col items-stretch overflow-hidden rounded-lg border text-center transition ${
                disabled ? 'cursor-default' : 'active:scale-95'
              }`}
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
                  padding: 'min(2.2cqw, 4px) 0',
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
                  padding: 'min(2.4cqw, 4px) 2px min(3.6cqw, 6px)',
                  // 禁止換行（老闆：縮寫的那個「.」被甩到第二行）。字號下限降到 9px：
                  // iPhone 8 一格只有 ~65px，10px 下「Conscient.」差 1~2px 放不下才折的。
                  whiteSpace: 'nowrap',
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
                       （內圈細線呼應牌面的雙線金框，◈ 是本項目的牌背符號）。
                  兩條硬要求（老闆）：單詞必須自己一行、五張卡位也必須自己一行。
                  單詞靠 whiteSpace:nowrap；卡位靠 flex-nowrap + minWidth:0（放不下就
                  等比壓小，不折行）。另外把卡片內距 8→6px、格距 6→4px 讓出 12px，
                  iPhone 8 一格從 65px 加寬到 ~68px。 */}
              <span
                className="flex flex-nowrap items-center justify-center"
                style={{ gap: 'min(2.6cqw, 5px)', padding: '0 2px min(5cqw, 8px)' }}
              >
                {Array.from({ length: target }).map((_, i) => (
                  <span
                    key={i}
                    data-dim-slot
                    className="flex items-center justify-center leading-none"
                    style={{
                      // 4:7 = 真牌的比例，卡位長身站着更像一張牌（老闆：卡牌弄高一點）。
                      // minWidth:0 —— 外層是 flex-nowrap，萬一某個維度要 5 張、
                      // 格子又特別窄，卡位可以等比壓小，但【絕不換行】（老闆硬要求）。
                      minWidth: 0,
                      width: 'min(15.5cqw, 17px)',
                      aspectRatio: '4 / 7',
                      borderRadius: 'min(2.4cqw, 3.5px)',
                      fontSize: 'min(7cqw, 11px)',
                      color: isDone ? 'rgba(255,255,255,0.9)' : `${color}99`,
                      background: isDone
                        ? `linear-gradient(160deg, ${color}, ${color}cc)`
                        : 'rgba(255,255,255,0.45)',
                      // 空位用 dotted 而不是 dashed：dashed 的線段長度是瀏覽器按
                      // 邊框粗細算的，在 10px 的小方塊上一段就占掉小半條邊，太搶眼
                      // （老闆反饋）。dotted 每段只有 1px，同樣是「虛的」但安靜得多。
                      border: isDone ? `1px solid ${color}` : `1px dotted ${color}b3`,
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
      )}
    </div>
  );
}
