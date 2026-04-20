'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, getProgress } = useAssessmentStore();
  const progress = getProgress();
  const hasResults = hydrated && bigFiveScores !== null;
  const features = [
    { glyph: '✦', title: '人格抽样', note: '60 道陈述题，提取五维倾向' },
    { glyph: '◈', title: '心理牌局', note: '用线索牌判断人格归属' },
    { glyph: '☽', title: '对局镜像', note: 'AI 与真人都会暴露决策痕迹' },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-10"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="psy-serif text-xs uppercase tracking-[0.42em] text-[var(--psy-ink-soft)]">
                Psychological Arcana Deck
              </p>
              <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">
                PsychoCard
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--psy-ink-soft)]">
                把人格测评、心理线索判断与卡牌对战编织在一起。先读懂自己，再在牌桌上读懂别人。
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-[var(--psy-muted)]">
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                五维人格映射
              </span>
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                塔罗式卡牌视觉
              </span>
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                单机 / 联机双模式
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="psy-panel psy-etched rounded-[1.4rem] p-4">
                  <div className="mb-3 text-xl text-[var(--psy-accent)]">{item.glyph}</div>
                  <div className="psy-serif text-base text-[var(--psy-ink)]">{item.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--psy-ink-soft)]">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              <div className="psy-panel psy-etched rounded-[2rem] p-6">
                <div className="mb-5 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-[var(--psy-muted)]">
                  <span>人格牌阵</span>
                  <span>No. 0</span>
                </div>
                <div className="rounded-[1.7rem] border border-[rgba(200,155,93,0.26)] bg-[linear-gradient(180deg,rgba(20,31,45,0.96),rgba(11,18,28,0.98))] p-6">
                  <div className="mb-6 flex items-center justify-center gap-4 text-[var(--psy-accent)]">
                    <span className="text-xl">☉</span>
                    <span className="text-3xl">◈</span>
                    <span className="text-xl">☽</span>
                  </div>
                  <div className="space-y-4 text-center">
                    <div>
                      <p className="psy-serif text-sm tracking-[0.25em] text-[var(--psy-ink-soft)]">ARCANA OF SELF</p>
                      <p className="mt-2 psy-serif text-2xl text-[var(--psy-ink)]">人格镜像</p>
                    </div>
                    <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
                      你的五维得分会转化成不同维度的收集目标。每一张牌，既是自我描述，也是对手留下的线索。
                    </p>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(200,155,93,0.18),transparent_68%)]" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr]">
          <button
            onClick={() => router.push('/pvp')}
            className="psy-serif block w-full rounded-full border border-[rgba(200,155,93,0.44)] bg-[linear-gradient(135deg,#9b6430_0%,#d4a469_100%)] px-6 py-3.5 text-base font-semibold text-[#fff7eb] transition hover:opacity-95 cursor-pointer"
          >
            联机对战
          </button>
          <button
            onClick={() => hasResults ? router.push('/lobby') : router.push('/assessment')}
            className="block w-full rounded-full border border-[rgba(200,155,93,0.24)] bg-[rgba(255,255,255,0.02)] px-6 py-3.5 font-medium text-[var(--psy-ink)] transition hover:bg-[rgba(200,155,93,0.08)] cursor-pointer"
          >
            单机对战{!hasResults && <span className="ml-2 text-xs text-[var(--psy-accent)]">需先测评</span>}
          </button>
          <button
            onClick={() => router.push('/assessment')}
            className="block w-full rounded-full border border-[rgba(200,155,93,0.24)] bg-[rgba(255,255,255,0.02)] px-6 py-3.5 font-medium text-[var(--psy-ink)] transition hover:bg-[rgba(200,155,93,0.08)] cursor-pointer"
          >
            {progress > 0 ? `继续测评 (${progress}/60)` : hasResults ? '重新测评' : '开始测评'}
          </button>
          {hasResults && (
            <button
              onClick={() => router.push('/results')}
              className="block w-full rounded-full border border-[rgba(200,155,93,0.24)] bg-[rgba(255,255,255,0.02)] px-6 py-3.5 font-medium text-[var(--psy-ink)] transition hover:bg-[rgba(200,155,93,0.08)] cursor-pointer"
            >
              查看人格报告
            </button>
          )}
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/stats')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            查看数据统计
          </button>
        </div>
      </motion.div>
    </div>
  );
}
