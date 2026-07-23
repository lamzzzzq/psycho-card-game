'use client';

// 游戏内「玩法教學 / How to Play」按钮：点开一个可关闭的居中模态，内容 = Key Rules
// （复用 RULES_T，与 /rules 打印页同源，中英文随 locale）。放在对局页右上角，
// 取代原本静态的「人格麻將」标题——让玩家对局中随时可复查规则，不用退出牌局。2026-07-24。

import { useState } from 'react';
import { RULES_T } from '@/lib/i18n/rules';
import { STRINGS, type Locale } from '@/lib/i18n';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

export function HowToPlayButton({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const label = STRINGS[locale].common.tutorial; // 玩法教學 / How to Play
  const s = RULES_T[locale];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-1 text-[10px] font-medium text-[var(--psy-ink-soft)] shadow-[0_8px_18px_rgba(96,72,38,0.1)] transition hover:border-[var(--psy-accent)] hover:text-[var(--psy-accent-strong)] sm:text-[11px]"
      >
        {label}
      </button>

      <PsyOverlayPanel open={open} onClose={() => setOpen(false)} title={label} variant="centered" locale={locale}>
        <div className="space-y-4 px-1 py-1 text-left">
          {s.sections.map((sec, si) => (
            <section key={si} className="space-y-1.5">
              <h3 className="psy-serif text-sm font-semibold text-[var(--psy-accent-strong)]">{sec.title}</h3>
              {sec.blocks.map((b, bi) => {
                if (b.t === 'sub') return <p key={bi} className="text-[13px] font-semibold text-[var(--psy-ink)]">{b.text}</p>;
                if (b.t === 'li') return (
                  <p key={bi} className="flex gap-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                    <span className="shrink-0 text-[var(--psy-accent)]">・</span>
                    <span>{b.text}</span>
                  </p>
                );
                if (b.t === 'warn') return <p key={bi} className="text-[13px] leading-6 text-[var(--psy-danger)]">{b.text}</p>;
                if (b.t === 'tip') return (
                  <p key={bi} className="rounded-lg border border-[rgba(200,155,93,0.3)] bg-[rgba(200,155,93,0.12)] px-3 py-2 text-[13px] leading-6 text-[var(--psy-accent-strong)]">
                    💡 {b.text}
                  </p>
                );
                return <p key={bi} className="text-[13px] leading-6 text-[var(--psy-ink-soft)]">{b.text}</p>;
              })}
            </section>
          ))}
        </div>
      </PsyOverlayPanel>
    </>
  );
}
