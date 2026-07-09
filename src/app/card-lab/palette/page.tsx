'use client';

/**
 * Lightmode 對局場景預覽 —— /card-lab/palette
 * 6 款配色 × 2 明度方向 = 12 個方案，給老板挑。
 * 明度方向：A「內容白·外框深」/ B「外框白·內容深」。桌布(頁面)不隨方向變。
 * 卡牌用真插畫，詞語分詞不換行。此頁不影響正式遊戲；一律繁體。
 */
import { useId, useState } from 'react';
import { QUESTIONS } from '@/data/questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { DIMENSIONS, Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

const SAMPLES = DIMENSIONS.map((d) => QUESTIONS.find((q) => q.dimension === d)!).filter(Boolean);
type Tri = [string, string, string];
type Dir = 'A' | 'B';

// ── 配色 token：每款含 light(近白) + mid(中) 兩個明度，方向決定外框/內容取誰 ──
type Scheme = {
  id: string; name: string; nameEn: string;
  page: string;                       // 桌布(白一些，不隨方向變)
  ink: string; inkSoft: string; muted: string;
  panel: string; panelSoft: string; line: string; lineSoft: string;
  gold: string; goldSoft: string;
  light: Tri; mid: Tri;               // 同色系兩明度
  cardLine: string; cardLineSoft: string; cardInk: string;
  huRed: string; huRed2: string; pong: string; pong2: string;
  panelShadow: string; cardShadow: string; btnShadow: string;
};

