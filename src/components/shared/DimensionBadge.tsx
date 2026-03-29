'use client';

import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface DimensionBadgeProps {
  dimension: Dimension;
  size?: 'sm' | 'md';
}

export function DimensionBadge({ dimension, size = 'sm' }: DimensionBadgeProps) {
  const meta = DIMENSION_META[dimension];
  const sizeClasses = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-bold ${sizeClasses}`}
      style={{ backgroundColor: meta.colorHex + '25', color: meta.colorHex }}
    >
      {dimension}
    </span>
  );
}
