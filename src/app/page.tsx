'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHexacoStore } from '@/stores/useHexacoStore';
import { useSd4Store } from '@/stores/useSd4Store';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { QUESTIONS } from '@/data/questions';
import { Footer } from '@/components/shared/Footer';
import { DeckSelectModal } from '@/components/shared/DeckSelectModal';
import { AccountChip } from '@/components/shared/AccountChip';
import { useAuthSession } from '@/lib/useAuthSession';
import { renderCjkKeep } from '@/lib/renderCjk';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, getProgress } = useAssessmentStore();
  const hexacoScores = useHexacoStore((s) => s.scores);
  const sd4Scores = useSd4Store((s) => s.scores);
  const progress = getProgress();
  // 需登录 + 有测评结果才露出「聯機/單機/報告」三入口。
  // 修 bug：登出后 localStorage 还留着 bigFiveScores → 曾以为 hasResults 就放行，
  // 让未登录用户直接进单机/报告。现在一律要求已登录（userId 存在）。
  const { userId } = useAuthSession();
  const isLoggedIn = !!userId;
  const hasResults = hydrated && isLoggedIn && bigFiveScores !== null;
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
  // 「查看報告」按模型分流：选了尚未完成的模型 → 弹「未完成」提示框（记录选的哪个模型）
  const [reportPrompt, setReportPrompt] = useState<'big-five' | 'hexaco' | 'cpai' | null>(null);
  // 各模型：是否已做出（有测评+报告页）+ 该用户是否已完成 + 展示名。
  // 三个模型测评均已上线（Dark Tetrad = SD4，2026-08-24；内部 id 仍沿用 cpai）；
  // 三套对局也均已上线（Dark Tetrad 对局 2026-08-31）。
  // 检测源当前用本地 scores；后续可换成登入时从 Supabase 拉取的「已完成模型」。
  const MODEL_NAME: Record<'big-five' | 'hexaco' | 'cpai', string> = { 'big-five': 'Big Five', hexaco: 'HEXACO', cpai: 'Dark Tetrad' };
  // ⚠️「已完成」必须以登入为前提：登出后 localStorage 仍留着上次的分数，
  // 若不判 isLoggedIn，模型选择框会对未登入用户误显「Done」（且点进去被 gate 弹回登录，自相矛盾）。
  const modelDone = (m: 'big-five' | 'hexaco' | 'cpai') =>
    !isLoggedIn ? false : m === 'big-five' ? bigFiveScores !== null : m === 'hexaco' ? hexacoScores !== null : sd4Scores !== null;

  // 各模型的答题页 / 报告页路由（HEXACO/SD4 独立于大五流程）。
  const ASSESS_ROUTE: Record<'big-five' | 'hexaco' | 'cpai', string> = { 'big-five': '/assessment', hexaco: '/hexaco/assess', cpai: '/sd4/assess' };
  const REPORT_ROUTE: Record<'big-five' | 'hexaco' | 'cpai', string> = { 'big-five': '/results', hexaco: '/hexaco/results', cpai: '/sd4/results' };

  // 模型在选择框里的状态：已完成 done / 已上线未做 todo / 未上线 soon（用于卡片徽标）。
  // 测评/报告与对局类流程（单机/联机/教学）：三模型都已上线 → 一律按完成度。
  const modelState = (m: 'big-five' | 'hexaco' | 'cpai'): 'done' | 'todo' | 'soon' =>
    modelDone(m) ? 'done' : 'todo';
  const gameModelState = modelState; // SD4 对局 2026-08-31 上线后与测评侧一致，保留别名以示语义

  // 「查看報告」：已完成 → 进该模型报告；未完成 → 弹提示框「你還沒做，要現在做嗎？」。
  // 老板流程：报告入口不该把没测过的人直接丢进题目，先明确告知未完成再引导去测。
  function handleReportPick(deckId: 'big-five' | 'hexaco' | 'cpai') {
    setDeckModalFor(null);
    if (modelDone(deckId)) { router.push(REPORT_ROUTE[deckId]); return; }
    setReportPrompt(deckId);
  }

  // 「開始測評」：直接进该模型答题（已完成则进报告）。
  function handleAssessPick(deckId: 'big-five' | 'hexaco' | 'cpai') {
    setDeckModalFor(null);
    router.push(modelDone(deckId) ? REPORT_ROUTE[deckId] : ASSESS_ROUTE[deckId]);
  }

  // 「單機遊戲」按模型分流：Big Five → /lobby、HEXACO → /hexaco-lobby、Dark Tetrad → /sd4-lobby
  // （三个大厅各自带「未测评」门禁，没做该模型测评会被引去对应答题页）。
  function handleSoloPick(deckId: 'big-five' | 'hexaco' | 'cpai') {
    setDeckModalFor(null);
    router.push(deckId === 'hexaco' ? '/hexaco-lobby' : deckId === 'cpai' ? '/sd4-lobby' : '/lobby');
  }

  // 「聯機對戰」按模型分流（2026-08-06 HEXACO 联机上线、2026-08-31 SD4 联机上线）：各自的建房/加房大厅。
  function handlePvpPick(deckId: 'big-five' | 'hexaco' | 'cpai') {
    setDeckModalFor(null);
    router.push(deckId === 'hexaco' ? '/hexaco-pvp' : deckId === 'cpai' ? '/sd4-pvp' : '/pvp');
  }

  // 「玩法教學」按模型分流（2026-08-06 HEXACO 教学上线、2026-08-31 SD4 教学上线）：各自的教学页。
  function handleTutorialPick(deckId: 'big-five' | 'hexaco' | 'cpai') {
    setDeckModalFor(null);
    router.push(deckId === 'hexaco' ? '/hexaco-tutorial' : deckId === 'cpai' ? '/sd4-tutorial' : '/tutorial');
  }

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

  // 顶栏底衬只在滚动后启用（0816）：静止时不存在，标题一点不被压暗；一滚动就淡入盖满，
  // 滑上来的内容彻底吃掉。两个需求（不压标题 / 不透残影）本来被同一层的高度互相卡死，
  // 拆成两态才都满足。阈值 8px 避免 iOS 回弹时闪烁。
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // 移动端：内容从顶部流动 + 充足底部留白，保证页脚能滚动到固定 CTA 栏上方完整显示
    // （iOS Safari 动态地址栏会吃掉底部空间，留白不足时页脚会被卡在栏后滑不上来）；桌面：垂直居中。
    // 桌面居中改用「pt/pb 安全边距 + 内容 my-auto」而非 justify-center：
    // 原来 lg:pt-10 + justify-center 在矮而宽的视口（iPad 横屏）上会把标题压进 fixed 顶栏，
    // 语言切换器盖住 logo；my-auto 在空间富余时照样居中，空间不足时退回从 pt-24 起排（且不裁顶）。
    <div className="flex flex-1 flex-col items-center px-5 pt-20 pb-56 sm:px-6 sm:pt-24 lg:pb-24 lg:pt-24">
      {/* 顶栏底衬（0816）：顶栏是 fixed 的，页面一滚，标题/正文就滑到语言切换和 Tutorial
          胶囊底下糊成一团（各断点都有，不止移动端）。这层垫在内容之上、顶栏之下，把滑上来的
          内容吃掉。取色 = --psy-page-bg 顶端 #f4edd9；配 backdrop blur 抹掉与背景渐变的色差，
          mask 让底衬连同 blur 一起向下渐隐，不在页面中间切出硬边。
          实心段占 85%（移动端 95px、sm 109px），盖过顶栏控件底边（16+40 / 32+40）还有余量，
          正文不会从胶囊边缘透出来。只在 scrolled 时淡入——停在顶部时它整层不可见，
          所以高度可以做到大于内容 pt 而不压暗标题。 */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-0 z-30 h-28 [transform:translateZ(0)] backdrop-blur-[14px] backdrop-saturate-[1.15] transition-opacity duration-200 sm:h-32 ${
          scrolled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(244,237,217,0.92) 0%, rgba(244,237,217,0.88) 85%, rgba(244,237,217,0) 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 85%, transparent 100%)',
          maskImage: 'linear-gradient(180deg, #000 0%, #000 85%, transparent 100%)',
        }}
      />
      {/* 顶栏：左语言切换 + 右账号/教學。单行 flex items-center 保证两侧垂直居中对齐
          （原来左右各自 fixed top-4，高度不同 → 只对齐顶边、中心错位）。
          透明外栏 pointer-events-none，子元素 auto，避免中间空白挡住下方点击。 */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 [transform:translateZ(0)] flex items-center justify-between px-4 sm:top-8 sm:px-8">
        {/* 语言切换：覆盖持久化缓存，随时切回中文/英文（不必手动改 ?lang=） */}
        <div className="psy-serif pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--psy-border)] bg-[#fdf9f0] p-0.5 pl-2 text-xs shadow-[var(--psy-shadow)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 h-3.5 w-3.5 text-[var(--psy-muted)]" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
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
        {/* 右上角：账号入口徽标（登入/头像下拉） + 玩法教學 */}
        <div className="pointer-events-auto flex items-center gap-2">
          <AccountChip />
          <button
            onClick={() => setDeckModalFor('tutorial')}
            className="psy-btn psy-btn-accent psy-serif px-4 py-2 text-sm font-semibold"
          >
            {c.tutorial}
          </button>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8 lg:my-auto lg:space-y-10"
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
            {/* lg:whitespace-nowrap 只給中文：它是配合 renderCjkKeep 讓 27 字的中文 intro
                在大屏排成一行（約 486px，容器裝得下）。英文 intro 有 124 字符、text-lg 下
                約 1116px，在 lg(1024px) 容器裏 nowrap 必然溢出；而英文本來就按空格斷詞、
                renderCjkKeep 對 en 也是原樣返回，根本不需要 nowrap。 */}
            <p
              className={`max-w-xl text-base leading-7 text-[var(--psy-ink-soft)] sm:text-lg sm:leading-8 lg:max-w-none ${
                loc === 'zh' ? 'lg:whitespace-nowrap' : ''
              }`}
            >
              {renderCjkKeep(t.intro, ['心理測評', '麻將策略', '自己', '牌桌', '別人'], loc)}
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
        onPickDeck={deckModalFor === 'report' ? handleReportPick : deckModalFor === 'assessment' ? handleAssessPick : deckModalFor === 'solo' ? handleSoloPick : deckModalFor === 'pvp' ? handlePvpPick : deckModalFor === 'tutorial' ? handleTutorialPick : undefined}
        modelState={deckModalFor === 'report' || deckModalFor === 'assessment' ? modelState : deckModalFor === 'solo' || deckModalFor === 'pvp' || deckModalFor === 'tutorial' ? gameModelState : undefined}
        loc={loc}
      />

      {/* 「查看報告」选了尚未完成的模型 → 未完成提示框（老板流程：已做进报告 / 未做问要不要现在做）。 */}
      {reportPrompt && (
        <div
          onClick={() => setReportPrompt(null)}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(58,48,32,0.5)] px-5 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="psy-panel psy-etched w-full max-w-sm space-y-4 rounded-[1.6rem] p-6 text-center"
          >
            <h2 className="psy-serif text-xl text-[var(--psy-ink)]">{MODEL_NAME[reportPrompt]}</h2>
            <p className="text-sm leading-6 text-[var(--psy-ink-soft)]">{t.reportNotDoneBody}</p>
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const m = reportPrompt;
                  setReportPrompt(null);
                  if (m) router.push(ASSESS_ROUTE[m]); // 去该模型答题
                }}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold"
              >
                {t.reportStartNow}
              </button>
              <button
                onClick={() => setReportPrompt(null)}
                className="psy-btn psy-btn-ghost psy-serif w-full py-2.5 text-sm font-medium"
              >
                {t.reportBack}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
