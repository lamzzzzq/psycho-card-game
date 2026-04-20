'use client';

interface ArrowOverlayProps {
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
  color?: string;
}

export function ArrowOverlay({ from, to, color = '#c89b5d' }: ArrowOverlayProps) {
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 15) return null;

  const nx = -dy / dist;
  const ny = dx / dist;
  const curveStrength = Math.min(dist * 0.18, 48) * (dy < 0 ? 1 : -1);

  const t1 = 0.3;
  const t2 = 0.7;
  const c1x = from.x + dx * t1 + nx * curveStrength * 0.6;
  const c1y = from.y + dy * t1 + ny * curveStrength * 0.6;
  const c2x = from.x + dx * t2 + nx * curveStrength * 0.3;
  const c2y = from.y + dy * t2 + ny * curveStrength * 0.3;

  const angle = Math.atan2(to.y - c2y, to.x - c2x);
  const headLen = 7 + Math.min(dist * 0.018, 3);
  const h1x = to.x - headLen * Math.cos(angle - 0.35);
  const h1y = to.y - headLen * Math.sin(angle - 0.35);
  const h2x = to.x - headLen * Math.cos(angle + 0.35);
  const h2y = to.y - headLen * Math.sin(angle + 0.35);

  const opacity = Math.min(dist / 120, 0.72);

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
    >
      {/* Soft guide glow */}
      <path
        d={`M ${from.x} ${from.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${to.x} ${to.y}`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={opacity * 0.12}
        strokeDasharray="6 8"
      />
      {/* Main guide line */}
      <path
        d={`M ${from.x} ${from.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${to.x} ${to.y}`}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={opacity}
        strokeDasharray="5 7"
      />
      {/* Arrowhead */}
      <polygon
        points={`${to.x},${to.y} ${h1x},${h1y} ${h2x},${h2y}`}
        fill={color}
        opacity={opacity * 0.9}
      />
      {/* Origin pulse */}
      <circle cx={from.x} cy={from.y} r="3.5" fill={color} opacity={opacity * 0.35}>
        <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values={`${opacity * 0.35};${opacity * 0.12};${opacity * 0.35}`} dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
