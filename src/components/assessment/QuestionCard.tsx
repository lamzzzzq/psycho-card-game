'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Question, LikertScore } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface QuestionCardProps {
  question: Question;
  selectedScore: LikertScore | undefined;
  onSelect: (score: LikertScore) => void;
  questionNumber: number;
}

const LIKERT_LABELS: { score: LikertScore; label: string }[] = [
  { score: 1, label: '非常不同意' },
  { score: 2, label: '不同意' },
  { score: 3, label: '中立' },
  { score: 4, label: '同意' },
  { score: 5, label: '非常同意' },
];

export function QuestionCard({
  question,
  selectedScore,
  onSelect,
  questionNumber,
}: QuestionCardProps) {
  const meta = DIMENSION_META[question.dimension];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="psy-panel psy-etched space-y-8 rounded-[1.8rem] p-6 md:p-8"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="psy-serif inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: meta.colorHex + '12', color: meta.colorHex, borderColor: meta.colorHex + '30' }}
            >
              {meta.name}・{question.facet}
            </span>
            <span className="text-xs text-[var(--psy-muted)]">No. {questionNumber}</span>
          </div>
          <p className="psy-serif text-xs uppercase tracking-[0.35em] text-[var(--psy-muted)]">
            Arcana Prompt
          </p>
          <h2 className="psy-serif text-2xl font-semibold leading-relaxed text-[var(--psy-ink)]">
            {question.text}
          </h2>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LIKERT_LABELS.map(({ score, label }) => (
            <button
              key={score}
              onClick={() => onSelect(score)}
              className={`flex flex-col items-center gap-2 rounded-[1.15rem] border p-4 transition-all ${
                selectedScore === score
                  ? 'border-current scale-105'
                  : 'hover:-translate-y-0.5'
              }`}
              style={{
                borderColor: selectedScore === score ? meta.colorHex : 'rgba(200,155,93,0.16)',
                color: selectedScore === score ? meta.colorHex : 'var(--psy-ink-soft)',
                background: selectedScore === score
                  ? `linear-gradient(180deg, ${meta.colorHex}20, rgba(10,18,28,0.94))`
                  : 'linear-gradient(180deg, rgba(22,34,49,0.9), rgba(14,22,33,0.92))',
                boxShadow: selectedScore === score
                  ? `0 0 0 1px ${meta.colorHex}22, 0 14px 28px rgba(0,0,0,0.28)`
                  : 'inset 0 0 0 1px rgba(255,255,255,0.03)',
              }}
            >
              <span className="psy-serif text-2xl font-bold">{score}</span>
              <span className="text-xs text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
