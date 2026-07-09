import React from 'react';
import { staticFile } from 'remotion';
import { T, DimKey, dimColor, dimName } from './theme';

// 卡框几何（还原 OrnateCard）
const M = 18, R = 400 - M;
const ARCH = `M${M},418 L${M},110 C${M},52 105,30 200,22 C295,30 ${R},52 ${R},110 L${R},418 Z`;
const ARCH_INNER = `M${M + 7},414 L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},414`;
function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}

type Props = {
  cardId?: number;
  statement?: string;
  term?: string;
  definition?: string;
  width?: number;
  revealed?: DimKey;
  // 该维度目标高亮描边（凑组时用）
  glow?: string;
};

export const Card: React.FC<Props> = ({ cardId, statement, term, definition, width = 200, revealed, glow }) => {
  const uid = React.useId().replace(/:/g, '');
  const bgId = `bg-${uid}`, phId = `ph-${uid}`, archId = `arch-${uid}`;
  const isKnow = !!definition;
  const shell = T.shell, content = T.content;
  return (
    <div style={{ width, containerType: 'inline-size' }}>
      <div style={{ aspectRatio: '4 / 7', position: 'relative', filter: 'drop-shadow(0 16px 26px rgba(90,60,30,0.26)) drop-shadow(0 4px 8px rgba(90,60,30,0.18))' }}>
        <svg viewBox="0 0 400 700" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <clipPath id={archId}><path d={ARCH} /></clipPath>
            <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={shell[0]} /><stop offset="0.6" stopColor={shell[1]} /><stop offset="1" stopColor={shell[2]} />
            </linearGradient>
            <linearGradient id={phId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={content[0]} /><stop offset="1" stopColor={content[1]} />
            </linearGradient>
          </defs>
          <rect x="3" y="3" width="394" height="694" rx="42" fill={`url(#${bgId})`} />
          {glow && <rect x="3" y="3" width="394" height="694" rx="42" fill="none" stroke={glow} strokeWidth="8" opacity="0.9" />}
          {!isKnow && (
            <g clipPath={`url(#${archId})`}>
              <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
              {cardId != null && <image href={staticFile(`cards/${cardId}.webp`)} x={M} y="20" width={R - M} height="400" preserveAspectRatio="xMidYMid slice" />}
            </g>
          )}
          {isKnow && (() => {
            const PX = 200, PY = 16, d2r = Math.PI / 180;
            const angles = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
            const radii = [120, 188, 256, 324, 392];
            return (
              <g clipPath={`url(#${archId})`}>
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
                {angles.map((deg, i) => { const a = deg * d2r; return <line key={`r${i}`} x1={PX} y1={PY} x2={PX + Math.sin(a) * 470} y2={PY + Math.cos(a) * 470} stroke={T.gold} strokeWidth={0.9} opacity={0.14} />; })}
                {radii.map((r, j) => <circle key={`a${j}`} cx={PX} cy={PY} r={r} fill="none" stroke={T.gold} strokeWidth={1} opacity={0.16} />)}
                {angles.flatMap((deg, i) => { const a = deg * d2r; return radii.map((r, j) => <circle key={`d${i}-${j}`} cx={PX + Math.sin(a) * r} cy={PY + Math.cos(a) * r} r={2.4} fill={T.gold} opacity={0.5} />); })}
              </g>
            );
          })()}
          <path d={ARCH} fill="none" stroke={T.cardLine} strokeWidth="3" />
          <path d={ARCH_INNER} fill="none" stroke={T.cardLineSoft} strokeWidth="1.6" opacity="0.85" />
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={T.cardLine} strokeWidth="3" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={T.cardLineSoft} strokeWidth="1.6" opacity="0.8" />
          <path d={spark(200, 10, 9)} fill={T.gold} />
          <path d="M200,13 l11,11 l-11,11 l-11,-11 Z" fill={T.gold} />
          <line x1="150" y1="24" x2="184" y2="24" stroke={T.cardLine} strokeWidth="1.6" />
          <line x1="216" y1="24" x2="250" y2="24" stroke={T.cardLine} strokeWidth="1.6" />
          <path d={spark(40, 54, 9)} fill={T.gold} /><path d={spark(360, 54, 9)} fill={T.gold} />
          <path d={spark(40, 646, 9)} fill={T.gold} /><path d={spark(360, 646, 9)} fill={T.gold} />
          <line x1="56" y1="432" x2="184" y2="432" stroke={T.cardLineSoft} strokeWidth="1.3" />
          <path d="M200,423 l9,9 l-9,9 l-9,-9 Z" fill={T.gold} />
          <line x1="216" y1="432" x2="344" y2="432" stroke={T.cardLineSoft} strokeWidth="1.3" />
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill={content[0]} />
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill="none" stroke={T.cardLineSoft} strokeWidth="2" />
          <path d={`M${M + 10},474 V462 a4,4 0 0 1 4,-4 H${M + 26}`} fill="none" stroke={T.cardLine} strokeWidth="2" />
          <path d={`M${R - 10},474 V462 a4,4 0 0 0 -4,-4 H${R - 26}`} fill="none" stroke={T.cardLine} strokeWidth="2" />
          <path d={`M${M + 10},648 V660 a4,4 0 0 0 4,4 H${M + 26}`} fill="none" stroke={T.cardLine} strokeWidth="2" />
          <path d={`M${R - 10},648 V660 a4,4 0 0 1 -4,4 H${R - 26}`} fill="none" stroke={T.cardLine} strokeWidth="2" />
          <path d="M192,448 l8,-8 l8,8 l-8,8 Z" fill={T.gold} />
        </svg>
        {isKnow && (
          <div style={{ position: 'absolute', left: '11%', right: '11%', top: '7%', height: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: T.ink, fontFamily: T.serif, fontSize: '9.5cqw', fontWeight: 600, lineHeight: 1.28, margin: 0 }}>{term}</p>
          </div>
        )}
        <div style={{ position: 'absolute', left: '9%', right: '9%', top: '64.5%', height: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ color: T.ink, fontFamily: T.serif, fontWeight: 600, fontSize: isKnow ? '7.6cqw' : '9cqw', lineHeight: 1.28, margin: 0 }}>{isKnow ? definition : statement}</p>
        </div>
        {revealed && (
          <div style={{ position: 'absolute', left: '50%', top: '58.5%', transform: 'translate(-50%,-50%)', zIndex: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2.4cqw 5.5cqw', fontFamily: T.serif, fontSize: '6.4cqw', fontWeight: 700, letterSpacing: '0.04em', borderRadius: 999, background: dimColor(revealed), color: '#1a1a1a', border: '1.5px solid rgba(0,0,0,0.28)', whiteSpace: 'nowrap', boxShadow: '0 1.5cqw 3cqw rgba(0,0,0,0.22)' }}>{dimName(revealed)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
