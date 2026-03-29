'use client';

import { motion } from 'framer-motion';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface DimensionBarProps {
  dimension: Dimension;
  score: number;
  delay?: number;
}

export function DimensionBar({ dimension, score, delay = 0 }: DimensionBarProps) {
  const meta = DIMENSION_META[dimension];
  const percent = (score / 5) * 100;
  const label = score >= 3.5 ? meta.highLabel : score <= 2.5 ? meta.lowLabel : '适中均衡';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
            style={{ backgroundColor: meta.colorHex + '20', color: meta.colorHex }}
          >
            {dimension}
          </span>
          <span className="text-sm font-medium text-gray-200">{meta.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-sm font-bold" style={{ color: meta.colorHex }}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: meta.colorHex }}
        />
      </div>
    </div>
  );
}
