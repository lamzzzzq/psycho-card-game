'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/game/Card';
import { DIMENSION_META } from '@/data/dimensions';
import type { GameCard, PersonalityCard, DummyCard } from '@/types';

type Step = {
  title: string;
  body: string;
  hint?: string;
};

// ─── Playback (剧本演示) ─────────────────────────────────────────────────
// Scripted 6-frame walkthrough of a turn:
//   hand 3×N + 1 dummy → draw N → self-pong → declare → discard dummy.
// All cards are static fakes; only the Card visuals are real.

const FAKE_NEURO = (id: number): PersonalityCard => ({
  id,
  dimension: 'N',
  text: '我经常感到焦虑或忧虑',
  facet: 'anxiety',
});
const FAKE_NEURO_2 = (id: number): PersonalityCard => ({
  id,
  dimension: 'N',
  text: '我容易情绪波动',
  facet: 'volatility',
});
const FAKE_NEURO_3 = (id: number): PersonalityCard => ({
  id,
  dimension: 'N',
  text: '我容易感到压力',
  facet: 'stress',
});
const FAKE_NEURO_4 = (id: number): PersonalityCard => ({
  id,
  dimension: 'N',
  text: '我对批评比较敏感',
  facet: 'sensitivity',
});
const FAKE_DUMMY = (id: number): DummyCard => ({
  id,
  text: '颜色会影响食欲，蓝色会抑制饥饿感',
  isDummy: true,
});

const HAND_BASE: GameCard[] = [FAKE_NEURO(1), FAKE_NEURO_2(2), FAKE_NEURO_3(3), FAKE_DUMMY(4)];

type Frame = {
  caption: string;
  cta?: string;        // text on the "下一帧" button
  hand: GameCard[];    // shown in hand row
  drawnCard?: GameCard | null;
  highlighted?: number[]; // card ids that pulse
  declaredCount?: number; // shows "归档: 神经质 N张"
  showSelfPongBtn?: boolean;
  showCommitBtn?: boolean;
  bigBanner?: string;
};

const FRAMES: Frame[] = [
  {
    caption:
      '开局的你 — 手里 3 张神经质牌 + 1 张档案注记（中性常识牌，无人格归属）。假设你的「神经质」目标分数是 4 张，所以你还差 1 张。',
    hand: HAND_BASE,
    cta: '抽一张牌',
  },
  {
    caption:
      '从牌堆抽到 1 张牌 — 翻开是「神经质」！加上手里 3 张神经质，你现在正好凑齐 4 张目标。这就是「自摸触发」。',
    hand: HAND_BASE,
    drawnCard: FAKE_NEURO_4(5),
    cta: '点开自摸碰按钮',
  },
  {
    caption:
      '在主操作区点击「自摸碰」按钮 → 进入选牌模式。系统会让你选择维度（5 个未归档维度都可以选 → 不剧透）。这里你选「神经质」。',
    hand: HAND_BASE,
    drawnCard: FAKE_NEURO_4(5),
    showSelfPongBtn: true,
    cta: '选 4 张神经质牌',
  },
  {
    caption:
      '在手牌 + 刚抽到的牌中选恰好 4 张同维度牌（神经质 ×4）。张数必须精准等于目标 — 多 1 张少 1 张都算失败。',
    hand: HAND_BASE,
    drawnCard: FAKE_NEURO_4(5),
    highlighted: [1, 2, 3, 5],
    showCommitBtn: true,
    cta: '提交归档',
  },
  {
    caption:
      '✅ 神经质归档成功！4 张牌从手中移出，进入「公开归档区」给所有对手看见。你现在剩 1 张档案注记。还差 4 个维度。',
    hand: [FAKE_DUMMY(4)],
    declaredCount: 4,
    cta: '出 1 张牌结束回合',
  },
  {
    caption:
      '归档成功后必须立刻出 1 张牌结束回合（不允许连碰）。这里把档案注记丢到弃牌堆 → 回合结束 → 下一个玩家。重复 4 次同样的流程归档其他维度，全部 5 个完成即胜利。',
    hand: [],
    declaredCount: 4,
    bigBanner: '回合结束 · 下一玩家',
  },
];

