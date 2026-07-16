'use client';

import type { Locale } from '@/lib/i18n';

// 五维：名称(中/英) + 说明(中/英) + 维度色(与雷达图/维度条一致)
const DIMS = [
  { key: 'O', zh: '開放性', en: 'Openness', descZh: '好奇、創造力與探索新想法的傾向', descEn: 'Curiosity, creativity, and willingness to explore new ideas', color: '#c084fc' },
  { key: 'C', zh: '盡責性', en: 'Conscientiousness', descZh: '責任感、組織能力與目標導向行為', descEn: 'Responsibility, organization, and goal-directed behavior', color: '#60a5fa' },
  { key: 'E', zh: '外向性', en: 'Extraversion', descZh: '社交性、活力以及從人際互動中尋求刺激的傾向', descEn: 'Sociability, energy, and tendency to seek stimulation from social interactions', color: '#facc15' },
  { key: 'A', zh: '宜人性', en: 'Agreeableness', descZh: '同理心、合作性與關懷他人的傾向', descEn: 'Compassion, cooperation, and concern for others', color: '#4ade80' },
  { key: 'N', zh: '神經質', en: 'Neuroticism', descZh: '情緒敏感度以及體驗負面情緒的傾向', descEn: 'Emotional sensitivity and tendency to experience negative emotions', color: '#f87171' },
] as const;

/**
 * 结果页底部的大五人格科普介绍。随语言切换：中文 locale 显示中文版，英文显示英文版。
 * 五维用双列表格呈现（名称｜说明）。References（学术引用）两版共用、英文原文照搬。
 */
export function BigFiveIntro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="w-full space-y-5 text-left">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The Big Five Personality Model (OCEAN)' : '大五人格模型（Big Five Personality Model；OCEAN）'}
      </h2>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            <strong>The Big Five Personality Model (OCEAN)</strong> is one of the most widely accepted
            frameworks for understanding personality. It describes individual differences across five
            broad dimensions:
          </>
        ) : (
          <>
            大五人格模型（<strong>Big Five Personality Model；OCEAN</strong>）是人格心理學中最廣泛採用的人格理論之一。此模型以五個主要向度描述個體的人格差異：
          </>
        )}
      </p>

      {/* 五维表格 */}
      <div className="overflow-hidden rounded-[1.1rem] border border-[var(--psy-border)] text-[14px]">
        {DIMS.map((d, i) => (
          <div key={d.key} className={`flex ${i > 0 ? 'border-t border-[var(--psy-border)]' : ''}`}>
            <div className="flex w-[8.5rem] shrink-0 items-start gap-2 border-r border-[var(--psy-border)] bg-[var(--psy-accent-soft)] px-3 py-3 sm:w-64 sm:px-4">
              <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="psy-serif font-semibold leading-5 text-[var(--psy-ink)]">
                {isEn ? d.en : (
                  <>
                    {d.zh}
                    <span className="font-normal text-[var(--psy-muted)]">（{d.en}）</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex-1 px-3 py-3 leading-6 text-[var(--psy-ink-soft)] sm:px-4">
              {isEn ? d.descEn : d.descZh}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            In this game, you will get to know your <strong>Big Five personality</strong> better. Your
            assessment results will determine your Mahjong gameplay, creating an interactive learning
            experience that helps you explore your personality profile and deepen your understanding
            of the Big Five personality traits.
          </>
        ) : (
          <>
            在本遊戲中，你將更了解你的<strong>大五人格</strong>。測評結果將決定你的麻將玩法，打造一場互動式學習體驗，讓你探索自己的人格特質，並加深對大五人格特質的理解。
          </>
        )}
      </p>

      <div className="space-y-2 border-t border-[var(--psy-border)] pt-5">
        <p className="psy-serif text-sm text-[var(--psy-ink-soft)]">{isEn ? 'References' : '參考文獻'}</p>
        <div className="space-y-2 text-[13px] leading-6 text-[var(--psy-muted)]">
          <p>
            Goldberg, L. R. (1999). A broad-bandwidth, public domain, personality inventory
            measuring the lower-level facets of several five-factor models. In I. Mervielde, I.
            Deary, F. De Fruyt, &amp; F. Ostendorf (Eds.), <em>Personality psychology in Europe</em>{' '}
            (Vol. 7, pp. 7–28). Tilburg, The Netherlands: Tilburg University Press.
          </p>
          <p>
            International Personality Item Pool. (2007).{' '}
            <em>
              A scientific collaboratory for the development of advanced measures of personality
              traits and other individual differences.
            </em>{' '}
            <a
              href="http://ipip.ori.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]"
            >
              http://ipip.ori.org/
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
