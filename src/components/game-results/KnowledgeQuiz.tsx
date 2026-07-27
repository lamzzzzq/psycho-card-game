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

  // 折叠态：一个不打扰的入口按钮。
  // 特色卡：金調漸變 + 角落柔光 + 圖標徽章，刻意做得比周圍素卡更醒目、不與之混同。
  if (!started) {
    return (
      <div className="relative overflow-hidden rounded-[1.6rem] border border-[rgba(200,155,93,0.42)] bg-[linear-gradient(155deg,#fbf3e2_0%,#f2e4c8_100%)] p-6 text-center shadow-[0_18px_38px_rgba(120,90,50,0.18)]">
        {/* 角落柔光裝飾 */}
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(195,154,82,0.24),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(195,154,82,0.16),transparent_70%)]" />

        {/* 圖標徽章：燈泡（知識/複習） */}
        <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(200,155,93,0.4)] bg-[var(--psy-card-content)] shadow-[0_6px_16px_rgba(120,90,50,0.16),inset_0_1px_0_rgba(255,255,255,0.7)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-[var(--psy-accent-strong)]" aria-hidden>
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
        </div>

        <p className="psy-eyebrow relative text-[10px]">{en ? 'Pop Quiz' : '隨堂小測'}</p>
        <p className="psy-serif relative mt-1.5 text-xl text-[var(--psy-ink)]">
          {en ? 'Post-Game Psychology Review' : '本局心理學知識複習'}
        </p>
        <p className="relative mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--psy-ink-soft)]">
          {en ? 'A quick 4-question quiz on your knowledge cards to see how much you remembered.' : '來個 4 題知識卡小測，看看你記住多少。'}
        </p>

        {/* 4 題小圓點提示 */}
        <div className="relative mt-3 flex items-center justify-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-[rgba(154,116,72,0.4)]" />
          ))}
        </div>

        <button
          onClick={() => setStarted(true)}
          className="psy-btn psy-btn-accent psy-serif relative mt-4 inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold shadow-[0_10px_22px_rgba(154,116,72,0.32)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M12 2.5l1.7 4.8 4.8 1.7-4.8 1.7L12 15.5l-1.7-4.8L5.5 9l4.8-1.7z" />
          </svg>
          {en ? 'Start Quiz (1 min)' : '立即測試（1 分鐘）'}
        </button>
      </div>
    );
  }

  // 结果态
  if (idx >= questions.length) {
    const good = score >= Math.ceil(questions.length * 0.75);
    return (
      <div className="relative overflow-hidden rounded-[1.6rem] border border-[rgba(200,155,93,0.42)] bg-[linear-gradient(155deg,#fbf3e2_0%,#f2e4c8_100%)] p-6 text-center shadow-[0_18px_38px_rgba(120,90,50,0.18)]">
        {/* 角落柔光裝飾（同入口卡） */}
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(195,154,82,0.24),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(195,154,82,0.16),transparent_70%)]" />

        {/* 圖標徽章：好成績=獎章，其餘=書本（SVG，替掉 emoji） */}
        <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(200,155,93,0.4)] bg-[var(--psy-card-content)] shadow-[0_6px_16px_rgba(120,90,50,0.16),inset_0_1px_0_rgba(255,255,255,0.7)]">
          {good ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-[var(--psy-accent-strong)]" aria-hidden>
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-[var(--psy-accent-strong)]" aria-hidden>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          )}
        </div>

        <p className="psy-eyebrow relative text-[10px]">{en ? 'Quiz Result' : '測驗結果'}</p>
        {/* 分數：得分數用強調色放大 */}
        <p className="psy-serif relative mt-1.5 text-2xl text-[var(--psy-ink)]">
          {en ? 'You got ' : '答對 '}
          <span className="text-[var(--psy-accent-strong)]">{score} / {questions.length}</span>
          {en ? '' : ' 題'}
        </p>
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--psy-ink-soft)]">
          {good
            ? (en ? 'Nicely done — you really know your psychology!' : '厲害，你很懂心理學！')
            : (en ? 'Give the knowledge cards another look next round.' : '下局多留意知識卡上的內容吧～')}
        </p>
        <button
          onClick={reset}
          className="psy-btn psy-btn-accent psy-serif relative mt-4 inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold shadow-[0_10px_22px_rgba(154,116,72,0.32)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
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