const STEPS: Step[] = [
  {
    title: '你的目标',
    body: '5 个人格维度（开放性、尽责性、外向性、宜人性、神经质）全部完成「公开归档」，先达成的玩家获胜。每个维度的目标张数等于你测评出来的分数四舍五入，所以每人的「胡牌路线」都不一样。',
  },
  {
    title: '牌桌',
    body: '4 人对局（你 + 3 个 AI 对手）。牌堆由两类牌组成：带颜色标记的「人格描述牌」（属于某一维度），以及无维度归属的「档案注记 / 心理学线索牌」（中立，可弃可观察对手风格）。',
    hint: '初始手牌张数 = 你 5 个维度目标张数之和 − 1。少的那张要靠「碰」或「食胡」补齐。',
  },
  {
    title: '抽牌',
    body: '轮到你时，先点击牌堆抽 1 张。如果你已开启「查看 2 张牌」的特权，可以一次性把其中两张未知牌的真实人格揭开，便于打牌。',
  },
  {
    title: '出牌',
    body: '抽完后选 1 张你不需要的丢到中间的弃牌堆。被弃出的牌进入「心理判读窗口」，所有非你之外的玩家都有几秒钟时间决定是否「碰」或「食胡」。',
  },
  {
    title: '碰（公开归档）',
    body: '当一张人格牌满足你某个维度的需要时，可以宣布「碰」。规则：\n• 自摸碰（你自己回合内，每回合最多 1 次）→ 从你的「手牌 + 刚抽到的牌」里挑选恰好「该维度目标张数」张同维度牌组合归档；\n• 碰他人弃牌（claim 窗口内先点先得）→ 从手牌中挑选恰好「该维度目标张数 − 1」张同维度牌，加上那张弃牌正好凑齐；\n选错维度、混入其他人格牌、张数不对 → 视为「碰失败」，吃罚停一整轮。',
    hint: '碰成功后该维度立刻公开归档，所有人都看得见，你需要立刻出一张牌。自摸碰每回合只能用 1 次，下回合开始抽牌时重置。',
  },
  {
    title: '食胡（宣布胜利）',
    body: '当你的牌（已归档 + 手中 + 这张待判定牌）能正好完成全部 5 个维度时，按下「食胡」。\n触发时机：\n• 你的回合中（自摸食胡）；\n• 任意人弃牌进入判读窗口时（截胡）。\n判定不成立 → 食胡失败。',
  },
  {
    title: '罚停一整轮（失败的惩罚）',
    body: '「碰失败」「自摸碰失败」「食胡失败」都会让你被罚停整整一圈：\n• 失败时押的那几张牌（碰）或整副手牌（食胡）立刻公开给所有玩家；\n• 你下一个本应该出牌的回合会被完整跳过（不抽不出）；\n• 从失败那一刻起，直到你自己再次完成一次正常的「抽 + 出」为止，期间所有其他玩家的碰/食胡判定窗口你都不能参与。\n等于：错过一整圈的所有截胡机会 + 跳一次自己回合。所有玩家都会在你头像下看到「⛔ 罚停一轮」标识。',
  },
  {
    title: '胜负',
    body: '第一个完成全部 5 维度归档的玩家获胜。若牌堆抽完仍无人胜出，则按「已归档维度数 × 权重 − 剩余手牌惩罚」结算名次。',
  },
];

