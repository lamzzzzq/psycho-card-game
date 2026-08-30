'use client';

/**
 * SD4（Dark Tetrad）專用卡面。HexacoCard 的物理隔離副本——**與 Big Five / HEXACO 互不 import**，
 * 改這個檔案動不到另外兩套一個像素。差異僅：維度類型/配色取 SD4（M/N/P/S），
 * 文字排版走 sd4CardText（同一套實測字寬模型）。版式沿用 HEXACO 的 roomy 幾何。
 *
 * 沿用 HEXACO 版的三個玩法功能（幾何按 roomy 重算）：
 *   - 知識牌（isDummy + description）：極坐標暗紋 + 術語在拱區/定義在底框
 *   - 揭示維度角標（revealedDimension）：配色取 SD4_GAME_META
 *   - 選中態改金色雙描邊 + 暖金外發光（對齊老闆在 OrnateCard 拍板的「綠改金」）
 *
 * viewBox=400×700(=4:7) 內聯 SVG：矢量、任意尺寸清晰、零素材。
 */
import { useState, useId } from 'react';
import { getSd4TextLayout, resolveSd4Label } from './sd4CardText';
import type { Dimension } from '@/types/sd4-game';
import { SD4_GAME_META } from '@/data/sd4-game-dimensions';

const GOLD = '#9a7448';
const GOLD_SOFT = '#b9904f';
const GOLD_DIM = 'rgba(154,116,72,0.42)';
const GOLD_BRIGHT = '#c39a52';
// 選中態描邊：深金托底 + 亮金芯（同 OrnateCard）。
const GOLD_DEEP = '#8a5f22';
const GOLD_LIT = '#e8c98a';

const M = 18;           // 內容內縮（≈4.5%）
const R = 400 - M;      // 382

// ── roomy 版式的三條橫線（Big Five 對應值是 418 / 432 / 448）──
const ARCH_BOTTOM = 378;
const DIVIDER_Y = ARCH_BOTTOM + 14;   // 392
const PANEL_TOP = ARCH_BOTTOM + 30;   // 408
const PANEL_BOTTOM = 674;             // 底框下沿（與 Big Five 相同）
const PANEL_HEIGHT = PANEL_BOTTOM - PANEL_TOP; // 266
const SIDE_INSET = 7.5;               // 底框文字左右內距（%）

function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}
const ARCH = `M${M},${ARCH_BOTTOM} L${M},110 C${M},52 105,30 200,22 C295,30 ${R},52 ${R},110 L${R},${ARCH_BOTTOM} Z`;
const ARCH_INNER = `M${M + 7},${ARCH_BOTTOM - 4} L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},${ARCH_BOTTOM - 4}`;

// 中文按詞換行（英文原樣返回，交給瀏覽器按空格斷詞）。
function renderLabel(text: string, locale: 'zh' | 'en'): React.ReactNode {
  if (locale === 'en' || typeof Intl === 'undefined' || !('Segmenter' in Intl)) return text;
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  return Array.from(seg.segment(text)).map((p, i) =>
    p.isWordLike ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{p.segment}</span> : <span key={i}>{p.segment}</span>,
  );
}

interface Sd4CardProps {
  text: string;
  textEn?: string;
  /** 遊戲用：卡的維度（暫僅供將來擴展；角標顯示走 revealedDimension）。 */
  dimension?: Dimension;
  imageSrc?: string;
  selected?: boolean;
  /** 遊戲用：看牌機制揭示的維度 → 顯示實色角標。 */
  revealedDimension?: Dimension | null;
  /** 遊戲用：知識牌（dummy）。與 description 一起走「術語在拱區・定義在底框」版式。 */
  isDummy?: boolean;
  /** 知識牌一句話定義。 */
  description?: string;
  locale?: 'zh' | 'en';
  faceDown?: boolean;
  onClick?: () => void;
  /** 固定寬度(px)。與 fluid 二選一。 */
  width?: number;
  /** 流式：填滿父容器寬度。 */
  fluid?: boolean;
}