const SCHEMES: Scheme[] = [
  {
    id: 'paper', name: '暖紙米白', nameEn: 'Warm Paper',
    page: 'radial-gradient(circle at 50% -8%, rgba(195,154,82,0.14), transparent 48%), linear-gradient(180deg,#f4edd9 0%,#ede5cd 46%,#e6ddc3 100%)',
    ink: '#3a3020', inkSoft: '#6b5a3f', muted: '#9a8a68',
    panel: '#fdf9f0', panelSoft: '#f7f0e2', line: 'rgba(150,118,78,0.28)', lineSoft: 'rgba(150,118,78,0.16)',
    gold: '#c39a52', goldSoft: 'rgba(195,154,82,0.16)',
    light: ['#fdf8f1', '#f8f1e4', '#f2ead9'], mid: ['#eaddc4', '#e3d5b8', '#dccdae'],
    cardLine: '#9a7448', cardLineSoft: 'rgba(154,116,72,0.7)', cardInk: '#3a3020',
    huRed: '#c9603f', huRed2: '#ad4930', pong: '#cca659', pong2: '#b3843c',
    panelShadow: '0 10px 26px rgba(120,90,50,0.12), 0 2px 5px rgba(120,90,50,0.08)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(90,60,30,0.26)) drop-shadow(0 4px 8px rgba(90,60,30,0.18))',
    btnShadow: '0 12px 26px rgba(150,70,40,0.3), inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -3px 6px rgba(0,0,0,0.14)',
  },
  {
    id: 'clean', name: '冷淨白學術', nameEn: 'Clean Academic',
    page: 'radial-gradient(circle at 50% -8%, rgba(74,112,143,0.11), transparent 48%), linear-gradient(180deg,#eef2f6 0%,#e6ecf1 46%,#dee6ec 100%)',
    ink: '#2a333c', inkSoft: '#4f5a64', muted: '#8a949d',
    panel: '#ffffff', panelSoft: '#f2f5f8', line: 'rgba(60,80,100,0.16)', lineSoft: 'rgba(60,80,100,0.09)',
    gold: '#4a708f', goldSoft: 'rgba(74,112,143,0.13)',
    light: ['#ffffff', '#f8fafc', '#f1f5f8'], mid: ['#e7ecf1', '#e0e6ec', '#d8e0e6'],
    cardLine: '#6b8299', cardLineSoft: 'rgba(107,130,153,0.62)', cardInk: '#2a333c',
    huRed: '#c76048', huRed2: '#a94a34', pong: '#5482a1', pong2: '#3f6a89',
    panelShadow: '0 10px 26px rgba(50,70,90,0.1), 0 2px 5px rgba(50,70,90,0.07)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(40,60,80,0.2)) drop-shadow(0 4px 8px rgba(40,60,80,0.14))',
    btnShadow: '0 12px 26px rgba(50,90,120,0.26), inset 0 1.5px 0 rgba(255,255,255,0.34), inset 0 -3px 6px rgba(0,0,0,0.12)',
  },
  {
    id: 'clay', name: '柔粉陶土', nameEn: 'Soft Clay',
    page: 'radial-gradient(circle at 50% -8%, rgba(196,87,58,0.12), transparent 48%), linear-gradient(180deg,#f5e6d7 0%,#efdccb 46%,#e9d4c1 100%)',
    ink: '#3d2a22', inkSoft: '#6f4f42', muted: '#a5836f',
    panel: '#fdf6f0', panelSoft: '#f8e9e0', line: 'rgba(160,90,65,0.24)', lineSoft: 'rgba(160,90,65,0.14)',
    gold: '#c05a3c', goldSoft: 'rgba(192,90,60,0.14)',
    light: ['#fef8f2', '#f9ece2', '#f3e0d3'], mid: ['#eeddca', '#e8d4bd', '#e1cbb2'],
    cardLine: '#9a5540', cardLineSoft: 'rgba(154,85,64,0.7)', cardInk: '#3d2a22',
    huRed: '#c85a3f', huRed2: '#ab4530', pong: '#c98a4a', pong2: '#ad6f34',
    panelShadow: '0 10px 26px rgba(150,80,55,0.13), 0 2px 5px rgba(150,80,55,0.09)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(120,60,40,0.24)) drop-shadow(0 4px 8px rgba(120,60,40,0.16))',
    btnShadow: '0 12px 26px rgba(160,70,45,0.3), inset 0 1.5px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.14)',
  },
  {
    id: 'sage', name: '森林鼠尾草', nameEn: 'Forest Sage',
    page: 'radial-gradient(circle at 50% -8%, rgba(125,138,69,0.11), transparent 48%), linear-gradient(180deg,#edeeda 0%,#e4e6cd 46%,#dcdfc2 100%)',
    ink: '#33361f', inkSoft: '#5c5f38', muted: '#8b8e5f',
    panel: '#f9faee', panelSoft: '#f1f3e2', line: 'rgba(95,100,55,0.24)', lineSoft: 'rgba(95,100,55,0.14)',
    gold: '#7d8a45', goldSoft: 'rgba(125,138,69,0.15)',
    light: ['#fbfbf3', '#f4f5e9', '#ecefdb'], mid: ['#dde0c6', '#d5d9bb', '#ccd1ad'],
    cardLine: '#6e7440', cardLineSoft: 'rgba(110,116,64,0.66)', cardInk: '#33361f',
    huRed: '#c0553c', huRed2: '#a5442d', pong: '#8a9a4e', pong2: '#6f8038',
    panelShadow: '0 10px 26px rgba(90,100,55,0.12), 0 2px 5px rgba(90,100,55,0.08)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(70,80,40,0.22)) drop-shadow(0 4px 8px rgba(70,80,40,0.15))',
    btnShadow: '0 12px 26px rgba(100,110,50,0.28), inset 0 1.5px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.13)',
  },
  {
    id: 'lavender', name: '薰衣草灰', nameEn: 'Lavender Grey',
    page: 'radial-gradient(circle at 50% -8%, rgba(138,107,168,0.11), transparent 48%), linear-gradient(180deg,#efeaf3 0%,#e7e0ec 46%,#ded6e6 100%)',
    ink: '#332b3a', inkSoft: '#5a4f62', muted: '#8d8397',
    panel: '#fdfbfe', panelSoft: '#f4f0f6', line: 'rgba(95,75,110,0.2)', lineSoft: 'rgba(95,75,110,0.12)',
    gold: '#8a6ba8', goldSoft: 'rgba(138,107,168,0.15)',
    light: ['#fdfbfe', '#f7f3f9', '#f0eaf4'], mid: ['#e3dbe8', '#dbd1e1', '#d1c6d9'],
    cardLine: '#7b6299', cardLineSoft: 'rgba(123,98,153,0.6)', cardInk: '#332b3a',
    huRed: '#c15c6f', huRed2: '#a5455a', pong: '#9075ad', pong2: '#755a92',
    panelShadow: '0 10px 26px rgba(90,70,110,0.12), 0 2px 5px rgba(90,70,110,0.08)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(70,55,90,0.2)) drop-shadow(0 4px 8px rgba(70,55,90,0.14))',
    btnShadow: '0 12px 26px rgba(100,75,130,0.26), inset 0 1.5px 0 rgba(255,255,255,0.32), inset 0 -3px 6px rgba(0,0,0,0.12)',
  },
  {
    id: 'caramel', name: '焦糖蜜', nameEn: 'Caramel Honey',
    page: 'radial-gradient(circle at 50% -8%, rgba(181,130,46,0.14), transparent 48%), linear-gradient(180deg,#f2e6c6 0%,#ecddb6 46%,#e5d5a9 100%)',
    ink: '#3d3117', inkSoft: '#6e5a2f', muted: '#9e8850',
    panel: '#fdf8ea', panelSoft: '#f7efd6', line: 'rgba(140,105,45,0.26)', lineSoft: 'rgba(140,105,45,0.15)',
    gold: '#b5822e', goldSoft: 'rgba(181,130,46,0.16)',
    light: ['#fdf7e5', '#f8efd4', '#f2e6c4'], mid: ['#e6d0a0', '#dfc794', '#d7bd87'],
    cardLine: '#8a6330', cardLineSoft: 'rgba(138,99,48,0.72)', cardInk: '#3d3117',
    huRed: '#c9603f', huRed2: '#ad4930', pong: '#c89434', pong2: '#ab7524',
    panelShadow: '0 10px 26px rgba(130,95,40,0.14), 0 2px 5px rgba(130,95,40,0.1)',
    cardShadow: 'drop-shadow(0 16px 26px rgba(110,80,30,0.24)) drop-shadow(0 4px 8px rgba(110,80,30,0.16))',
    btnShadow: '0 12px 26px rgba(150,105,35,0.3), inset 0 1.5px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.14)',
  },
];

