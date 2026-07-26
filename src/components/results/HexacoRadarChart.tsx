'use client';

import { HexacoScores, HexacoDimension, HEXACO_DIMENSIONS } from '@/data/hexaco-types';
import { HEXACO_DIMENSION_META } from '@/data/hexaco-dimensions';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

// 六轴雷達圖。與大五 RadarChart 同款樣式，只把 5 軸換成 6 軸（angle 用 /6）。
export function HexacoRadarChart({ scores, size = 280 }: { scores: HexacoScores; size?: number }) {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const center = size / 2;
  const radius = size * 0.38;
  const levels = [1, 2, 3, 4, 5];
  const N = HEXACO_DIMENSIONS.length;

  const getPoint = (dimension: HexacoDimension, value: number) => {
    const index = HEXACO_DIMENSIONS.indexOf(dimension);
    const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
    const r = (value / 5) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const dataPoints = HEXACO_DIMENSIONS.map((d) => getPoint(d, scores[d]));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

  const padX = size * 0.2;
  const padY = size * 0.12;

  return (
    <div className="psy-panel psy-etched flex items-center justify-center rounded-[1.9rem] p-4 sm:p-5">
      <svg viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`} className="mx-auto w-full max-w-[440px]">
        <defs>
          <linearGradient id="hexacoRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c39a52" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#9a7448" stopOpacity="0.26" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius + 24} fill="none" stroke="rgba(154,116,72,0.28)" strokeWidth="1.2" />
        <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(154,116,72,0.2)" strokeWidth="1.1" />

        {levels.map((level) => {
          const points = HEXACO_DIMENSIONS.map((d) => getPoint(d, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
          return <path key={level} d={path} fill="none" stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />;
        })}

        {HEXACO_DIMENSIONS.map((d) => {
          const point = getPoint(d, 5);
          return <line key={d} x1={center} y1={center} x2={point.x} y2={point.y} stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />;
        })}

        <path d={dataPath} fill="url(#hexacoRadarGradient)" stroke="#c39a52" strokeWidth="2.6" opacity={0.96} />

        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="rgba(211,163,100,0.12)" />
            <circle cx={p.x} cy={p.y} r="4" fill={HEXACO_DIMENSION_META[HEXACO_DIMENSIONS[i]].colorHex} />
          </g>
        ))}

        {HEXACO_DIMENSIONS.map((d) => {
          const meta = HEXACO_DIMENSION_META[d];
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
