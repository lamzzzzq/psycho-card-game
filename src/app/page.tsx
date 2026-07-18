'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { QUESTIONS } from '@/data/questions';
import { Footer } from '@/components/shared/Footer';
import { DeckSelectModal } from '@/components/shared/DeckSelectModal';
import { renderCjkKeep } from '@/lib/renderCjk';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, getProgress } = useAssessmentStore();
  const progress = getProgress();
  const hasResults = hydrated && bigFiveScores !== null;
  // SSR/首屏用 zh 与服务端一致，hydrate 后切到持久化/?lang 的语言，避免 mismatch。
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const loc = hydrated ? locale : 'zh';
  const t = STRINGS[loc].home;
  const c = STRINGS[loc].common;
  const features = t.features;
  // 牌堆选择模态：点「玩法教学」或「开始测评」先弹三牌堆入口（仅 Big Five 可选），
  // 选后再去对应页面。deckModalFor 记录去向。
  const [deckModalFor, setDeckModalFor] = useState<'tutorial' | 'assessment' | 'report' | 'pvp' | 'solo' | null>(null);

  // 自愈：已完成报告却残留半截答案 = 放弃的重测（unmount 清理可能没触发）。
  // 清掉它，避免主页显示「繼續測評(n/50)」而大厅显示「已完成」的不一致。
  // 仅在已有完成报告时清；无报告的半截答案是首次测评进行中，要保留可续答。
  useEffect(() => {
    if (!hydrated) return;
    const s = useAssessmentStore.getState();
    const answered = Object.keys(s.answers).length;
    if (s.bigFiveScores && answered > 0 && answered < QUESTIONS.length) {
      s.cancelRetake();
    }
  }, [hydrated]);

  return (
    // 移动端：内容从顶部流动 + 底部留白给 sticky CTA 栏；桌面：垂直居中。
    <div className="flex flex-1 flex-col items-center px-5 pt-20 pb-40 sm:px-6 sm:pt-24 lg:justify-center lg:pb-10 lg:pt-10">
      {/* 语言切换：覆盖持久化缓存，随时切回中文/英文（不必手动改 ?lang=） */}
      <div className="psy-serif fixed left-4 top-4 z-40 [transform:translateZ(0)] flex items-center gap-0.5 rounded-full border border-[var(--psy-border)] bg-[#fdf9f0] p-0.5 text-xs shadow-[var(--psy-shadow)] sm:left-8 sm:top-8">
        {(['zh', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`rounded-full px-2.5 py-1 transition ${loc === l ? 'bg-[var(--psy-accent-soft)] text-[var(--psy-accent)]' : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'}`}
          >
            {l === 'zh' ? '中' : 'EN'}
          </button>
        ))}
      </div>
      <button
        onClick={() => setDeckModalFor('tutorial')}
        className="psy-btn psy-btn-accent psy-serif fixed right-4 top-4 z-40 px-4 py-2 text-sm font-semibold sm:right-8 sm:top-8"
      >
        {c.tutorial}
      </button>
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8 lg:space-y-10"
      >
        <div className="space-y-5 sm:space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Image
                src="/brand/logo/hive-psi-mark.png"
                alt="人格麻將品牌標誌"
                width={72}
                height={72}
                priority
                className="h-14 w-14 shrink-0 rounded-2xl sm:h-[4.5rem] sm:w-[4.5rem]"
              />
              <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">
                {t.title}
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-[var(--psy-ink-soft)] sm:text-lg sm:leading-8 lg:max-w-none lg:whitespace-nowrap">
              {renderCjkKeep(t.intro, ['人格測評', '心理線索', '卡牌對戰', '一起', '自己', '牌桌', '別人'], loc)}
            </p>
          </div>

          {/* 移动端：紧凑横向行（icon + 文案）；sm+：原竖向卡片。4 张卡 → 2×2 */}
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
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
      </motion.div>

      {/* 主行动区：移动端固定底栏（拇指可达），桌面端回归内联网格。
          放在 motion.div 之外，避免 framer transform 祖先让 fixed 失效。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 [transform:translateZ(0)] border-t border-[var(--psy-border)] bg-[#fdf9f0] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(120,90,50,0.1)] lg:static lg:mx-auto lg:mt-10 lg:w-full lg:max-w-5xl lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        {/* 有報告：聯機 / 單機 / 查看人格報告（重新測評只在報告頁出現，首頁不暴露）。
            無報告：只有一個「開始測評 / 繼續測評」入口，引導先完成測評。 */}
        {hasResults ? (
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
            <button
              onClick={() => setDeckModalFor('pvp')}
              className="psy-btn psy-btn-accent psy-serif col-span-2 w-full px-6 py-3.5 text-base font-semibold lg:col-span-1"
            >
              {t.pvp}
            </button>
            <button
              onClick={() => setDeckModalFor('solo')}
              className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
            >
              {t.single}
            </button>
            <button
              onClick={() => setDeckModalFor('report')}
              className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
            >
              {t.report}
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <button
              onClick={() => setDeckModalFor('assessment')}
              className="psy-btn psy-btn-accent psy-serif w-full px-6 py-3.5 text-base font-semibold"
            >
              {progress > 0 && progress < QUESTIONS.length
                ? `${t.continueAssess} (${progress}/${QUESTIONS.length})`
                : t.startAssess}
            </button>
          </div>
        )}
      </div>
      <DeckSelectModal
        open={deckModalFor !== null}
        onClose={() => setDeckModalFor(null)}
        onSelect={() => router.push(
          deckModalFor === 'tutorial' ? '/tutorial'
          : deckModalFor === 'report' ? '/results'
          : deckModalFor === 'pvp' ? '/pvp'
          : deckModalFor === 'solo' ? '/lobby'
          : '/assessment'
        )}
        loc={loc}
      />

      <Footer />
    </div>
  );
}