// 方向决定：外框(shell) / 内容(content)
function tones(s: Scheme, dir: Dir): { shell: Tri; content: Tri } {
  return dir === 'A' ? { shell: s.mid, content: s.light } : { shell: s.light, content: s.mid };
}

// ── 卡框几何 ──
const M = 18, R = 400 - M;
const ARCH = `M${M},418 L${M},110 C${M},52 105,30 200,22 C295,30 ${R},52 ${R},110 L${R},418 Z`;
const ARCH_INNER = `M${M + 7},414 L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},414`;
function spark(cx: number, cy: number, sz: number) {
  const k = sz * 0.28;
  return `M${cx},${cy - sz} C${cx},${cy - k} ${cx + k},${cy} ${cx + sz},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + sz} C${cx},${cy + k} ${cx - k},${cy} ${cx - sz},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - sz} Z`;
}
function renderLabel(text: string): React.ReactNode {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) return text;
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  return Array.from(seg.segment(text)).map((p, i) =>
    p.isWordLike ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{p.segment}</span> : <span key={i}>{p.segment}</span>,
  );
}

function Card({ s, dir, imageSrc, statement, term, definition, width = 132, revealed }: {
  s: Scheme; dir: Dir; imageSrc?: string; statement?: string; term?: string; definition?: string; width?: number; revealed?: Dimension;
}) {
  const uid = useId().replace(/:/g, '');
  const bgId = `bg-${uid}`, phId = `ph-${uid}`, archId = `arch-${uid}`;
  const isKnow = !!definition;
  const { shell, content } = tones(s, dir);
  return (
    <div style={{ width, containerType: 'inline-size', flexShrink: 0 }}>
      <div style={{ aspectRatio: '4 / 7', position: 'relative', filter: s.cardShadow }}>
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
          {!isKnow && (
            <g clipPath={`url(#${archId})`}>
              <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
              {imageSrc && <image href={imageSrc} x={M} y="20" width={R - M} height="400" preserveAspectRatio="xMidYMid slice" />}
            </g>
          )}
          {isKnow && (() => {
            const PX = 200, PY = 16, d2r = Math.PI / 180;
            const angles = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
            const radii = [120, 188, 256, 324, 392];
            return (
              <g clipPath={`url(#${archId})`}>
                <rect x={M} y="20" width={R - M} height="400" fill={`url(#${phId})`} />
                {angles.map((deg, i) => {
                  const a = deg * d2r;
                  return <line key={`ray${i}`} x1={PX} y1={PY} x2={PX + Math.sin(a) * 470} y2={PY + Math.cos(a) * 470} stroke={s.gold} strokeWidth={0.9} opacity={0.14} />;
                })}
                {radii.map((r, j) => (<circle key={`arc${j}`} cx={PX} cy={PY} r={r} fill="none" stroke={s.gold} strokeWidth={1} opacity={0.16} />))}
                {angles.flatMap((deg, i) => {
                  const a = deg * d2r;
                  return radii.map((r, j) => (<circle key={`dot${i}-${j}`} cx={PX + Math.sin(a) * r} cy={PY + Math.cos(a) * r} r={2.4} fill={s.gold} opacity={0.5} />));
                })}
              </g>
            );
          })()}
          <path d={ARCH} fill="none" stroke={s.cardLine} strokeWidth="3" />
          <path d={ARCH_INNER} fill="none" stroke={s.cardLineSoft} strokeWidth="1.6" opacity="0.85" />
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={s.cardLine} strokeWidth="3" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={s.cardLineSoft} strokeWidth="1.6" opacity="0.8" />
          <path d={spark(200, 10, 9)} fill={s.gold} />
          <path d="M200,13 l11,11 l-11,11 l-11,-11 Z" fill={s.gold} />
          <line x1="150" y1="24" x2="184" y2="24" stroke={s.cardLine} strokeWidth="1.6" />
          <line x1="216" y1="24" x2="250" y2="24" stroke={s.cardLine} strokeWidth="1.6" />
          <path d={spark(40, 54, 9)} fill={s.gold} /><path d={spark(360, 54, 9)} fill={s.gold} />
          <path d={spark(40, 646, 9)} fill={s.gold} /><path d={spark(360, 646, 9)} fill={s.gold} />
          <line x1="56" y1="432" x2="184" y2="432" stroke={s.cardLineSoft} strokeWidth="1.3" />
          <path d="M200,423 l9,9 l-9,9 l-9,-9 Z" fill={s.gold} />
          <line x1="216" y1="432" x2="344" y2="432" stroke={s.cardLineSoft} strokeWidth="1.3" />
          {/* 文字框底：內容色 */}
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill={content[0]} />
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill="none" stroke={s.cardLineSoft} strokeWidth="2" />
          <path d={`M${M + 10},474 V462 a4,4 0 0 1 4,-4 H${M + 26}`} fill="none" stroke={s.cardLine} strokeWidth="2" />
          <path d={`M${R - 10},474 V462 a4,4 0 0 0 -4,-4 H${R - 26}`} fill="none" stroke={s.cardLine} strokeWidth="2" />
          <path d={`M${M + 10},648 V660 a4,4 0 0 0 4,4 H${M + 26}`} fill="none" stroke={s.cardLine} strokeWidth="2" />
          <path d={`M${R - 10},648 V660 a4,4 0 0 1 -4,4 H${R - 26}`} fill="none" stroke={s.cardLine} strokeWidth="2" />
          <path d="M192,448 l8,-8 l8,8 l-8,8 Z" fill={s.gold} />
        </svg>
        {isKnow && (
          <div className="psy-serif" style={{ position: 'absolute', left: '11%', right: '11%', top: '7%', height: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ color: s.cardInk, fontSize: '11cqw', fontWeight: 600, lineHeight: 1.3 }}>{renderLabel(term ?? '')}</p>
          </div>
        )}
        <div className="psy-serif" style={{ position: 'absolute', left: '9%', right: '9%', top: '64.5%', height: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ color: s.cardInk, fontWeight: 600, fontSize: isKnow ? '8.6cqw' : '10cqw', lineHeight: 1.28, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{isKnow ? definition : renderLabel(statement ?? '')}</p>
        </div>
        {revealed && (
          <div style={{ position: 'absolute', left: '50%', top: '58.5%', transform: 'translate(-50%,-50%)', zIndex: 20 }}>
            <span className="psy-serif" style={{ display: 'inline-flex', alignItems: 'center', padding: '2.6cqw 6cqw', fontSize: '8cqw', fontWeight: 700, letterSpacing: '0.06em', borderRadius: 999, background: DIMENSION_META[revealed].colorHex, color: '#1a1a1a', border: '1.5px solid rgba(0,0,0,0.28)', boxShadow: '0 1.5cqw 3cqw rgba(0,0,0,0.22)', whiteSpace: 'nowrap' }}>{DIMENSION_META[revealed].name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerPanel({ s, emoji, name, count }: { s: Scheme; emoji: string; name: string; count: number }) {
  return (
    <div style={{ background: s.panel, border: `1px solid ${s.line}`, borderRadius: 18, padding: '14px 18px', boxShadow: s.panelShadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.ink }}>{name}</div>
            <div style={{ fontSize: 12, color: s.muted }}>{count} 張</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 1.5 }}>
          {Array.from({ length: 7 }).map((_, i) => (<span key={i} style={{ width: 4, height: 26, borderRadius: 2, background: s.goldSoft, border: `1px solid ${s.lineSoft}` }} />))}
        </div>
      </div>
      <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 10, background: s.panelSoft, border: `1px solid ${s.lineSoft}`, fontSize: 12.5, color: s.muted }}>
        <span style={{ color: s.inkSoft, fontWeight: 600 }}>歸檔</span>　暫無公開歸檔
      </div>
    </div>
  );
}

function DimChip({ s, d, val }: { s: Scheme; d: Dimension; val: string }) {
  const meta = DIMENSION_META[d];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, padding: '5px 11px', borderRadius: 999, background: s.panel, color: s.inkSoft, border: `1px solid ${s.line}`, boxShadow: '0 2px 5px rgba(90,70,40,0.06)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: meta.colorHex }} />
      {meta.name}<b style={{ color: s.ink, fontVariantNumeric: 'tabular-nums' }}>{val}</b>
    </span>
  );
}

function ActionBtn({ label, c1, c2, shadow }: { label: string; c1: string; c2: string; shadow: string }) {
  return (
    <span style={{ padding: '13px 34px', borderRadius: 999, fontSize: 16, fontWeight: 700, color: '#fff9f3', background: `linear-gradient(180deg, ${c1}, ${c2})`, boxShadow: shadow, letterSpacing: '0.04em', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>{label}</span>
  );
}

export default function LightModeScenePage() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<Dir>('A');
  const s = SCHEMES[idx];
  const needs = ['4張', '2張', '4張', '4張', '3張'];

  return (
    <div style={{ minHeight: '100vh', background: s.page, color: s.ink, padding: '18px 24px 60px', transition: 'background 200ms ease' }}>
      {/* 顶栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, background: s.panel, border: `1px solid ${s.line}`, fontSize: 13.5, color: s.inkSoft, boxShadow: s.panelShadow }}>← 退出對局</span>
        <span className="psy-serif" style={{ fontSize: 14, letterSpacing: '0.5em', color: s.muted, paddingRight: 8 }}>人 格 麻 將</span>
      </div>

      {/* 两级切换器：配色 + 明度方向 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginBottom: 26 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
          {SCHEMES.map((sc, i) => (
            <button key={sc.id} onClick={() => setIdx(i)} style={{
              padding: '7px 15px', borderRadius: 999, fontSize: 13, cursor: 'pointer', fontWeight: idx === i ? 700 : 500,
              background: idx === i ? sc.gold : sc.panel, color: idx === i ? '#fff9f0' : sc.inkSoft,
              border: `1px solid ${idx === i ? sc.gold : sc.line}`, boxShadow: idx === i ? '0 6px 16px rgba(120,80,40,0.2)' : 'none', transition: 'all 150ms ease',
            }}>{sc.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: s.muted, marginRight: 2 }}>明度方向：</span>
          {([['A', '內容白·外框深'], ['B', '外框白·內容深']] as [Dir, string][]).map(([dv, lab]) => (
            <button key={dv} onClick={() => setDir(dv)} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', fontWeight: dir === dv ? 700 : 500,
              background: dir === dv ? s.goldSoft : 'transparent', color: dir === dv ? s.gold : s.muted,
              border: `1px solid ${dir === dv ? s.gold : s.line}`, transition: 'all 150ms ease',
            }}>{lab}</button>
          ))}
        </div>
      </div>

      {/* 玩家面板 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginBottom: 26 }}>
        <PlayerPanel s={s} emoji="🧑‍🎓" name="Brian" count={12} />
        <PlayerPanel s={s} emoji="👩‍🏫" name="Prof. Chen" count={16} />
        <PlayerPanel s={s} emoji="👴" name="Lin" count={15} />
      </div>

      {/* 中部 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 20, marginBottom: 24 }}>
        <div style={{ maxWidth: 260 }}>
          <div style={{ background: s.panel, border: `1px solid ${s.line}`, borderRadius: 16, padding: 16, boxShadow: s.panelShadow }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: s.ink, marginBottom: 10 }}>歸檔記錄</div>
            <div style={{ padding: '18px 12px', textAlign: 'center', borderRadius: 10, background: s.panelSoft, border: `1px dashed ${s.line}`, fontSize: 12.5, color: s.muted }}>暫無完成的歸檔</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 116, aspectRatio: '4/7', borderRadius: 16, background: `linear-gradient(180deg, ${tones(s, dir).shell[0]}, ${tones(s, dir).shell[2]})`, border: `2px solid ${s.gold}`, boxShadow: `0 0 0 4px ${s.goldSoft}, ${s.panelShadow}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ color: s.gold, fontSize: 26 }}>◈</span>
              <span className="psy-serif" style={{ fontSize: 12, letterSpacing: '0.34em', color: s.inkSoft }}>DRAW</span>
            </div>
            <div style={{ fontSize: 12.5, color: s.inkSoft, marginTop: 8 }}>剩餘 33 張</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 116, aspectRatio: '4/7', borderRadius: 16, border: `1.5px dashed ${s.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.muted, fontSize: 13 }}>棄牌堆</div>
            <div style={{ fontSize: 12.5, color: s.inkSoft, marginTop: 8 }}>已棄 0 張</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', maxWidth: 280 }}>
          <div style={{ background: s.panel, border: `1px solid ${s.line}`, borderRadius: 16, padding: 16, boxShadow: s.panelShadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: s.ink }}>行動記錄</span>
              <span style={{ fontSize: 12, color: s.gold }}>查看全部</span>
            </div>
            <div style={{ fontSize: 12.5, color: s.muted }}>暫無線索流動</div>
          </div>
        </div>
      </div>

      {/* 目标张数 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
        <div className="psy-serif" style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: s.muted, marginBottom: 7 }}>目標張數 · Target</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
          {DIMENSIONS.map((d, i) => <DimChip key={d} s={s} d={d} val={needs[i]} />)}
          <span style={{ fontSize: 12.5, padding: '5px 12px', borderRadius: 999, background: s.goldSoft, color: s.gold, border: `1px solid ${s.line}`, fontWeight: 700 }}>完成 0/5</span>
        </div>
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 30 }}>
        <ActionBtn label="食胡" c1={s.huRed} c2={s.huRed2} shadow={s.btnShadow} />
        <ActionBtn label="自摸碰" c1={s.pong} c2={s.pong2} shadow={s.btnShadow} />
      </div>

      {/* 手牌 */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto' }}>
        {SAMPLES.map((q) => (<Card key={q.id} s={s} dir={dir} imageSrc={`/cards/${q.id}.webp`} statement={q.text} revealed={q.dimension as Dimension} width={132} />))}
        <Card s={s} dir={dir} term={KNOWLEDGE_CARDS[0].termZh} definition={KNOWLEDGE_CARDS[0].definitionZh} width={132} />
      </div>

      {/* 说明 */}
      <div style={{ maxWidth: 860, margin: '34px auto 0', padding: '16px 20px', borderRadius: 14, background: s.panel, border: `1px solid ${s.line}`, fontSize: 12.5, lineHeight: 1.7, color: s.inkSoft, boxShadow: s.panelShadow }}>
        <b style={{ color: s.gold }}>6 款配色 × 2 明度方向 = 12 個方案：</b>
        暖紙米白／冷淨白學術／柔粉陶土／森林鼠尾草／薰衣草灰／焦糖蜜。每款可切「內容白·外框深」或「外框白·內容深」看層次。桌布不隨方向變。選定後我落地成雙主題切換。
      </div>
    </div>
  );
}
