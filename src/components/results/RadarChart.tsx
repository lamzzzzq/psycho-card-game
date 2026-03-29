'use client';

import { BigFiveScores, Dimension, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface RadarChartProps {
  scores: BigFiveScores;
  size?: number;
}

export function RadarChart({ scores, size = 280 }: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const levels = [1, 2, 3, 4, 5];

  const getPoint = (dimension: Dimension, value: number) => {
    const index = DIMENSIONS.indexOf(dimension);
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const r = (value / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const dataPoints = DIMENSIONS.map((d) => getPoint(d, scores[d]));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]">
      {/* Grid levels */}
      {levels.map((level) => {
        const points = DIMENSIONS.map((d) => getPoint(d, level));
        const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
        return <path key={level} d={path} fill="none" stroke="#374151" strokeWidth="1" opacity={0.5} />;
      })}

      {/* Axis lines */}
      {DIMENSIONS.map((d) => {
        const point = getPoint(d, 5);
        return (
          <line key={d} x1={center} y1={center} x2={point.x} y2={point.y} stroke="#374151" strokeWidth="1" opacity={0.5} />
        );
      })}

      {/* Data area */}
      <path d={dataPath} fill="url(#radarGradient)" stroke="#a855f7" strokeWidth="2" opacity={0.8} />
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={DIMENSION_META[DIMENSIONS[i]].colorHex} />
      ))}

      {/* Labels */}
      {DIMENSIONS.map((d) => {
        const meta = DIMENSION_META[d];
        const point = getPoint(d, 6.2);
        return (
          <text
            key={d}
            x={point.x}
            y={point.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium"
            fill={meta.colorHex}
          >
            {meta.name}
          </text>
        );
      })}
    </svg>
  );
}
