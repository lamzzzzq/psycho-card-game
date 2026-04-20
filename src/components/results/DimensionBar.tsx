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
    <div className="psy-panel psy-etched space-y-3 rounded-[1.35rem] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="psy-serif inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold"
            style={{ backgroundColor: meta.colorHex + '10', color: meta.colorHex, borderColor: meta.colorHex + '33' }}
          >
            {dimension}
          </span>
          <div>
            <div className="psy-serif text-sm font-medium text-[var(--psy-ink)]">{meta.name}</div>
            <div className="text-[11px] text-[var(--psy-muted)]">{meta.nameEn}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="max-w-[8rem] text-right text-xs text-[var(--psy-ink-soft)]">{label}</span>
          <span className="psy-serif text-sm font-bold" style={{ color: meta.colorHex }}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${meta.colorHex}99, ${meta.colorHex})` }}
        />
      </div>
    </div>
  );
}
