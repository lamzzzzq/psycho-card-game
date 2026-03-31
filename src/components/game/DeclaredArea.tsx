'use client';

import { DeclaredSet, DIMENSIONS, Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface DeclaredAreaProps {
  declaredSets: DeclaredSet[];
  compact?: boolean;
}

export function DeclaredArea({ declaredSets, compact = false }: DeclaredAreaProps) {
  if (declaredSets.length === 0) return null;

  const declaredDims = new Set(declaredSets.map((s) => s.dimension));

  return (
    <div className={`flex gap-1.5 ${compact ? 'flex-wrap' : ''}`}>
      {DIMENSIONS.map((d) => {
        const meta = DIMENSION_META[d];
        const set = declaredSets.find((s) => s.dimension === d);
        if (!set && compact) return null;

        return (
          <div
            key={d}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
              set ? '' : 'opacity-20'
            }`}
            style={{
              backgroundColor: set ? meta.colorHex + '25' : 'transparent',
              border: `1px solid ${set ? meta.colorHex + '40' : 'transparent'}`,
            }}
          >
            <span className="text-[9px]" style={{ color: meta.colorHex }}>
              {meta.name}
            </span>
            {set && (
              <span className="text-[9px] font-bold" style={{ color: meta.colorHex }}>
                ✓{set.cards.length}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