function PlaybackPanel({ onClose }: { onClose: () => void }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const frame = FRAMES[frameIdx];
  const neuroMeta = DIMENSION_META.N;
  const isLast = frameIdx === FRAMES.length - 1;

  return (
    <motion.div
      key="playback"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="psy-panel psy-etched rounded-[1.8rem] p-5 sm:p-8"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-muted)]">
          演示 · 帧 {frameIdx + 1} / {FRAMES.length}
        </span>
        <button
          onClick={onClose}
          className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
        >
          退出演示
        </button>
      </div>

      {/* 牌桌区 */}
      <div className="relative space-y-5 rounded-[1.4rem] border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-4 sm:p-6">
        {/* 顶部 banner */}
        {frame.bigBanner && (
          <div className="absolute inset-x-4 top-4 z-20 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-[var(--psy-accent)] bg-[rgba(200,155,93,0.18)] px-4 py-2 text-sm font-bold text-[var(--psy-accent)]"
            >
              {frame.bigBanner}
            </motion.div>
          </div>
        )}

        {/* 公开归档区 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--psy-muted)]">公开归档：</span>
          {frame.declaredCount ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: neuroMeta.colorHex,
                backgroundColor: neuroMeta.colorHex + '20',
                border: `1px solid ${neuroMeta.colorHex}55`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: neuroMeta.colorHex }} />
              神经质 {frame.declaredCount} 张
            </span>
          ) : (
            <span className="text-[var(--psy-muted)]">（暂无）</span>
          )}
        </div>

        {/* 牌堆 + 刚抽到的牌 */}
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">牌堆</span>
            <Card card={FAKE_NEURO(999)} faceUp={false} compact />
          </div>
          <AnimatePresence>
            {frame.drawnCard && (
              <motion.div
                key={`drawn-${frameIdx}`}
                initial={{ opacity: 0, x: -28, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-accent)]">刚抽到</span>
                <Card card={frame.drawnCard} compact revealedDimension={'N'} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 主操作区 — 自摸碰按钮 */}
        <div className="flex items-center justify-center gap-3">
          <button
            disabled
            className={`psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold opacity-50`}
          >
            食胡
          </button>
          <button
            disabled
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold transition ${
              frame.showSelfPongBtn ? 'animate-pulse opacity-100 ring-2 ring-[var(--psy-accent)]' : 'opacity-30'
            }`}
          >
            自摸碰
          </button>
        </div>

        {/* 选牌模式提示条 */}
        {frame.showCommitBtn && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-2 text-xs text-[var(--psy-accent)]"
          >
            <span>
              🎯 自摸碰 · <span style={{ color: neuroMeta.colorHex }}>神经质</span> · 请精确选择 4 张（已选 4）
            </span>
            <button
              disabled
              className="psy-btn psy-btn-accent animate-pulse px-3 py-1 text-[10px] font-bold ring-2 ring-[var(--psy-accent)]"
            >
              自摸归档
            </button>
          </motion.div>
        )}

        {/* 手牌行 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">你的手牌</span>
            <span className="text-[10px] text-[var(--psy-muted)]">{frame.hand.length} 张</span>
          </div>
          <AnimatePresence mode="popLayout">
            <div className="flex flex-wrap justify-center gap-2">
              {frame.hand.length === 0 ? (
                <div className="py-3 text-xs text-[var(--psy-muted)]">（手牌已清空）</div>
              ) : (
                frame.hand.map((c) => {
                  const highlighted = frame.highlighted?.includes(c.id);
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: highlighted ? -8 : 0,
                      }}
                      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.3 } }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      className={highlighted ? 'ring-2 ring-emerald-400 rounded-[1.1rem]' : ''}
                    >
                      <Card
                        card={c}
                        compact
                        revealedDimension={'dimension' in c ? c.dimension : null}
                        revealedAsKnowledge={c.isDummy === true}
                        selected={highlighted}
                      />
                    </motion.div>
                  );
                })
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* 旁白 */}
      <motion.p
        key={`cap-${frameIdx}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-4 rounded-xl border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.06)] px-4 py-3 text-sm leading-7 text-[var(--psy-ink-soft)]"
      >
        {frame.caption}
      </motion.p>

      {/* 控制 */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setFrameIdx((i) => Math.max(0, i - 1))}
          disabled={frameIdx === 0}
          className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:opacity-40"
        >
          上一帧
        </button>
        <div className="flex gap-1.5">
          {FRAMES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-6 rounded-full transition"
              style={{
                backgroundColor:
                  i === frameIdx
                    ? 'var(--psy-accent)'
                    : i < frameIdx
                    ? 'rgba(200,155,93,0.45)'
                    : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        {!isLast ? (
          <button
            onClick={() => setFrameIdx((i) => Math.min(FRAMES.length - 1, i + 1))}
            className="psy-btn psy-btn-accent px-5 py-2 text-sm font-semibold"
          >
            {frame.cta ?? '下一帧'}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="psy-btn psy-btn-accent px-5 py-2 text-sm font-semibold"
          >
            完成 ✓
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function TutorialPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [playbackMode, setPlaybackMode] = useState(false);
  const step = STEPS[stepIdx];

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="psy-serif text-xs uppercase tracking-[0.42em] text-[var(--psy-ink-soft)]">
              Tutorial
            </p>
            <h1 className="psy-serif text-4xl text-[var(--psy-ink)] sm:text-5xl">
              人格麻将 · 教学
            </h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm"
          >
            返回首页
          </button>
        </div>

        {!demoMode && !playbackMode && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="psy-panel psy-etched rounded-[1.4rem] p-5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="psy-serif text-xs text-[var(--psy-accent)]">
                      第 {i + 1} 步
                    </span>
                  </div>
                  <h3 className="psy-serif text-lg text-[var(--psy-ink)]">{s.title}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--psy-ink-soft)]">
                    {s.body}
                  </p>
                  {s.hint && (
                    <p className="mt-3 rounded-lg border border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.06)] px-3 py-2 text-xs text-[var(--psy-accent)]">
                      💡 {s.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => setPlaybackMode(true)}
                className="psy-btn psy-btn-accent psy-serif px-6 py-3 text-base font-semibold"
              >
                ▶ 看一回合演示
              </button>
              <button
                onClick={() => {
                  setStepIdx(0);
                  setDemoMode(true);
                }}
                className="psy-btn psy-btn-ghost px-6 py-3 text-sm"
              >
                文字逐步引导
              </button>
              <button
                onClick={() => router.push('/assessment')}
                className="psy-btn psy-btn-ghost px-6 py-3 text-sm"
              >
                直接开始测评
              </button>
            </div>
          </>
        )}

        {/* Playback panel — 剧本式 6 帧演示 */}
        <AnimatePresence mode="wait">
          {playbackMode && <PlaybackPanel onClose={() => setPlaybackMode(false)} />}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {demoMode && (
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="psy-panel psy-etched rounded-[1.8rem] p-7 sm:p-9"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-muted)]">
                  Bubble {stepIdx + 1} / {STEPS.length}
                </span>
                <button
                  onClick={() => setDemoMode(false)}
                  className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
                >
                  退出引导
                </button>
              </div>
              <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">
                {step.title}
              </h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-[var(--psy-ink-soft)]">
                {step.body}
              </p>
              {step.hint && (
                <p className="mt-4 rounded-xl border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-4 py-3 text-sm text-[var(--psy-accent)]">
                  💡 {step.hint}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between">
                <button
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  disabled={stepIdx === 0}
                  className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:opacity-40"
                >
                  上一步
                </button>
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-6 rounded-full transition"
                      style={{
                        backgroundColor:
                          i === stepIdx
                            ? 'var(--psy-accent)'
                            : i < stepIdx
                            ? 'rgba(200,155,93,0.45)'
                            : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
                {stepIdx < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                    className="psy-btn psy-btn-accent px-5 py-2 text-sm font-semibold"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/assessment')}
                    className="psy-btn psy-btn-accent px-5 py-2 text-sm font-semibold"
                  >
                    去测评
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
