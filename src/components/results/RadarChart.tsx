'use client';

import { BigFiveScores, Dimension, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

interface RadarChartProps {
  scores: BigFiveScores;
  size?: number;
}

export function RadarChart({ scores, size = 280 }: RadarChartProps) {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
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

  // viewBox 四周留白：五個維度標籤放在半徑外（尤其左右的神經質/盡責性 + 較長的英文），
  // 否則會超出 0~size 被裁掉。左右留多些、上下少些。
  const padX = size * 0.3;
  const padY = size * 0.14;

  return (
    <div className="psy-panel psy-etched rounded-[1.9rem] p-5">
      <svg
        viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`}
        className="mx-auto w-full max-w-[340px]"
      >
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c39a52" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#9a7448" stopOpacity="0.26" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius + 24} fill="none" stroke="rgba(154,116,72,0.28)" strokeWidth="1.2" />
        <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(154,116,72,0.2)" strokeWidth="1.1" />

        {levels.map((level) => {
          const points = DIMENSIONS.map((d) => getPoint(d, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
          return <path key={level} d={path} fill="none" stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />;
        })}

        {DIMENSIONS.map((d) => {
          const point = getPoint(d, 5);
          return (
            <line key={d} x1={center} y1={center} x2={point.x} y2={point.y} stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />
          );
        })}

        <path d={dataPath} fill="url(#radarGradient)" stroke="#c39a52" strokeWidth="2.6" opacity={0.96} />

        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="rgba(211,163,100,0.12)" />
            <circle cx={p.x} cy={p.y} r="4" fill={DIMENSION_META[DIMENSIONS[i]].colorHex} />
          </g>
        ))}

        {DIMENSIONS.map((d) => {
          const meta = DIMENSION_META[d];
          const point = getPoint(d, 6.0);
          return (
            <text
              key={d}
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`psy-serif font-medium ${locale === 'en' ? 'text-[10px]' : 'text-xs'}`}
              fill={meta.colorHex}
            >
              {locale === 'en' ? meta.nameEn : meta.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
