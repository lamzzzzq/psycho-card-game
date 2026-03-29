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
        className="space-y-8"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: meta.colorHex + '20', color: meta.colorHex }}
            >
              {meta.name}・{question.facet}
            </span>
            <span className="text-xs text-gray-600">#{questionNumber}</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-100 leading-relaxed">
            {question.text}
          </h2>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LIKERT_LABELS.map(({ score, label }) => (
            <button
              key={score}
              onClick={() => onSelect(score)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                selectedScore === score
                  ? 'border-current scale-105'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
              style={
                selectedScore === score ? { borderColor: meta.colorHex, color: meta.colorHex } : undefined
              }
            >
              <span className="text-2xl font-bold">{score}</span>
              <span className="text-xs text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
