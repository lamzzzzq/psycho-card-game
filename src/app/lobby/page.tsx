'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useGameStore } from '@/stores/useGameStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore } from '@/lib/i18n';
import { LOBBY_T } from '@/lib/i18n/lobby';
import { AI_PERSONAS } from '@/data/ai-personas';
import { AIDifficulty, RevealDifficulty } from '@/types';

export default function LobbyPage() {
  const router = useRouter();
  const { bigFiveScores } = useAssessmentStore();
  const { initGame } = useGameStore();

  // SSR/首屏用 zh 与服务端一致，hydrate 后切到持久化/?lang 的语言，避免 mismatch。
  const hydrated = useHydrated();
  const locale = useLocaleStore((st) => st.locale);
  const loc = hydrated ? locale : 'zh';
  const s = LOBBY_T[loc];

  const [difficulty, setDifficulty] = useState<AIDifficulty>('easy');
  const [totalRounds, setTotalRounds] = useState(10);
  const [revealDifficulty, setRevealDifficulty] = useState<RevealDifficulty>('hidden');

  if (!bigFiveScores) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="psy-panel psy-etched w-full max-w-md space-y-4 rounded-[1.8rem] p-8 text-center">
          <p className="psy-serif text-lg text-[var(--psy-ink)]">{s.needAssess.title}</p>
          <p className="text-sm text-[var(--psy-muted)]">{s.needAssess.body}</p>
          <button
            onClick={() => router.push('/assessment')}
            className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
          >
            {s.needAssess.startAssess}
          </button>
          <button
            onClick={() => router.push('/')}
            className="block mx-auto text-xs text-[var(--psy-muted)] underline decoration-[rgba(150,118,78,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            {s.needAssess.backHome}
          </button>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    initGame(bigFiveScores, { totalRounds, aiDifficulty: difficulty, revealDifficulty });
    router.push('/game');
  };

  const difficultyValues: AIDifficulty[] = ['easy', 'medium', 'hard'];
  const difficultyOptions = difficultyValues.map((value, i) => ({
    value,
    ...s.difficultyOptions[i],
  }));

  const roundValues = [5, 10, 15, 0];
  const roundOptions = roundValues.map((value, i) => ({
    value,
    label: s.roundOptions[i].label(value),
    desc: s.roundOptions[i].desc,
  }));

  const revealValues: RevealDifficulty[] = ['open', 'half', 'hidden'];
  const revealOptions = revealValues.map((value, i) => ({ value, ...s.revealOptions[i] }));

  return (
    // 移动端：内容顶部对齐 + 底部留白给 sticky CTA；桌面端垂直居中。
    <div className="flex flex-1 flex-col items-center px-4 pt-8 pb-28 sm:px-6 lg:justify-center lg:pb-8">
      <button
        onClick={() => router.push('/')}
        className="psy-btn psy-btn-ghost psy-serif fixed left-4 top-4 z-40 px-3.5 py-2 text-sm font-medium sm:left-8 sm:top-8"
      >
        {s.backHome}
      </button>
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <div className="psy-panel psy-etched rounded-[1.6rem] px-4 py-6 sm:rounded-[2rem] sm:px-10 sm:py-10">
          <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
            <div className="text-center space-y-2 sm:space-y-3">
              <div className="psy-serif text-[11px] tracking-[0.28em] text-[var(--psy-accent)]">BATTLE CHAMBER</div>
              <h1 className="psy-serif text-3xl text-[var(--psy-ink)] sm:text-5xl">{s.title}</h1>
              <p className="text-xs text-[var(--psy-muted)] sm:text-sm">{s.subtitle}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5 sm:space-y-6">
                <section className="space-y-2.5 sm:space-y-3">
                  <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">{s.difficultyLabel}</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {difficultyOptions.map((opt) => {
                      const active = difficulty === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setDifficulty(opt.value)}
                          aria-pressed={active}
                          className={`psy-tile ${active ? 'is-active' : ''}`}
                        >
                          <div className="psy-serif text-base text-[var(--psy-ink)] sm:text-lg">{opt.label}</div>
                          <div className="mt-1 text-[11px] leading-tight text-[var(--psy-muted)] sm:mt-2 sm:text-xs">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2.5 sm:space-y-3">
                  <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">{s.roundsLabel}</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    {roundOptions.map((r) => {
                      const active = totalRounds === r.value;
                      return (
                        <button
                          key={r.value}
                          onClick={() => setTotalRounds(r.value)}
                          aria-pressed={active}
                          className={`psy-tile ${active ? 'is-active' : ''}`}
                        >
                          <div className="psy-serif text-base text-[var(--psy-ink)] sm:text-lg">{r.label}</div>
                          <div className="mt-1 text-[11px] leading-tight text-[var(--psy-muted)] sm:mt-2 sm:text-xs">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-2.5 sm:space-y-3">
                  <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">{s.revealLabel}</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {revealOptions.map((opt) => {
                      const active = revealDifficulty === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setRevealDifficulty(opt.value)}
                          aria-pressed={active}
                          className={`psy-tile ${active ? 'is-active' : ''}`}
                        >
                          <div className="psy-serif text-base text-[var(--psy-ink)] sm:text-lg">{opt.label}</div>
                          <div className="mt-1 text-[11px] leading-tight text-[var(--psy-muted)] sm:mt-2 sm:text-xs">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className="space-y-2.5 sm:space-y-3">
                <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">{s.opponentsLabel}</label>
                {/* 移动端：3 列紧凑（头像+名字，简介隐藏）；sm+：完整卡片 */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
                  {AI_PERSONAS.map((p) => (
                    <div
                      key={p.id}
                      className="psy-panel psy-etched rounded-2xl p-2.5 text-center sm:rounded-[1.4rem] sm:p-4 lg:text-left"
                    >
                      <div className="flex flex-col items-center gap-2 sm:gap-3 lg:flex-row lg:items-start">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-accent-soft)] text-xl sm:h-12 sm:w-12 sm:text-2xl">
                          {p.avatar}
                        </div>
                        <div className="space-y-1">
                          <div className="psy-serif text-sm text-[var(--psy-ink)] sm:text-lg">{p.name}</div>
                          <div className="hidden text-xs leading-5 text-[var(--psy-muted)] sm:block">{p.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 開始對戰：移动端 sticky 底栏，桌面端静态居中。放在 motion.div 之外。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--psy-border)] bg-[rgba(253,249,240,0.92)] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(120,90,50,0.1)] backdrop-blur-md lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <button
          onClick={handleStart}
          className="psy-btn psy-btn-accent mx-auto block w-full max-w-md px-10 py-3 text-base font-semibold lg:w-auto lg:min-w-[20rem]"
        >
          {s.start}
        </button>
      </div>
    </div>
  );
}
