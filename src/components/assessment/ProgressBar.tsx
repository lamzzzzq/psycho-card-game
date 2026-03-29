'use client';

import { DIMENSION_META } from '@/data/dimensions';
import { Dimension } from '@/types';

interface ProgressBarProps {
  current: number;
  total: number;
  currentDimension: Dimension;
}

export function ProgressBar({ current, total, currentDimension }: ProgressBarProps) {
  const meta = DIMENSION_META[currentDimension];
  const percent = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={meta.color}>
          {meta.name} ({meta.nameEn})
        </span>
        <span className="text-gray-500">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: meta.colorHex,
          }}
        />
      </div>
    </div>
  );
}
