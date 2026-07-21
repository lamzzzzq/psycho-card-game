'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useGameStore } from '@/stores/useGameStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { LOBBY_T } from '@/lib/i18n/lobby';
import { renderCjk } from '@/lib/renderCjk';
import { useAuthSession } from '@/lib/useAuthSession';
import { useProfileAvatar } from '@/stores/useProfileAvatar';
import { AvatarPicker } from '@/components/pvp/AvatarPicker';
import { DEFAULT_AVATAR } from '@/data/avatars';

// 人格牌堆入口（与联机建房一致）：单机固定用 Big Five 测评分数，另两套即将上线。
const DECKS = [
  { id: 'big-five', name: 'Big Five', nameKey: null, subKey: 'deckBigFiveSub', locked: false },
  { id: 'hexaco', name: null, nameKey: 'deckHexacoName', subKey: 'deckHexacoSub', locked: true },
  { id: 'cpai', name: null, nameKey: 'deckCpaiName', subKey: 'deckCpaiSub', locked: true },
] as const;
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
  const p = STRINGS[loc].pvpLobby;

  const [difficulty, setDifficulty] = useState<AIDifficulty>('easy');
  const [totalRounds, setTotalRounds] = useState(10);
  const [revealDifficulty, setRevealDifficulty] = useState<RevealDifficulty>('open');

  // 学号（登录态）+ 头像（共享 store，与 /account、PVP 互通）
  const { userId, studentId } = useAuthSession();
  const { avatar: sharedAvatar, load: loadAvatar, setAvatar: saveSharedAvatar } = useProfileAvatar();
  useEffect(() => {
    if (userId) void loadAvatar(userId);
  }, [userId, loadAvatar]);
  const avatar = sharedAvatar ?? DEFAULT_AVATAR;

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

  const revealValues: RevealDifficulty[] = ['open', 'half', 'hidden'];
  const revealOptions = revealValues.map((value, i) => ({ value, ...s.revealOptions[i] }));

  // 布局与联机建房（/pvp）完全一致：max-w-2xl 单列 + 独立 psy-panel 卡 +
  // psy-eyebrow 小标签 + 简洁 psy-tile + 面板内底部主按钮。
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            {s.backHome}
          </button>
          <h1 className="psy-serif whitespace-nowrap text-[1.55rem] leading-tight text-[var(--psy-ink)] sm:whitespace-normal sm:text-6xl sm:leading-none">
            {s.title}
            <span className="ml-2 align-baseline text-base font-semibold text-[var(--psy-accent)] sm:ml-3 sm:text-3xl">· Big Five</span>
          </h1>
          <p className="text-base leading-7 text-[var(--psy-ink-soft)]">{s.subtitle}</p>
        </div>

        {/* 玩家信息：学号（登录态）+ 头像（与 profile 互通），交互同联机 */}
        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          {studentId && (
            <p className="text-sm text-[var(--psy-ink-soft)]">
              {p.studentLabel}：<span className="psy-serif tracking-[0.06em] text-[var(--psy-ink)]">{studentId}</span>
            </p>
          )}
          <AvatarPicker value={avatar} onChange={(next) => { if (userId) void saveSharedAvatar(userId, next); }} />
          {/* 单机进得来即已完成测评（未完成会被上面的 needAssess 挡住），与联机一致展示 */}
          <div className="psy-chip">
            <span className="text-[var(--psy-success)]">✓</span>
            <span>{p.assessDone}</span>
          </div>
        </section>

        {/* 对手档案：结构上对应联机的「玩家信息」面板（先给上下文，再设置参数） */}
        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          <p className="psy-eyebrow text-[10px]">{s.opponentsLabel}</p>
          {/* 对手档案：纯展示、不可点击（扁平非交互卡，头像左+名字/简介右，三端统一横向） */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {AI_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                className="flex items-center gap-3 rounded-[1.1rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)] px-3 py-3 text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-accent-soft)] text-2xl">
                  {persona.avatar}
                </div>
                <div className="min-w-0">
                  <div className="psy-serif text-sm text-[var(--psy-ink)]">{loc === 'en' ? persona.nameEn : persona.name}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[var(--psy-muted)]">{loc === 'en' ? persona.descriptionEn : persona.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
          {/* 人格模型选择已前置到进游戏前的弹窗(DeckSelectModal),此处不再重复选择 */}

          <div className="space-y-2">
            <p className="psy-eyebrow text-[10px]">{s.difficultyLabel}</p>
            <div className="grid grid-cols-3 gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`psy-tile psy-serif text-sm ${difficulty === opt.value ? 'is-active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="psy-eyebrow text-[10px]">{s.roundsLabel}</p>
            <div className="grid grid-cols-4 gap-2">
              {roundValues.map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalRounds(n)}
                  className={`psy-tile psy-serif text-sm ${totalRounds === n ? 'is-active' : ''}`}
                >
                  {n === 0 ? '∞' : n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="psy-eyebrow text-[10px]">{s.revealLabel}</p>
            {/* 移动端单列(整行,标签不再被挤到两行);sm+ 三列 */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {revealOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRevealDifficulty(opt.value)}
                  className={`psy-tile flex flex-col items-start gap-0.5 px-3 py-2.5 text-left ${revealDifficulty === opt.value ? 'is-active' : ''}`}
                >
                  <span className="psy-serif text-sm text-[var(--psy-ink)]">{opt.label}</span>
                  <span className="text-[10px] leading-4 text-[var(--psy-muted)]">{renderCjk(opt.desc, loc)}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="psy-btn psy-btn-accent psy-serif w-full py-3 text-base font-semibold"
          >
            {s.start}
          </button>
        </section>
      </motion.div>
    </div>
  );
}
