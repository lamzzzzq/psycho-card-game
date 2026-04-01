'use client';

import { DeclaredSet, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface DeclaredAreaProps {
  declaredSets: DeclaredSet[];
  compact?: boolean;
}

export function DeclaredArea({ declaredSets, compact = false }: DeclaredAreaProps) {
  if (declaredSets.length === 0) return null;

  if (compact) {
    // Compact mode for opponents — just badges
    return (
      <div className="flex gap-1 flex-wrap">
        {declaredSets.map((set) => {
          const meta = DIMENSION_META[set.dimension];
          return (
            <div
              key={set.dimension}
              className="flex items-center gap-0.5 rounded px-1 py-0.5"
              style={{
                backgroundColor: meta.colorHex + '25',
                border: `1px solid ${meta.colorHex}40`,
              }}
            >
              <span className="text-[8px]" style={{ color: meta.colorHex }}>
                {meta.name} ✓{set.cards.length}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full mode for human player — show actual mini cards grouped by dimension
  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {declaredSets.map((set) => {
        const meta = DIMENSION_META[set.dimension];
        return (
          <div key={set.dimension} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-medium" style={{ color: meta.colorHex }}>
              {meta.name} ✓
            </span>
            <div className="flex gap-0.5">
              {set.cards.map((card) => (
                <div
                  key={card.id}
                  className="w-10 h-14 rounded-md border flex items-center justify-center p-0.5"
                  style={{
                    backgroundColor: meta.colorHex + '15',
                    borderColor: meta.colorHex + '40',
                  }}
                >
                  <p className="text-[6px] leading-tight text-gray-400 text-center line-clamp-3">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
