'use client';

// 装饰版塔罗卡（SVG 边框）—— 拱形图窗 + 双线金框 + 四角星 + 顶纹章 + 底部文字框。
// 全功能 drop-in：人格牌(图+陈述) / 知识牌(术语在拱区·定义在底框) / 背面 / 选中 / 维度角标。
// 由 TarotCard 在 ORNATE 开关下委托调用；关掉开关即回到无装饰版。
// viewBox=400×700(=4:7) 内联 SVG：矢量、任意尺寸清晰、可换色、零素材。padding 对齐现版。
import { useState, useId } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

const GOLD = '#9a7448';
const GOLD_SOFT = '#b9904f';
const GOLD_DIM = 'rgba(154,116,72,0.42)';
const GOLD_BRIGHT = '#c39a52'; // 点缀(星/菱)用更深的暖金，小图也看得清
const GREEN = 'rgba(111,143,85,0.82)';

const M = 18;            // 内容内缩（≈4.5%，对齐现版）
const R = 400 - M;      // 382

function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}
const ARCH = `M${M},418 L${M},110 C${M},52 105,30 200,22 C295,30 ${R},52 ${R},110 L${R},418 Z`;

// 中文按词换行（英文原样返回）。
function renderLabel(text: string, locale: 'zh' | 'en'): React.ReactNode {
  if (locale === 'en' || typeof Intl === 'undefined' || !('Segmenter' in Intl)) return text;
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  return Array.from(seg.segment(text)).map((p, i) =>
    p.isWordLike ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{p.segment}</span> : <span key={i}>{p.segment}</span>,
  );
}

interface OrnateCardProps {
  text: string;
  textEn?: string;
  dimension?: Dimension;
  imageSrc?: string;
  selected?: boolean;
  revealedDimension?: Dimension | null;
  isDummy?: boolean;
  locale?: 'zh' | 'en';
  faceDown?: boolean;
  onClick?: () => void;
  width?: number;
  fluid?: boolean;
  description?: string;
  /** 仅 card-lab 预览：对调知识牌的术语标题与定义正文位置。 */
  swapKnowledge?: boolean;
}

