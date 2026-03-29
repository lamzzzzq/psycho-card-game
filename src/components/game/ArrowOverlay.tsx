'use client';

import { useEffect, useState } from 'react';

interface ArrowOverlayProps {
  from: { x: number; y: number } | null;
  color?: string;
}

export function ArrowOverlay({ from, color = '#a855f7' }: ArrowOverlayProps) {
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!from) {
      setMouse(null);
      return;
    }
    const onMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [from]);

  if (!from || !mouse) return null;

  const dx = mouse.x - from.x;
  const dy = mouse.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 15) return null;

  // Dynamic curve: stronger curve at shorter distances, flatter at long distances
  const nx = -dy / dist;
  const ny = dx / dist;
  const curveStrength = Math.min(dist * 0.25, 60) * (dy < 0 ? 1 : -1);

  // Two control points for cubic bezier (S-curve feel)
  const t1 = 0.3;
  const t2 = 0.7;
  const c1x = from.x + dx * t1 + nx * curveStrength * 0.6;
  const c1y = from.y + dy * t1 + ny * curveStrength * 0.6;
  const c2x = from.x + dx * t2 + nx * curveStrength * 0.3;
  const c2y = from.y + dy * t2 + ny * curveStrength * 0.3;

  // Arrowhead
  const angle = Math.atan2(mouse.y - c2y, mouse.x - c2x);
  const headLen = 10 + Math.min(dist * 0.03, 6);
  const h1x = mouse.x - headLen * Math.cos(angle - 0.35);
  const h1y = mouse.y - headLen * Math.sin(angle - 0.35);
  const h2x = mouse.x - headLen * Math.cos(angle + 0.35);
  const h2y = mouse.y - headLen * Math.sin(angle + 0.35);

  // Opacity based on distance
  const opacity = Math.min(dist / 80, 0.85);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    >
      {/* Glow */}
      <path
        d={`M ${from.x} ${from.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${mouse.x} ${mouse.y}`}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        opacity={opacity * 0.2}
      />
      {/* Main line */}
      <path
        d={`M ${from.x} ${from.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${mouse.x} ${mouse.y}`}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity={opacity}
        strokeDasharray={dist > 100 ? 'none' : '6 4'}
      />
      {/* Arrowhead */}
      <polygon
        points={`${mouse.x},${mouse.y} ${h1x},${h1y} ${h2x},${h2y}`}
        fill={color}
        opacity={opacity}
      />
      {/* Origin pulse */}
      <circle cx={from.x} cy={from.y} r="5" fill={color} opacity={opacity * 0.4}>
        <animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values={`${opacity * 0.4};${opacity * 0.15};${opacity * 0.4}`} dur="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
