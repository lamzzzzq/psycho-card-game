'use client';

/**
 * HEXACO 專用卡面。**與 Big Five 完全物理隔離**：Big Five 走 TarotCard → OrnateCard，
 * 這裡不 import 它們、也不被它們 import，改這個檔案動不到 Big Five 一個像素。
 *
 * 與 OrnateCard 的差別只有一處版式（roomy）：HEXACO 題面是 Big Five 的 2～3 倍長，
 * 拱區底線從 418 上收到 378，讓出 40 單位全給底框文字（文字面積 +19%），
 * 左右內距也從 9% 放寬到 7.5%。外框、拱形曲線、紋章、四角星、分隔菱全部沿用同一套視覺。
 *
 * viewBox=400×700(=4:7) 內聯 SVG：矢量、任意尺寸清晰、零素材。
 */
import { useState, useId } from 'react';
import { getHexacoTextLayout, resolveHexacoLabel } from './hexacoCardText';

const GOLD = '#9a7448';
const GOLD_SOFT = '#b9904f';
const GOLD_DIM = 'rgba(154,116,72,0.42)';
const GOLD_BRIGHT = '#c39a52';
const GREEN = 'rgba(111,143,85,0.82)';

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

interface HexacoCardProps {
  text: string;
  textEn?: string;
  imageSrc?: string;
  selected?: boolean;
  locale?: 'zh' | 'en';
  faceDown?: boolean;
  onClick?: () => void;
  /** 固定寬度(px)。與 fluid 二選一。 */
  width?: number;
  /** 流式：填滿父容器寬度。 */
  fluid?: boolean;
}

export function HexacoCard({
  text, textEn, imageSrc, selected = false, locale = 'zh', faceDown = false,
  onClick, width = 200, fluid = false,
}: HexacoCardProps) {
  const [imgError, setImgError] = useState(false);
  // 每張卡唯一的 SVG defs id（多卡同頁 id 重複會是無效 DOM）。
  const uid = useId().replace(/:/g, '');
  const archId = `harch-${uid}`, bgId = `hbg-${uid}`, phId = `hph-${uid}`, bgDnId = `hbgdn-${uid}`;
  const showImg = !!imageSrc && !imgError;
  const label = resolveHexacoLabel(text, textEn, locale);
  const statementLayout = getHexacoTextLayout(label, locale);

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
        style={{ aspectRatio: '4 / 7', filter: 'drop-shadow(0 22px 30px rgba(96,72,38,0.34))', transform: 'translateZ(0)' }}
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
          </defs>

          <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgId})`} />

          {/* 拱區：插畫，缺圖回退 ◈ */}
          <g clipPath={`url(#${archId})`}>
            <rect x={M} y="20" width={R - M} height={ARCH_BOTTOM - 18} fill={`url(#${phId})`} />
            {showImg && (
              <image href={imageSrc} x={M} y="20" width={R - M} height={ARCH_BOTTOM - 18} preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
            )}
          </g>
          {!showImg && <text x="200" y={(20 + ARCH_BOTTOM) / 2 + 18} textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}

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

          {/* 選中：綠色外描邊 */}
          {selected && <rect x="5" y="5" width="390" height="690" rx="40" fill="none" stroke={GREEN} strokeWidth="5" />}
        </svg>

        {/* 底框題面：字級由 getHexacoTextLayout 按面板寬高挑檔，完整呈現不截斷 */}
        <div
          data-hexaco-statement
          className="psy-sans absolute flex items-center justify-center text-center"
          style={{
            left: `${SIDE_INSET}%`,
            right: `${SIDE_INSET}%`,
            top: `${((PANEL_TOP + 3.5) / 700) * 100}%`,
            height: `${((PANEL_HEIGHT - 16) / 700) * 100}%`,
          }}
        >
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
        </div>
      </div>
    </div>
  );
}
