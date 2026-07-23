'use client';

// #8 局末概念小测（方向 A）：结算页可选的心理学知识卡小测，激励学生真去读知识卡。
// MVP：从全部知识卡随机出 4 题「看定义→选术语」的选择题，即时对错反馈 + 得分 + 鼓励语。
// 自包含（不需玩家数据），中英双语内联。2026-07-24。
// 后续可改为「只出这局出现过的知识卡」——需从对局状态把 seen dummy 卡传进来。

import { useMemo, useState } from 'react';
import { KNOWLEDGE_CARDS, type KnowledgeCard } from '@/data/dummy-cards';
import type { Locale } from '@/lib/i18n';

const QUESTION_COUNT = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function KnowledgeQuiz({ locale }: { locale: Locale }) {
  const en = locale === 'en';
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const questions = useMemo(() => {
    if (!started) return [];
    const pool = shuffle(KNOWLEDGE_CARDS);
    return pool.slice(0, QUESTION_COUNT).map((card) => {
      const distractors = shuffle(pool.filter((c) => c !== card)).slice(0, 3);
      return { card, options: shuffle([card, ...distractors]) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const term = (c: KnowledgeCard) => (en ? c.term : c.termZh);
  const def = (c: KnowledgeCard) => (en ? c.definition : c.definitionZh);

  const reset = () => {
    setStarted(false);
    setIdx(0);
    setScore(0);
    setPicked(null);
  };

  // 折叠态：一个不打扰的入口按钮
  if (!started) {
    return (
      <div className="rounded-[1.35rem] border border-[rgba(200,155,93,0.24)] bg-[var(--psy-card-content)] p-5 text-center shadow-[0_16px_30px_rgba(96,72,38,0.1)]">
        <p className="psy-serif text-base text-[var(--psy-ink)]">
          {en ? 'Learned any psychology this round?' : '這局學到心理學了嗎？'}
        </p>
        <p className="mt-1 text-xs text-[var(--psy-muted)]">
          {en ? 'A quick 4-question quiz on the knowledge cards.' : '來個 4 題知識卡小測，看看你記住多少。'}
        </p>
        <button
          onClick={() => setStarted(true)}
          className="psy-btn psy-btn-accent psy-serif mt-4 px-6 py-2.5 text-sm font-semibold"
        >
          {en ? 'Test your knowledge' : '測測你記得多少'}
        </button>
      </div>
    );
  }

  // 结果态
  if (idx >= questions.length) {
    const good = score >= Math.ceil(questions.length * 0.75);
    return (
      <div className="rounded-[1.35rem] border border-[rgba(200,155,93,0.24)] bg-[var(--psy-card-content)] p-6 text-center shadow-[0_16px_30px_rgba(96,72,38,0.1)]">
        <div className="text-4xl">{good ? '🎓' : '📚'}</div>
        <p className="psy-serif mt-2 text-xl text-[var(--psy-ink)]">
          {en ? `You got ${score} / ${questions.length}` : `答對 ${score} / ${questions.length} 題`}
        </p>
        <p className="mt-1 text-sm text-[var(--psy-ink-soft)]">
          {good
            ? (en ? 'Nicely done — you really know your psychology!' : '厲害，你很懂心理學！')
            : (en ? 'Give the knowledge cards another look next round.' : '下局多留意知識卡上的內容吧～')}
        </p>
        <button
          onClick={reset}
          className="psy-btn psy-btn-ghost psy-serif mt-4 px-6 py-2 text-sm font-medium"
        >
          {en ? 'Try again' : '再測一次'}
        </button>
      </div>
    );
  }

  // 答题态
  const q = questions[idx];
  const answered = picked !== null;
  const answerIndex = q.options.findIndex((o) => o === q.card);

  return (
    <div className="space-y-4 rounded-[1.35rem] border border-[rgba(200,155,93,0.24)] bg-[var(--psy-card-content)] p-5 shadow-[0_16px_30px_rgba(96,72,38,0.1)]">
      <div className="flex items-center justify-between">
        <span className="psy-eyebrow text-[10px]">{en ? 'Knowledge Quiz' : '概念小測'}</span>
        <span className="text-xs tabular-nums text-[var(--psy-muted)]">{idx + 1} / {questions.length}</span>
      </div>

      <div>
        <p className="text-xs text-[var(--psy-muted)]">{en ? 'Which concept does this describe?' : '這是哪個概念的描述？'}</p>
        <p className="mt-1 text-[15px] leading-7 text-[var(--psy-ink)]">{def(q.card)}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, oi) => {
          const isAnswer = oi === answerIndex;
          const isPicked = oi === picked;
          let cls = 'border-[rgba(154,116,72,0.2)] bg-[var(--psy-surface)] text-[var(--psy-ink)] hover:border-[var(--psy-accent)]';
          if (answered) {
            if (isAnswer) cls = 'border-[var(--psy-success)] bg-[rgba(111,143,85,0.14)] text-[var(--psy-success)]';
            else if (isPicked) cls = 'border-[var(--psy-danger)] bg-[rgba(190,83,62,0.12)] text-[var(--psy-danger)]';
            else cls = 'border-[rgba(154,116,72,0.14)] bg-[var(--psy-surface)] text-[var(--psy-muted)] opacity-70';
          }
          return (
            <button
              key={oi}
              disabled={answered}
              onClick={() => {
                setPicked(oi);
                if (isAnswer) setScore((s) => s + 1);
              }}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-default ${cls}`}
            >
              {term(opt)}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setIdx((i) => i + 1);
              setPicked(null);
            }}
            className="psy-btn psy-btn-accent psy-serif px-5 py-2 text-sm font-semibold"
          >
            {idx + 1 < questions.length ? (en ? 'Next' : '下一題') : (en ? 'See result' : '看結果')}
          </button>
        </div>
      )}
    </div>
  );
}
