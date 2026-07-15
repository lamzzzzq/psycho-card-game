'use client';

import type { Locale } from '@/lib/i18n';

/**
 * 结果页底部的大五人格科普介绍。随语言切换：中文 locale 显示中文版，英文显示英文版；
 * References（学术引用）两版共用、英文原文照搬。粗体(<strong>)/斜体(<em>)严格照原文档。
 */
export function BigFiveIntro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="psy-panel psy-etched mx-auto w-full max-w-3xl space-y-5 rounded-[1.6rem] p-6 text-left sm:p-8">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The Big Five Personality Model (OCEAN)' : '大五人格模型（Big Five Personality Model；OCEAN）'}
      </h2>

      <div className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <p>
            <strong>The Big Five Personality Model (OCEAN)</strong> is one of the most widely
            accepted frameworks for understanding personality. It describes individual differences
            across five broad dimensions: <strong>Openness</strong> (curiosity, creativity, and
            willingness to explore new ideas), <strong>Conscientiousness</strong> (responsibility,
            organization, and goal-directed behavior), <strong>Extraversion</strong> (sociability,
            energy, and tendency to seek stimulation from social interactions),{' '}
            <strong>Agreeableness</strong> (compassion, cooperation, and concern for others), and{' '}
            <strong>Neuroticism</strong> (emotional sensitivity and tendency to experience negative
            emotions) (Goldberg, 1999; International Personality Item Pool [IPIP], 2007). In this
            game, you will first complete a personality assessment to identify your{' '}
            <strong>Big Five personality profile</strong>. Your assessment results will determine
            your Mahjong gameplay, creating an interactive learning experience that helps you
            explore your personality profile and deepen your understanding of the Big Five
            personality traits.
          </p>
        ) : (
          <p>
            大五人格模型（<strong>Big Five Personality Model；OCEAN</strong>）是人格心理學中最廣泛採用的人格理論之一。此模型以五個主要向度描述個體的人格差異：<strong>開放性（Openness）</strong>（好奇、創造力與探索新想法的傾向）、<strong>盡責性（Conscientiousness）</strong>（責任感、組織能力與目標導向行為）、<strong>外向性（Extraversion）</strong>（社交性、活力以及從人際互動中尋求刺激的傾向）、<strong>宜人性（Agreeableness）</strong>（同理心、合作性與關懷他人的傾向）以及<strong>神經質（Neuroticism）</strong>（情緒敏感度以及體驗負面情緒的傾向）（Goldberg, 1999；International Personality Item Pool [IPIP], 2007）。在本遊戲中，你將先完成大五人格測評，了解自己的<strong>大五人格概況</strong>。測評結果將決定你的麻將玩法，打造一場互動式學習體驗，讓你探索自己的人格特質，並加深對大五人格特質的理解。
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-[var(--psy-border)] pt-5">
        <p className="psy-serif text-sm text-[var(--psy-ink-soft)]">References</p>
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
