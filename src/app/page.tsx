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
    { glyph: '✦', title: '自我評估', note: '先完成測評，得到你自己的五維傾向' },
    { glyph: '◈', title: '抽牌歸檔', note: '湊齊同一人格維度的手牌，公開歸檔' },
    { glyph: '☽', title: '識人破局', note: '對手的每張棄牌，都暴露了他的人格' },
  ];

  return (
    // 移动端：内容从顶部流动 + 底部留白给 sticky CTA 栏；桌面：垂直居中。
    <div className="flex flex-1 flex-col items-center px-5 pt-10 pb-40 sm:px-6 lg:justify-center lg:pb-10">
      <button
        onClick={() => router.push('/tutorial')}
        className="psy-btn psy-btn-accent psy-serif fixed right-4 top-4 z-40 px-4 py-2 text-sm font-semibold shadow-[0_16px_38px_rgba(0,0,0,0.32)] sm:right-8 sm:top-8"
      >
        玩法教學
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8 lg:space-y-10"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-3">
              <p className="psy-serif text-[10px] uppercase tracking-[0.42em] text-[var(--psy-ink-soft)] sm:text-xs">
                Personalities Mahjong
              </p>
              <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">
                人格麻將
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--psy-ink-soft)] sm:text-lg sm:leading-8">
                把人格測評、心理線索判斷與卡牌對戰編織在一起。先讀懂自己，再在牌桌上讀懂別人。
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-[var(--psy-muted)] sm:gap-3">
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                五維人格映射
              </span>
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                塔羅式卡牌視覺
              </span>
              <span className="rounded-full border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-1.5">
                單機 / 聯機雙模式
              </span>
            </div>

            {/* 移动端：紧凑横向行（icon + 文案）；sm+：原竖向卡片 */}
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="psy-panel psy-etched flex items-center gap-3 rounded-2xl p-3 sm:flex-col sm:items-start sm:gap-0 sm:rounded-[1.4rem] sm:p-4"
                >
                  <div className="shrink-0 text-xl text-[var(--psy-accent)] sm:mb-3">{item.glyph}</div>
                  <div className="min-w-0">
                    <div className="psy-serif text-sm text-[var(--psy-ink)] sm:text-base">{item.title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--psy-ink-soft)] sm:mt-2 sm:text-sm sm:leading-6">
                      {item.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 装饰牌阵：纯视觉，仅桌面右栏显示（移动端隐藏，避免占满一屏） */}
          <div className="hidden lg:flex lg:justify-end">
            <div className="relative w-full max-w-sm">
              <div className="psy-panel psy-etched rounded-[2rem] p-6">
                <div className="mb-5 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-[var(--psy-muted)]">
                  <span>人格牌陣</span>
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
                      <p className="mt-2 psy-serif text-2xl text-[var(--psy-ink)]">人格鏡像</p>
                    </div>
                    <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
                      你的五維得分會轉化成不同維度的收集目標。每一張牌，既是自我描述，也是對手留下的線索。
                    </p>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(200,155,93,0.18),transparent_68%)]" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主行动区：移动端固定底栏（拇指可达），桌面端回归内联网格。
          放在 motion.div 之外，避免 framer transform 祖先让 fixed 失效。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(200,155,93,0.18)] bg-[rgba(11,18,28,0.92)] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:mx-auto lg:mt-2 lg:w-full lg:max-w-5xl lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr] lg:gap-3">
          <button
            onClick={() => router.push('/pvp')}
            className="psy-btn psy-btn-accent psy-serif col-span-2 w-full px-6 py-3.5 text-base font-semibold lg:col-span-1"
          >
            聯機對戰
          </button>
          <button
            onClick={() => (hasResults ? router.push('/lobby') : router.push('/assessment'))}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            單機對戰{!hasResults && <span className="ml-1.5 text-xs text-[var(--psy-accent)]">需先測評</span>}
          </button>
          <button
            onClick={() => router.push('/assessment')}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {progress > 0 ? `繼續測評 (${progress}/60)` : hasResults ? '重新測評' : '開始測評'}
          </button>
          {hasResults && (
            <button
              onClick={() => router.push('/results')}
              className="psy-btn psy-btn-ghost col-span-2 w-full px-6 py-3 font-medium sm:py-3.5 lg:col-span-1"
            >
              查看人格報告
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
