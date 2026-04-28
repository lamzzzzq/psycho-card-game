'use client';

import { useState, useEffect } from 'react';

// Locked language toggle. Only Chinese is implemented; English shows a
// "coming soon" hint when clicked. Full i18n migration is deferred.
export function LanguageToggle() {
  const [showLockHint, setShowLockHint] = useState(false);

  useEffect(() => {
    if (!showLockHint) return;
    const t = setTimeout(() => setShowLockHint(false), 2200);
    return () => clearTimeout(t);
  }, [showLockHint]);

  return (
    <div className="fixed right-3 top-3 z-40 flex items-center">
      <div
        className="flex items-center gap-1 rounded-full border p-0.5 text-[10px] backdrop-blur"
        style={{
          borderColor: 'rgba(200,155,93,0.22)',
          background: 'rgba(20,28,38,0.55)',
        }}
      >
        <button
          type="button"
          aria-pressed={true}
          className="psy-serif rounded-full px-2.5 py-1 font-medium text-[var(--psy-ink)]"
          style={{
            background: 'linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))',
            boxShadow: '0 6px 14px rgba(72,49,18,0.24)',
          }}
        >
          中文
        </button>
        <button
          type="button"
          aria-pressed={false}
          aria-disabled={true}
          onClick={() => setShowLockHint(true)}
          className="psy-serif flex items-center gap-1 rounded-full px-2.5 py-1 text-[var(--psy-muted)] transition hover:text-[var(--psy-ink-soft)]"
          title="即将上线"
        >
          <span>EN</span>
          <span aria-hidden>🔒</span>
        </button>
      </div>
      {showLockHint && (
        <div
          role="status"
          className="psy-serif ml-2 rounded-full border px-2.5 py-1 text-[10px] text-[var(--psy-ink-soft)] shadow"
          style={{ borderColor: 'rgba(200,155,93,0.22)', background: 'rgba(20,28,38,0.85)' }}
        >
          英文版即将上线
        </div>
      )}
    </div>
  );
}
