'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useGameStore } from '@/stores/useGameStore';
import { AI_PERSONAS } from '@/data/ai-personas';
import { AIDifficulty } from '@/types';

export default function LobbyPage() {
  const router = useRouter();
  const { bigFiveScores } = useAssessmentStore();
  const { initGame } = useGameStore();

  const [difficulty, setDifficulty] = useState<AIDifficulty>('easy');
  const [totalRounds, setTotalRounds] = useState(10);

  if (!bigFiveScores) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="psy-panel psy-etched w-full max-w-md space-y-4 rounded-[1.8rem] p-8 text-center">
          <p className="psy-serif text-lg text-[var(--psy-ink)]">请先完成人格测评</p>
          <p className="text-sm text-[var(--psy-muted)]">完整人格刻度会决定你在牌局中的归档目标。</p>
          <button
            onClick={() => router.push('/assessment')}
            className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
          >
            开始测评
          </button>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    initGame(bigFiveScores, { totalRounds, aiDifficulty: difficulty });
    router.push('/game');
  };

  const difficultyOptions: { value: AIDifficulty; label: string; desc: string }[] = [
    { value: 'easy', label: '简单', desc: '凭直觉出牌' },
    { value: 'medium', label: '中等', desc: '会记牌分析' },
    { value: 'hard', label: '困难', desc: '推测你的心理' },
  ];

  const roundOptions = [
    { value: 5, label: '5 轮', desc: '快速' },
    { value: 10, label: '10 轮', desc: '标准' },
    { value: 15, label: '15 轮', desc: '持久' },
    { value: 0, label: '∞ 无限', desc: '直到有人胡' },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <div className="psy-panel psy-etched rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="text-center space-y-3">
              <div className="psy-serif text-[11px] tracking-[0.28em] text-[var(--psy-accent)]">BATTLE CHAMBER</div>
              <h1 className="psy-serif text-4xl text-[var(--psy-ink)] sm:text-5xl">对战大厅</h1>
              <p className="text-sm text-[var(--psy-muted)]">设置游戏参数，准备进入人格博弈。</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <section className="space-y-3">
                  <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">AI 难度</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {difficultyOptions.map((opt) => {
                      const active = difficulty === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setDifficulty(opt.value)}
                          className="psy-etched rounded-[1.4rem] border p-4 text-center transition"
                          style={{
                            borderColor: active ? 'rgba(200,155,93,0.46)' : 'rgba(200,155,93,0.16)',
                            background: active
                              ? 'linear-gradient(180deg, rgba(64,46,27,0.92), rgba(27,22,17,0.96))'
                              : 'linear-gradient(180deg, rgba(20,31,46,0.78), rgba(11,20,31,0.92))',
                            boxShadow: active ? '0 18px 32px rgba(72, 49, 18, 0.24)' : 'none',
                          }}
                        >
                          <div className="psy-serif text-lg text-[var(--psy-ink)]">{opt.label}</div>
                          <div className="mt-2 text-xs text-[var(--psy-muted)]">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">游戏轮数</label>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {roundOptions.map((r) => {
                      const active = totalRounds === r.value;
                      return (
                        <button
                          key={r.value}
                          onClick={() => setTotalRounds(r.value)}
                          className="psy-etched rounded-[1.3rem] border p-4 text-center transition"
                          style={{
                            borderColor: active ? 'rgba(200,155,93,0.46)' : 'rgba(200,155,93,0.16)',
                            background: active
                              ? 'linear-gradient(180deg, rgba(56,41,26,0.92), rgba(21,18,15,0.96))'
                              : 'linear-gradient(180deg, rgba(20,31,46,0.78), rgba(11,20,31,0.92))',
                            boxShadow: active ? '0 18px 32px rgba(72, 49, 18, 0.22)' : 'none',
                          }}
                        >
                          <div className="psy-serif text-lg text-[var(--psy-ink)]">{r.label}</div>
                          <div className="mt-2 text-xs text-[var(--psy-muted)]">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className="space-y-3">
                <label className="psy-serif text-sm text-[var(--psy-ink-soft)]">对手档案</label>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {AI_PERSONAS.map((p) => (
                    <div
                      key={p.id}
                      className="psy-panel psy-etched rounded-[1.4rem] p-4 text-center lg:text-left"
                    >
                      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-start">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(200,155,93,0.2)] bg-[rgba(200,155,93,0.08)] text-2xl">
                          {p.avatar}
                        </div>
                        <div className="space-y-1">
                          <div className="psy-serif text-lg text-[var(--psy-ink)]">{p.name}</div>
                          <div className="text-xs leading-5 text-[var(--psy-muted)]">{p.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleStart}
                className="psy-btn psy-btn-accent min-w-[16rem] px-10 py-3 text-base font-semibold sm:min-w-[20rem]"
              >
                开始对战
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
