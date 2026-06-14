'use client';

import { DIMENSION_META } from '@/data/dimensions';
import { Dimension } from '@/types';
import { Locale, STRINGS } from '@/lib/i18n';

interface ProgressBarProps {
  current: number;
  total: number;
  currentDimension: Dimension;
  locale: Locale;
}

export function ProgressBar({ current, total, currentDimension, locale }: ProgressBarProps) {
  const meta = DIMENSION_META[currentDimension];
  const percent = (current / total) * 100;
  const t = STRINGS[locale].assessment;
  const dimName = locale === 'en' ? meta.nameEn : meta.name;

  return (
    <div className="psy-panel psy-etched rounded-[1.35rem] p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="psy-serif tracking-[0.06em]" style={{ color: meta.colorHex }}>
          {meta.name} · {meta.nameEn}
        </span>
        <span className="text-[var(--psy-muted)]">
          {current} / {total}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(90deg, ${meta.colorHex}88 0%, ${meta.colorHex} 100%)`,
          }}
        />
      </div>
      <p className="text-xs leading-6 text-[var(--psy-ink-soft)]">
        {t.progressPrefix}<span className="psy-serif" style={{ color: meta.colorHex }}>{dimName}</span>{t.progressSuffix}
      </p>
    </div>
  );
}