export function Sd4Card({
  text, textEn, imageSrc, selected = false, revealedDimension = null,
  isDummy = false, description, locale = 'zh', faceDown = false,
  onClick, width = 200, fluid = false,
}: Sd4CardProps) {
  const [imgError, setImgError] = useState(false);
  // 每張卡唯一的 SVG defs id（多卡同頁 id 重複會是無效 DOM）。
  const uid = useId().replace(/:/g, '');
  const archId = `sarch-${uid}`, bgId = `sbg-${uid}`, phId = `sph-${uid}`, bgDnId = `sbgdn-${uid}`;
  const glowId = `sglow-${uid}`, vigId = `svig-${uid}`;
  const showImg = !!imageSrc && !imgError;
  const isKnowledge = isDummy && !!description;
  const label = isKnowledge
    ? (locale === 'en' ? (textEn ?? text) : text).replace(/[。．.\s]+$/, '')
    : resolveSd4Label(text, textEn, locale);
  const statementLayout = getSd4TextLayout(label, locale);
  // 定義去掉尾部句號（同 OrnateCard）。
  const def = (description ?? '').replace(/[。．.\s]+$/, '');

  // 知識牌字號自適應（同 OrnateCard：術語按最長單詞、定義按總長）。
  const longestWord = Math.max(1, ...label.split(/[\s-]+/).filter(Boolean).map((w) => w.length));
  const termFont = Math.max(7.5, Math.min(13, 118 / longestWord));     // cqw
  const defLen = (description ?? '').length;
  const defFont = defLen > 72 ? 6.6 : defLen > 56 ? 7.4 : 8.5;          // cqw
  const defClamp = defLen > 72 ? 6 : 5;

  const wrapperStyle: React.CSSProperties = { containerType: 'inline-size', width: fluid ? '100%' : width };

  // 背面：雙線框 + 中央 ◈。
  if (faceDown) {
    return (
      <div className="shrink-0" style={wrapperStyle}>
        <div className="relative" style={{ aspectRatio: '4 / 7' }}>
          <svg viewBox="0 0 400 700" width="100%" height="100%" style={{ display: 'block' }}>
            <defs>
              <linearGradient id={bgDnId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#eaddc4" /><stop offset="1" stopColor="#d7c49e" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgDnId})`} />
            <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2" />
            <rect x="15" y="15" width="370" height="670" rx="30" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />
            <text x="200" y="372" textAnchor="middle" fontSize="64" fill={GOLD} opacity="0.72">◈</text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0" style={wrapperStyle}>
      <div
        onClick={onClick}
        className={`relative w-full select-none ${onClick ? 'psy-grab transition-transform hover:-translate-y-1' : ''}`}
        style={{
          aspectRatio: '4 / 7',
          // 選中：疊一層暖金外發光（drop-shadow 跟隨卡形，box-shadow 會畫成方框）。
          filter: selected
            ? 'drop-shadow(0 0 6px rgba(214,166,80,0.9)) drop-shadow(0 22px 30px rgba(96,72,38,0.38))'
            : 'drop-shadow(0 22px 30px rgba(96,72,38,0.34))',
          transform: 'translateZ(0)',
          opacity: isDummy ? 0.98 : 1,
        }}
      >
        <svg viewBox="0 0 400 700" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <clipPath id={archId}><path d={ARCH} /></clipPath>
            <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#eadfc8" /><stop offset="0.58" stopColor="#e1d1b2" /><stop offset="1" stopColor="#d5be95" />
            </linearGradient>
            <linearGradient id={phId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fdf8f1" /><stop offset="1" stopColor="#f5ecdd" />
            </linearGradient>
            {/* 頂部柔光聚光 + 暖紙暗角（知識牌暗紋用，同 OrnateCard） */}
            <radialGradient id={glowId} cx="50%" cy="15%" r="52%">
              <stop offset="0" stopColor="#fffaf0" stopOpacity="0.78" />
              <stop offset="0.55" stopColor="#f5dfad" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ecd9a0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={vigId} cx="50%" cy="40%" r="64%">
              <stop offset="0.55" stopColor="#7b5d33" stopOpacity="0" />
              <stop offset="1" stopColor="#7b5d33" stopOpacity="0.16" />
            </radialGradient>
          </defs>

          <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgId})`} />

          {/* 知識牌拱區暗紋：極坐標網格（放射線 × 同心弧 + 交點網點），幾何按 roomy 拱高裁切 */}
          {isKnowledge && (() => {
            const PX = 200, PY = 16;
            const angles = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
            const radii = [120, 188, 256, 324];
            const d2r = Math.PI / 180;
            const archH = ARCH_BOTTOM - 18; // 360
            return (
              <g clipPath={`url(#${archId})`}>
                {angles.map((deg, i) => {
                  const a = deg * d2r;
                  return <line key={`ray${i}`} x1={PX} y1={PY} x2={PX + Math.sin(a) * 470} y2={PY + Math.cos(a) * 470} stroke={GOLD} strokeWidth="0.7" opacity="0.11" />;
                })}
                {radii.map((r, j) => (
                  <circle key={`arc${j}`} cx={PX} cy={PY} r={r} fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.13" />
                ))}
                {angles.flatMap((deg, i) => {
                  const a = deg * d2r;
                  return radii.map((r, j) => (
                    <circle key={`dot${i}-${j}`} cx={PX + Math.sin(a) * r} cy={PY + Math.cos(a) * r} r="2.4" fill={GOLD_BRIGHT} opacity="0.55" />
                  ));
                })}
                <rect x={M} y="20" width={R - M} height={archH} fill="#fdf8f1" opacity="0.54" />
                <rect x={M} y="20" width={R - M} height={archH} fill={`url(#${glowId})`} />
                <rect x={M} y="20" width={R - M} height={archH} fill={`url(#${vigId})`} />
              </g>
            );
          })()}

          {/* 拱區：人格牌=插畫/缺圖回退 ◈；知識牌=暗紋拱(術語由 HTML 疊加) */}
          {!isKnowledge && (
            <>
              <g clipPath={`url(#${archId})`}>
                <rect x={M} y="20" width={R - M} height={ARCH_BOTTOM - 18} fill={`url(#${phId})`} />
                {showImg && (
                  <image href={imageSrc} x={M} y="20" width={R - M} height={ARCH_BOTTOM - 18} preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
                )}
              </g>
              {!showImg && <text x="200" y={(20 + ARCH_BOTTOM) / 2 + 18} textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}
            </>
          )}

          {/* 拱形描邊（雙線） */}
          <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="2.4" />
          <path d={ARCH_INNER} fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.85" />

          {/* 外雙線框 */}
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2.4" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />

          {/* 頂部中央紋章 */}
          <path d={spark(200, 10, 9)} fill={GOLD_BRIGHT} />
          <path d="M200,13 l11,11 l-11,11 l-11,-11 Z" fill="none" stroke={GOLD_BRIGHT} strokeWidth="2.4" />
          <line x1="150" y1="24" x2="184" y2="24" stroke={GOLD} strokeWidth="1.4" />
          <line x1="216" y1="24" x2="250" y2="24" stroke={GOLD} strokeWidth="1.4" />

          {/* 四角星 */}
          <path d={spark(40, 54, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(360, 54, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(40, 646, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(360, 646, 9)} fill={GOLD_BRIGHT} />

          {/* 拱底分隔 ◆ */}
          <line x1="56" y1={DIVIDER_Y} x2="184" y2={DIVIDER_Y} stroke={GOLD_DIM} strokeWidth="1.2" />
          <path d={`M200,${DIVIDER_Y - 9} l9,9 l-9,9 l-9,-9 Z`} fill={GOLD_BRIGHT} />
          <line x1="216" y1={DIVIDER_Y} x2="344" y2={DIVIDER_Y} stroke={GOLD_DIM} strokeWidth="1.2" />

          {/* 底部文字框 + 括號角 + 頂部小菱 */}
          <rect x={M} y={PANEL_TOP} width={R - M} height={PANEL_HEIGHT} rx="12" fill="#fdf8f1" opacity="0.92" stroke={GOLD_SOFT} strokeWidth="1.5" />
          <path d={`M${M + 10},${PANEL_TOP + 26} V${PANEL_TOP + 14} a4,4 0 0 1 4,-4 H${M + 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${R - 10},${PANEL_TOP + 26} V${PANEL_TOP + 14} a4,4 0 0 0 -4,-4 H${R - 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${M + 10},${PANEL_BOTTOM - 26} V${PANEL_BOTTOM - 14} a4,4 0 0 0 4,4 H${M + 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${R - 10},${PANEL_BOTTOM - 26} V${PANEL_BOTTOM - 14} a4,4 0 0 1 -4,4 H${R - 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M192,${PANEL_TOP} l8,-8 l8,8 l-8,8 Z`} fill={GOLD_BRIGHT} />

          {/* 選中：金色雙描邊（深金托底 + 亮金芯，對齊 OrnateCard 老闆拍板的綠改金） */}
          {selected && (
            <>
              <rect x="4" y="4" width="392" height="692" rx="42" fill="none" stroke={GOLD_DEEP} strokeWidth="7" />
              <rect x="4" y="4" width="392" height="692" rx="42" fill="none" stroke={GOLD_LIT} strokeWidth="3" />
            </>
          )}
        </svg>

        {/* 知識牌拱區（上半）：術語大字。roomy 拱底 378/700 = 54% → 文字區高度收到 44% */}
        {isKnowledge && (
          <div className="psy-sans absolute flex items-center justify-center text-center" style={{ left: '11%', right: '11%', top: '7%', height: '44%' }}>
            <p className="font-semibold" style={{ color: 'var(--psy-ink)', fontSize: `${termFont}cqw`, lineHeight: 1.3, paddingBottom: '1.5cqw', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {renderLabel(label, locale)}
            </p>
          </div>
        )}

        {/* 底框文字：人格題面（getSd4TextLayout 按面板寬高挑檔，完整呈現不截斷）
            / 知識牌定義（字號按總長自適應 + line-clamp） */}
        <div
          data-sd4-statement
          className="psy-sans absolute flex items-center justify-center text-center"
          style={{
            left: `${SIDE_INSET}%`,
            right: `${SIDE_INSET}%`,
            top: `${((PANEL_TOP + 3.5) / 700) * 100}%`,
            height: `${((PANEL_HEIGHT - 16) / 700) * 100}%`,
          }}
        >
          {isKnowledge ? (
            <p
              style={{
                color: 'var(--psy-ink-soft)',
                fontSize: `${defFont}cqw`,
                lineHeight: 1.32,
                paddingBottom: '0.22em',
                display: '-webkit-box', WebkitLineClamp: defClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {renderLabel(def, locale)}
            </p>
          ) : (
            <p
              className="font-semibold leading-snug"
              style={{
                color: 'var(--psy-ink)',
                fontSize: statementLayout.fontSize,
                lineHeight: statementLayout.lineHeight,
                overflowWrap: 'anywhere',
              }}
            >
              {renderLabel(label, locale)}
            </p>
          )}
        </div>

        {/* 揭示維度角標：實色底 + onAccent 字。位置對齊 OrnateCard 的相對關係
            ——中心壓在【拱底線稍上】（遮圖窗下緣，不遮底框文字）。roomy 拱底 54%，
            角標中心 53%：下緣 ≈56.7%，與題面首行（≈58.8% 起）留同大五版的安全距
            （原本定 56% 壓分隔線，長英文題面頂滿面板時首行會被蓋住）。
            字號按名字長度自適應——Honesty-Humility(16字) 縮檔不溢出。 */}
        {revealedDimension && (() => {
          const meta = SD4_GAME_META[revealedDimension];
          const dimLabel = locale === 'en' ? meta.nameEn : meta.name;
          const dimFont = dimLabel.length > 14 ? 5.8 : dimLabel.length > 9 ? 7 : 8.2;
          return (
            <div className="absolute z-20" style={{ left: '50%', top: '53%', transform: 'translate(-50%,-50%)', maxWidth: '95%' }}>
              <span
                className="psy-sans inline-flex items-center rounded-full font-bold uppercase leading-none whitespace-nowrap"
                style={{
                  padding: '2.6cqw 6cqw', fontSize: `${dimFont}cqw`, letterSpacing: '0.06em',
                  background: meta.colorHex, color: meta.onAccentHex,
                  border: '1.5px solid rgba(154,116,72,0.45)', boxShadow: '0 0.5cqw 1.6cqw rgba(96,72,38,0.24)',
                }}
              >
                {dimLabel}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
