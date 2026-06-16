'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Question, LikertScore } from '@/types';
import { Locale, STRINGS } from '@/lib/i18n';

interface QuestionCardProps {
  question: Question;
  selectedScore: LikertScore | undefined;
  onSelect: (score: LikertScore) => void;
  locale: Locale;
}

const LIKERT_SCORES: LikertScore[] = [1, 2, 3, 4, 5];
// 中性強調色（金）：測評過程不按維度上色，避免暗示題目所屬維度。
const ACCENT = '#c89b5d';

export function QuestionCard({
  question,
  selectedScore,
  onSelect,
  locale,
}: QuestionCardProps) {
  const t = STRINGS[locale].assessment;
  const text = locale === 'en' ? question.textEn : question.text;

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
        {/* 不顯示維度名 / 題號 / Arcana 標籤，只呈現陳述題面，避免暗示所屬維度 */}
        <h2 className="psy-serif text-2xl font-semibold leading-relaxed text-[var(--psy-ink)]">
          {text}
        </h2>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {LIKERT_SCORES.map((score) => (
            <button
              key={score}
              onClick={() => onSelect(score)}
              className={`flex flex-col items-center gap-1 rounded-[1.15rem] border p-2 transition-all sm:gap-2 sm:p-4 ${
                selectedScore === score
                  ? 'border-current scale-105'
                  : 'hover:-translate-y-0.5'
              }`}
              style={{
                borderColor: selectedScore === score ? ACCENT : 'rgba(200,155,93,0.16)',
                color: selectedScore === score ? ACCENT : 'var(--psy-ink-soft)',
                background: selectedScore === score
                  ? `linear-gradient(180deg, ${ACCENT}20, rgba(10,18,28,0.94))`
                  : 'linear-gradient(180deg, rgba(22,34,49,0.9), rgba(14,22,33,0.92))',
                boxShadow: selectedScore === score
                  ? `0 0 0 1px ${ACCENT}22, 0 14px 28px rgba(0,0,0,0.28)`
                  : 'inset 0 0 0 1px rgba(255,255,255,0.03)',
              }}
            >
              <span className="psy-serif text-xl font-bold sm:text-2xl">{score}</span>
              <span className="text-[10px] text-center leading-tight sm:text-xs">{t.likert[score - 1]}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
