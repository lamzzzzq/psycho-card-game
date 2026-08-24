'use client';

import { Sd4Scores, Sd4Dimension, SD4_DIMENSIONS } from '@/data/sd4-types';
import { SD4_DIMENSION_META } from '@/data/sd4-dimensions';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

// 四轴雷達圖。與 HEXACO RadarChart 同款樣式，把 6 軸換成 4 軸（angle 用 /4，呈菱形）。
export function Sd4RadarChart({ scores, size = 280 }: { scores: Sd4Scores; size?: number }) {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const center = size / 2;
  const radius = size * 0.38;
  const levels = [1, 2, 3, 4, 5];
  const N = SD4_DIMENSIONS.length;

  const getPoint = (dimension: Sd4Dimension, value: number) => {
    const index = SD4_DIMENSIONS.indexOf(dimension);
    const angle = (Math.PI * 2 * index) / N - Math.PI / 2;
    const r = (value / 5) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const dataPoints = SD4_DIMENSIONS.map((d) => getPoint(d, scores[d]));
  const dataPath = dataPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

  // 4 軸時左右兩軸的標籤是水平長詞（馬基維利主義/Machiavellianism），
  // 比 HEXACO 更容易貼邊 → 橫向留白略加大。
  const padX = size * 0.26;
  const padY = size * 0.12;

  return (
    <div className="psy-panel psy-etched flex items-center justify-center rounded-[1.9rem] p-4 sm:p-5">
      <svg viewBox={`${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`} className="mx-auto w-full max-w-[440px]">
        <defs>
          <linearGradient id="sd4RadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c39a52" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#9a7448" stopOpacity="0.26" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={radius + 24} fill="none" stroke="rgba(154,116,72,0.28)" strokeWidth="1.2" />
        <circle cx={center} cy={center} r={radius + 8} fill="none" stroke="rgba(154,116,72,0.2)" strokeWidth="1.1" />

        {levels.map((level) => {
          const points = SD4_DIMENSIONS.map((d) => getPoint(d, level));
          const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';
          return <path key={level} d={path} fill="none" stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />;
        })}

        {SD4_DIMENSIONS.map((d) => {
          const point = getPoint(d, 5);
          return <line key={d} x1={center} y1={center} x2={point.x} y2={point.y} stroke="rgba(154, 116, 72, 0.16)" strokeWidth="1" />;
        })}

        <path d={dataPath} fill="url(#sd4RadarGradient)" stroke="#c39a52" strokeWidth="2.6" opacity={0.96} />

        {dataPoints.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="7" fill="rgba(211,163,100,0.12)" />
            <circle cx={p.x} cy={p.y} r="4" fill={SD4_DIMENSION_META[SD4_DIMENSIONS[i]].colorHex} />
          </g>
        ))}

        {SD4_DIMENSIONS.map((d) => {
          const meta = SD4_DIMENSION_META[d];
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
