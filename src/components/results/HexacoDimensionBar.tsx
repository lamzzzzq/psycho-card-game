'use client';

import { motion } from 'framer-motion';
import { HexacoDimension } from '@/data/hexaco-types';
import { HEXACO_DIMENSION_META } from '@/data/hexaco-dimensions';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

// HEXACO 維度分數條。與大五 DimensionBar 同款；圓標顯示維度字母（H/E/X/A/C/O）。
export function HexacoDimensionBar({
  dimension,
  score,
  delay = 0,
}: {
  dimension: HexacoDimension;
  score: number;
  delay?: number;
}) {
  const meta = HEXACO_DIMENSION_META[dimension];
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const en = locale === 'en';
  const percent = (score / 5) * 100;

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
            <div className="psy-serif text-sm font-medium text-[var(--psy-ink)]">{en ? meta.nameEn : meta.name}</div>
            {!en && <div className="text-[11px] text-[var(--psy-muted)]">{meta.nameEn}</div>}
          </div>
        </div>
        <span className="psy-serif text-sm font-bold" style={{ color: meta.colorHex }}>
          {score.toFixed(1)}
        </span>
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
