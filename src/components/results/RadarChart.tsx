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
    <div className="psy-panel psy-etched rounded-[1.9rem] p-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]">
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d3a364" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#7aa2d6" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius + 24} fill="none" stroke="rgba(200,155,93,0.16)" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(200,155,93,0.1)" strokeWidth="1" />

        {levels.map((level) => {
          const points = DIMENSIONS.map((d) => getPoint(d, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
          return <path key={level} d={path} fill="none" stroke="rgba(226, 211, 184, 0.14)" strokeWidth="1" />;
        })}

        {DIMENSIONS.map((d) => {
          const point = getPoint(d, 5);
          return (
            <line key={d} x1={center} y1={center} x2={point.x} y2={point.y} stroke="rgba(226, 211, 184, 0.14)" strokeWidth="1" />
          );
        })}

        <path d={dataPath} fill="url(#radarGradient)" stroke="#d3a364" strokeWidth="2.2" opacity={0.92} />

        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="rgba(211,163,100,0.12)" />
            <circle cx={p.x} cy={p.y} r="4" fill={DIMENSION_META[DIMENSIONS[i]].colorHex} />
          </g>
        ))}

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
              className="psy-serif text-xs font-medium"
              fill={meta.colorHex}
            >
              {meta.name}
            </text>
          );
        })}

        <text x={center} y={center - 3} textAnchor="middle" className="psy-serif text-[12px]" fill="rgba(236,223,200,0.82)">
          Persona
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="psy-serif text-[18px]" fill="#d3a364">
          ✦
        </text>
      </svg>
    </div>
  );
}