export function OrnateCard({
  text, textEn, imageSrc, selected = false, revealedDimension = null,
  isDummy = false, locale = 'zh', faceDown = false, onClick, width = 200, fluid = false, description,
  swapKnowledge = true,
}: OrnateCardProps) {
  const [imgError, setImgError] = useState(false);
  // 每张卡唯一的 SVG defs id（避免多卡同页 id 重复——技术上无效 DOM、且会妨碍日后 per-card 渐变/裁切）。
  const uid = useId().replace(/:/g, '');
  const archId = `arch-${uid}`, bgId = `bg-${uid}`, phId = `ph-${uid}`, bgDnId = `bgdn-${uid}`;
  const glowId = `glow-${uid}`, vigId = `vig-${uid}`;
  const showImg = !!imageSrc && !imgError;
  const isKnowledge = isDummy && !!description;
  // 术语/题面按 locale 取：en → textEn（英文术语），zh → text（繁中术语）。
  const label = (locale === 'en' ? (textEn ?? text) : text).replace(/[。．.\s]+$/, '');

  // 知识牌字号自适应：术语按「最长单词」缩放（用当前语言的术语算），保证整词放得下、绝不从词中间断。
  const longestWord = Math.max(1, ...label.split(/[\s-]+/).filter(Boolean).map((w) => w.length));
  const termFont = Math.max(7.5, Math.min(13, 118 / longestWord));     // cqw
  // 定义按总长缩放，最长(如 Defense ~83字)也不裁切。
  const defLen = (description ?? '').length;
  const defFont = defLen > 72 ? 6.6 : defLen > 56 ? 7.4 : 8.5;          // cqw
  const defClamp = defLen > 72 ? 6 : 5;

  const wrapperStyle: React.CSSProperties = { containerType: 'inline-size', width: fluid ? '100%' : width };

  // 背面：双线框 + 中央 ◈。
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
        className={`relative w-full select-none ${onClick ? 'cursor-pointer transition-transform hover:-translate-y-1' : ''}`}
        style={{ aspectRatio: '4 / 7', filter: 'drop-shadow(0 22px 30px rgba(96,72,38,0.34))', transform: 'translateZ(0)', opacity: isDummy ? 0.98 : 1 }}
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
            {/* 顶部柔光聚光：3 段平滑衰减，不再是一坨 */}
            <radialGradient id={glowId} cx="50%" cy="15%" r="52%">
              <stop offset="0" stopColor="#fffaf0" stopOpacity="0.78" />
              <stop offset="0.55" stopColor="#f5dfad" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ecd9a0" stopOpacity="0" />
            </radialGradient>
            {/* 暖纸暗角：四周轻压、聚焦中心，避免回到旧深色牌面。 */}
            <radialGradient id={vigId} cx="50%" cy="40%" r="64%">
              <stop offset="0.55" stopColor="#7b5d33" stopOpacity="0" />
              <stop offset="1" stopColor="#7b5d33" stopOpacity="0.16" />
            </radialGradient>
          </defs>

          <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgId})`} />

          {/* 知识牌拱区暗纹：极坐标网格（放射线 × 同心弧，交点放大网点）+ 中心留白给术语 */}
          {isKnowledge && (() => {
            const PX = 200, PY = 16;                       // 放射/同心圆的共同圆心(拱顶上方)
            const angles = [-72, -54, -36, -18, 0, 18, 36, 54, 72]; // 放射线角度(度)
            const radii = [120, 188, 256, 324, 392];       // 同心弧半径
            const d2r = Math.PI / 180;
            return (
              <g clipPath={`url(#${archId})`}>
                {/* 放射线 */}
                {angles.map((deg, i) => {
                  const a = deg * d2r;
                  return <line key={`ray${i}`} x1={PX} y1={PY} x2={PX + Math.sin(a) * 470} y2={PY + Math.cos(a) * 470} stroke={GOLD} strokeWidth="0.7" opacity="0.11" />;
                })}
                {/* 同心弧（以 P 为心的圆，裁在拱内 = 一圈圈涟漪） */}
                {radii.map((r, j) => (
                  <circle key={`arc${j}`} cx={PX} cy={PY} r={r} fill="none" stroke={GOLD} strokeWidth="0.8" opacity="0.13" />
                ))}
                {/* 交界处网点（放大、提亮） */}
                {angles.flatMap((deg, i) => {
                  const a = deg * d2r;
                  return radii.map((r, j) => (
                    <circle key={`dot${i}-${j}`} cx={PX + Math.sin(a) * r} cy={PY + Math.cos(a) * r} r="2.4" fill={GOLD_BRIGHT} opacity="0.55" />
                  ));
                })}
                <rect x={M} y="20" width={R - M} height="400" fill="#fdf8f1" opacity="0.54" />
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${glowId})`} />
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${vigId})`} />
              </g>
            );
          })()}

          {/* 拱区：人格牌=插画/占位；知识牌=空拱(术语由 HTML 叠加) */}
          {!isKnowledge && (
            <>
              <g clipPath={`url(#${archId})`}>
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
                {showImg && (
                  <image href={imageSrc} x={M} y="20" width={R - M} height="400" preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
                )}
              </g>
              {!showImg && <text x="200" y="235" textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}
            </>
          )}

          {/* 拱形描边（双线） */}
          <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="2.4" />
          <path d={`M${M + 7},414 L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},414`} fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.85" />

          {/* 外双线框 */}
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2.4" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />

          {/* 顶部中央纹章（放大+提亮） */}
          <path d={spark(200, 10, 9)} fill={GOLD_BRIGHT} />
          <path d="M200,13 l11,11 l-11,11 l-11,-11 Z" fill="none" stroke={GOLD_BRIGHT} strokeWidth="2.4" />
          <line x1="150" y1="24" x2="184" y2="24" stroke={GOLD} strokeWidth="1.4" />
          <line x1="216" y1="24" x2="250" y2="24" stroke={GOLD} strokeWidth="1.4" />

          {/* 四角星（放大+提亮） */}
          <path d={spark(40, 54, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(360, 54, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(40, 646, 9)} fill={GOLD_BRIGHT} />
          <path d={spark(360, 646, 9)} fill={GOLD_BRIGHT} />

          {/* 拱底分隔 ◆（放大+提亮） */}
          <line x1="56" y1="432" x2="184" y2="432" stroke={GOLD_DIM} strokeWidth="1.2" />
          <path d="M200,423 l9,9 l-9,9 l-9,-9 Z" fill={GOLD_BRIGHT} />
          <line x1="216" y1="432" x2="344" y2="432" stroke={GOLD_DIM} strokeWidth="1.2" />

          {/* 底部文字框 + 括号角 + 顶部小菱 */}
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill="#fdf8f1" opacity="0.92" stroke={GOLD_SOFT} strokeWidth="1.5" />
          {/* 四角括号：内缩 ~10px，与底框边线留出间距，不重叠 */}
          <path d={`M${M + 10},474 V462 a4,4 0 0 1 4,-4 H${M + 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${R - 10},474 V462 a4,4 0 0 0 -4,-4 H${R - 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${M + 10},648 V660 a4,4 0 0 0 4,4 H${M + 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${R - 10},648 V660 a4,4 0 0 1 -4,4 H${R - 26}`} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d="M192,448 l8,-8 l8,8 l-8,8 Z" fill={GOLD_BRIGHT} />

          {/* 选中：绿色外描边 */}
          {selected && <rect x="5" y="5" width="390" height="690" rx="40" fill="none" stroke={GREEN} strokeWidth="5" />}
        </svg>

        {/* 知识牌拱区（上半）：默认=术语大字；swapKnowledge=定义正文（对调预览用） */}
        {isKnowledge && (
          <div className="psy-serif absolute flex items-center justify-center text-center" style={{ left: '11%', right: '11%', top: '7%', height: '50%' }}>
            <p className={swapKnowledge ? '' : 'font-semibold'} style={{ color: swapKnowledge ? 'var(--psy-ink-soft)' : 'var(--psy-ink)', fontSize: `${swapKnowledge ? defFont : termFont}cqw`, lineHeight: swapKnowledge ? 1.32 : 1.3, paddingBottom: '1.5cqw', display: '-webkit-box', WebkitLineClamp: swapKnowledge ? 6 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {swapKnowledge ? description : renderLabel(label, locale)}
            </p>
          </div>
        )}

        {/* 底框文字（下半）：人格陈述 / 知识定义；swapKnowledge 时知识牌改放术语标题 */}
        <div className="psy-serif absolute flex items-center justify-center text-center" style={{ left: '9%', right: '9%', top: '64.5%', height: '30%' }}>
          <p
            className={isKnowledge && !swapKnowledge ? '' : 'font-semibold leading-snug'}
            style={{
              color: isKnowledge && !swapKnowledge ? 'var(--psy-ink-soft)' : 'var(--psy-ink)',
              fontSize: isKnowledge ? `${swapKnowledge ? termFont : defFont}cqw` : (locale === 'en' ? '9.5cqw' : '10.5cqw'),
              lineHeight: isKnowledge && !swapKnowledge ? 1.32 : 1.25,
              display: '-webkit-box', WebkitLineClamp: isKnowledge ? (swapKnowledge ? 4 : defClamp) : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {isKnowledge ? (swapKnowledge ? renderLabel(label, locale) : description) : renderLabel(label, locale)}
          </p>
        </div>

        {/* 揭示维度角标：实心金底 + 深色字，放大，居中压在拱底分隔处。
            字号按名字长度自适应——长英文名(Conscientiousness)缩到不溢出。 */}
        {revealedDimension && (() => {
          const meta = DIMENSION_META[revealedDimension];
          const dimLabel = locale === 'en' ? meta.nameEn : meta.name;
          const dimFont = dimLabel.length > 14 ? 5.8 : dimLabel.length > 9 ? 7 : 8.2;
          return (
            <div className="absolute z-20" style={{ left: '50%', top: '58.5%', transform: 'translate(-50%,-50%)', maxWidth: '95%' }}>
              <span
                className="psy-serif inline-flex items-center rounded-full font-bold uppercase leading-none whitespace-nowrap"
                style={{
                  padding: '2.6cqw 6cqw', fontSize: `${dimFont}cqw`, letterSpacing: '0.06em',
                  background: meta.colorHex, color: '#2a1c06',
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
