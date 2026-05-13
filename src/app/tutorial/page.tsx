'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Step = {
  title: string;
  body: string;
  hint?: string;
};

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

export default function TutorialPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
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

        {!demoMode && (
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
                onClick={() => {
                  setStepIdx(0);
                  setDemoMode(true);
                }}
                className="psy-btn psy-btn-accent psy-serif px-6 py-3 text-base font-semibold"
              >
                走一遍交互式引导
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

        <p className="text-center text-xs text-[var(--psy-muted)]">
          交互式可玩沙盒（真的抽牌 / 真的碰）将随后版本上线。
        </p>
      </div>
    </div>
  );
}
