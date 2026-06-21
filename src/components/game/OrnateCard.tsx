'use client';

// 装饰版塔罗卡（SVG 边框）—— 拱形图窗 + 双线金框 + 四角星 + 顶纹章 + 底部文字框。
// 全功能 drop-in：人格牌(图+陈述) / 知识牌(术语在拱区·定义在底框) / 背面 / 选中 / 维度角标。
// 由 TarotCard 在 ORNATE 开关下委托调用；关掉开关即回到无装饰版。
// viewBox=400×700(=4:7) 内联 SVG：矢量、任意尺寸清晰、可换色、零素材。padding 对齐现版。
import { useState, useId } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

const GOLD = '#c9a45c';
const GOLD_SOFT = '#9c7c44';
const GOLD_DIM = 'rgba(201,164,92,0.45)';
const GREEN = 'rgba(143,199,135,0.85)';

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
}

export function OrnateCard({
  text, textEn, imageSrc, selected = false, revealedDimension = null,
  isDummy = false, locale = 'zh', faceDown = false, onClick, width = 200, fluid = false, description,
}: OrnateCardProps) {
  const [imgError, setImgError] = useState(false);
  // 每张卡唯一的 SVG defs id（避免多卡同页 id 重复——技术上无效 DOM、且会妨碍日后 per-card 渐变/裁切）。
  const uid = useId().replace(/:/g, '');
  const archId = `arch-${uid}`, bgId = `bg-${uid}`, phId = `ph-${uid}`, bgDnId = `bgdn-${uid}`;
  const showImg = !!imageSrc && !imgError;
  const isKnowledge = isDummy && !!description;
  const label = (locale === 'en' ? (textEn ?? text) : text).replace(/[。．.\s]+$/, '');

  // 知识牌按文本长度自适应字号/行数：短的保持大、最长的(如 Erikson/Defense)自动缩到刚好放下不裁切。
  const termLen = text.length;
  const termFont = termLen > 24 ? 10 : termLen > 15 ? 11.5 : 13;        // cqw
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
                <stop offset="0" stopColor="#19293c" /><stop offset="1" stopColor="#0d1825" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgDnId})`} />
            <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2" />
            <rect x="15" y="15" width="370" height="670" rx="30" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />
            <text x="200" y="372" textAnchor="middle" fontSize="64" fill={GOLD} opacity="0.55">◈</text>
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
        style={{ aspectRatio: '4 / 7', filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.4))', opacity: isDummy ? 0.97 : 1 }}
      >
        <svg viewBox="0 0 400 700" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <clipPath id={archId}><path d={ARCH} /></clipPath>
            <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16243a" /><stop offset="0.6" stopColor="#0e1a28" /><stop offset="1" stopColor="#0a131e" />
            </linearGradient>
            <linearGradient id={phId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1c2c44" /><stop offset="1" stopColor="#0f1c2b" />
            </linearGradient>
          </defs>

          <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgId})`} />

          {/* 拱区：人格牌=插画/占位；知识牌=空拱(术语由 HTML 叠加) */}
          {!isKnowledge && (
            <>
              <g clipPath={`url(#${archId})`}>
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
                {showImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <image href={imageSrc} x={M} y="20" width={R - M} height="400" preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
                )}
              </g>
              {!showImg && <text x="200" y="235" textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}
            </>
          )}

          {/* 拱形描边（双线） */}
          <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${M + 7},414 L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},414`} fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.85" />

          {/* 外双线框 */}
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />

          {/* 顶部中央纹章 */}
          <path d={spark(200, 11, 6)} fill={GOLD} />
          <path d="M200,16 l8,8 l-8,8 l-8,-8 Z" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <line x1="158" y1="24" x2="184" y2="24" stroke={GOLD_SOFT} strokeWidth="1" />
          <line x1="216" y1="24" x2="242" y2="24" stroke={GOLD_SOFT} strokeWidth="1" />

          {/* 四角星 */}
          <path d={spark(40, 52, 6)} fill={GOLD} />
          <path d={spark(360, 52, 6)} fill={GOLD} />
          <path d={spark(40, 648, 5)} fill={GOLD} />
          <path d={spark(360, 648, 5)} fill={GOLD} />

          {/* 拱底分隔 ◆ */}
          <line x1="60" y1="432" x2="186" y2="432" stroke={GOLD_DIM} strokeWidth="1" />
          <path d="M200,425 l7,7 l-7,7 l-7,-7 Z" fill={GOLD} />
          <line x1="214" y1="432" x2="340" y2="432" stroke={GOLD_DIM} strokeWidth="1" />

          {/* 底部文字框 + 括号角 + 顶部小菱 */}
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill="none" stroke={GOLD_SOFT} strokeWidth="1.5" />
          <path d={`M${M + 14},462 v-8 a4,4 0 0 1 4,-4 h8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${R - 14},462 v-8 a4,4 0 0 0 -4,-4 h-8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${M + 14},660 v8 a4,4 0 0 0 4,4 h8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${R - 14},660 v8 a4,4 0 0 1 -4,4 h-8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M194,448 l6,-6 l6,6 l-6,6 Z" fill={GOLD} />

          {/* 选中：绿色外描边 */}
          {selected && <rect x="5" y="5" width="390" height="690" rx="40" fill="none" stroke={GREEN} strokeWidth="5" />}
        </svg>

        {/* 知识牌术语：拱区居中大字（按长度自适应） */}
        {isKnowledge && (
          <div className="psy-serif absolute flex items-center justify-center text-center" style={{ left: '11%', right: '11%', top: '7%', height: '50%' }}>
            <p className="font-semibold" style={{ color: 'var(--psy-ink)', fontSize: `${termFont}cqw`, lineHeight: 1.12, overflowWrap: 'break-word', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {text}
            </p>
          </div>
        )}

        {/* 底框文字：人格陈述 / 知识定义（按长度自适应字号/行数，最长也不裁切） */}
        <div className="psy-serif absolute flex items-center justify-center text-center" style={{ left: '9%', right: '9%', top: '64.5%', height: '30%' }}>
          <p
            className={isKnowledge ? '' : 'font-semibold leading-snug'}
            style={{
              color: isKnowledge ? 'var(--psy-muted)' : 'var(--psy-ink)',
              fontSize: isKnowledge ? `${defFont}cqw` : (locale === 'en' ? '9.5cqw' : '10.5cqw'),
              lineHeight: isKnowledge ? 1.32 : 1.25,
              overflowWrap: isKnowledge ? 'break-word' : undefined,
              display: '-webkit-box', WebkitLineClamp: isKnowledge ? defClamp : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {isKnowledge ? description : renderLabel(label, locale)}
          </p>
        </div>

        {/* 揭示维度角标：实心金底 + 深色字，放大，居中压在拱底分隔处。
            字号按名字长度自适应——长英文名(Conscientiousness/Emotional Stability)缩到不溢出。 */}
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
                  background: meta.colorHex, color: '#0a0a0a',
                  border: '1.5px solid rgba(0,0,0,0.4)', boxShadow: '0 0.5cqw 1.6cqw rgba(0,0,0,0.55)',
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
