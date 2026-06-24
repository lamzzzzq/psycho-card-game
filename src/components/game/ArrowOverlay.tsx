'use client';

import { useEffect, useReducer } from 'react';

interface Pt { x: number; y: number }
/** 传入「取点函数」而非静态坐标：每帧/滚动时实时读取元素当前视口位置，
 *  这样移动端滚动后箭头依然紧贴原始卡牌 → 目标牌堆，不会再「定死」在屏幕上。*/
type Anchor = (() => Pt | null) | null;

interface ArrowOverlayProps {
  from: Anchor;
  to: Anchor;
  color?: string;
}

export function ArrowOverlay({ from, to, color = '#c89b5d' }: ArrowOverlayProps) {
  // 箭头激活期间监听 scroll(capture，覆盖所有滚动容器)+resize，强制重算位置。
  const [, bump] = useReducer((n: number) => (n + 1) % 1_000_000, 0);
  useEffect(() => {
    if (!from || !to) return;
    const onChange = () => bump();
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [from, to]);

  if (!from || !to) return null;
  const f = from();
  const tpt = to();
  if (!f || !tpt) return null;

  const dx = tpt.x - f.x;
  const dy = tpt.y - f.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 15) return null;

  const nx = -dy / dist;
  const ny = dx / dist;
  const curveStrength = Math.min(dist * 0.18, 48) * (dy < 0 ? 1 : -1);

  const t1 = 0.3;
  const t2 = 0.7;
  const c1x = f.x + dx * t1 + nx * curveStrength * 0.6;
  const c1y = f.y + dy * t1 + ny * curveStrength * 0.6;
  const c2x = f.x + dx * t2 + nx * curveStrength * 0.3;
  const c2y = f.y + dy * t2 + ny * curveStrength * 0.3;

  const angle = Math.atan2(tpt.y - c2y, tpt.x - c2x);
  const headLen = 7 + Math.min(dist * 0.018, 3);
  const h1x = tpt.x - headLen * Math.cos(angle - 0.35);
  const h1y = tpt.y - headLen * Math.sin(angle - 0.35);
  const h2x = tpt.x - headLen * Math.cos(angle + 0.35);
  const h2y = tpt.y - headLen * Math.sin(angle + 0.35);

  const opacity = Math.min(dist / 120, 0.72);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    >
      {/* Soft guide glow */}
      <path
        d={`M ${f.x} ${f.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${tpt.x} ${tpt.y}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={opacity * 0.12}
        strokeDasharray="6 8"
      />
      {/* Main guide line */}
      <path
        d={`M ${f.x} ${f.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${tpt.x} ${tpt.y}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={opacity}
        strokeDasharray="5 7"
      />
      {/* Arrowhead */}
      <polygon
        points={`${tpt.x},${tpt.y} ${h1x},${h1y} ${h2x},${h2y}`}
        fill={color}
        opacity={opacity * 0.9}
      />
      {/* Origin pulse */}
      <circle cx={f.x} cy={f.y} r="3.5" fill={color} opacity={opacity * 0.35}>
        <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values={`${opacity * 0.35};${opacity * 0.12};${opacity * 0.35}`} dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
