'use client';

import type { Locale } from '@/lib/i18n';

// 五维：名称(中/英) + 定义句(def) + 高/低分说明(hl) + 补充注记(note，E/N 才有) + 维度色。
// 文案依据 The Big Five Model_20260723 官方文档（中英双语）。N 用「神經質/Neuroticism」方向
// （与 DIMENSION_META 一致：高分=情緒不穩），注记说明「情緒穩定性」为其相反方向。
const DIMS = [
  {
    key: 'O', zh: '開放性', en: 'Openness', color: '#c084fc',
    defZh: '開放性描述一個人的好奇心、想像力、創造力，以及對新觀念和新體驗的興趣。',
    defEn: 'Openness describes curiosity, imagination, creativity, and interest in new ideas and experiences.',
    hlZh: '得分較高的人可能較喜歡探索陌生的觀念、文化、活動和藝術體驗；得分較低的人則可能較偏好熟悉、實際和既有的做事方式。',
    hlEn: 'Higher scorers may enjoy exploring unfamiliar ideas, cultures, activities, and artistic experiences; lower scorers may prefer familiar, practical, and established ways of doing things.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'C', zh: '盡責性', en: 'Conscientiousness', color: '#60a5fa',
    defZh: '盡責性描述一個人的組織能力、自律、細心程度和堅持性。',
    defEn: 'Conscientiousness describes organisation, self-discipline, carefulness, and persistence.',
    hlZh: '得分較高的人通常會預先規劃、朝着目標努力，並重視自己的責任；得分較低的人可能較喜歡彈性和隨性，亦可能較不習慣高度結構化的計劃。',
    hlEn: 'Higher scorers tend to plan ahead, work towards goals, and pay attention to their responsibilities; lower scorers may prefer flexibility and spontaneity and be less comfortable with highly structured plans.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'E', zh: '外向性', en: 'Extraversion', color: '#facc15',
    defZh: '外向性描述一個人的社交性、活力、自信表達，以及對社交互動的喜愛程度。',
    defEn: 'Extraversion describes sociability, energy, assertiveness, and enjoyment of social interaction.',
    hlZh: '得分較高的人可能會從社交活動中獲得活力，並較自在地發言或帶領他人；得分較低的人可能較安靜、含蓄，並較喜歡小組活動或獨處。',
    hlEn: 'Higher scorers may feel energised by social activities and be comfortable speaking or taking the lead; lower scorers may be quieter, more reserved, and more comfortable in smaller groups or alone.',
    noteZh: '外向性得分較低並不代表不喜歡與人相處，而可能只是較偏好較少的社交刺激。',
    noteEn: 'Lower Extraversion doesn’t necessarily mean disliking people — it may simply reflect a preference for less social stimulation.',
  },
  {
    key: 'A', zh: '宜人性', en: 'Agreeableness', color: '#4ade80',
    defZh: '宜人性描述一個人的同理心、合作性、信任，以及對他人的關心程度。',
    defEn: 'Agreeableness describes compassion, cooperation, trust, and concern for other people.',
    hlZh: '得分較高的人通常較體貼、富有同情心，並願意與他人合作；得分較低的人可能較懷疑他人、表達較直接、競爭性較強，或較願意質疑和挑戰他人。',
    hlEn: 'Higher scorers tend to be considerate, sympathetic, and willing to cooperate; lower scorers may be more sceptical, direct, competitive, or willing to challenge others.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'N', zh: '神經質', en: 'Neuroticism', color: '#f87171',
    defZh: '神經質描述一個人出現憂慮、壓力、悲傷和其他負面情緒的強度和頻率。',
    defEn: 'Neuroticism describes how strongly and frequently a person tends to experience worry, stress, sadness, and other negative emotions.',
    hlZh: '得分較高的人可能對威脅、問題和情緒變化較敏感；得分較低的人通常較能保持冷靜，並較容易從壓力經驗中恢復。',
    hlEn: 'Higher scorers may be more sensitive to threats, problems, and emotional changes; lower scorers tend to remain calmer and recover more easily from stressful experiences.',
    noteZh: '部分問卷會使用「情緒穩定性」一詞，代表與神經質相反的方向；情緒穩定性得分愈高，通常表示神經質程度愈低。',
    noteEn: 'Some questionnaires use the term Emotional Stability, the opposite direction of Neuroticism: higher Emotional Stability generally corresponds to lower Neuroticism.',
  },
] as const;

/**
 * 结果页底部的大五人格科普介绍。随语言切换：中文 locale 显示中文版，英文显示英文版。
 * 五维用双列表格呈现（名称｜定义 + 高/低分说明 + 补充注记）。References 两版共用。
 */
export function BigFiveIntro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="w-full space-y-5 text-left">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The Big Five Personality Model (OCEAN)' : '大五人格模型（Big Five Personality Model；OCEAN）'}
      </h2>

      <p className="text-pretty text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            The <strong>Big Five model</strong> describes personality using five broad dimensions,
            often remembered by the acronym <strong>OCEAN</strong>:
          </>
        ) : (
          <>
            <strong>大五人格模型（Big Five Personality Model；OCEAN）</strong>以五個廣泛的人格向度來描述人格，通常可用英文縮寫 <strong>OCEAN</strong> 幫助記憶：
          </>
        )}
      </p>

      {/* 五维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列 */}
      <div className="overflow-hidden rounded-[1.1rem] border border-[var(--psy-border)] text-[14px]">
        {DIMS.map((d, i) => (
          <div key={d.key} className={`flex flex-col sm:flex-row ${i > 0 ? 'border-t border-[var(--psy-border)]' : ''}`}>
            <div className="flex items-center gap-2 border-b border-[var(--psy-border)] bg-[var(--psy-accent-soft)] px-3 py-2.5 sm:w-56 sm:shrink-0 sm:items-start sm:border-b-0 sm:border-r sm:px-4 sm:py-3">
              <span className="h-2 w-2 shrink-0 rounded-full sm:mt-[6px]" style={{ backgroundColor: d.color }} />
              <span className="psy-serif font-semibold leading-5 text-[var(--psy-ink)]">
                {isEn ? d.en : (
                  <>
                    {d.zh}
                    <span className="font-normal text-[var(--psy-muted)]">（{d.en}）</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex-1 space-y-1.5 px-3 py-2.5 leading-6 text-[var(--psy-ink-soft)] sm:px-4 sm:py-3">
              <p>{isEn ? d.defEn : d.defZh}</p>
              <p className="text-[13px] leading-6 text-[var(--psy-muted)]">{isEn ? d.hlEn : d.hlZh}</p>
              {(isEn ? d.noteEn : d.noteZh) && (
                <p className="text-[12.5px] italic leading-5 text-[var(--psy-muted)]">{isEn ? d.noteEn : d.noteZh}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-pretty text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            In this game, you will learn more about your <strong>Big Five personality</strong> profile.
            Your assessment results will influence how you play Mahjong, creating an interactive learning
            experience that helps you explore your personality and deepen your understanding of the five
            personality dimensions.
          </>
        ) : (
          <>
            在這個遊戲中，你將進一步認識自己的<strong>大五人格</strong>。你的測評結果將影響你在麻將中的玩法，讓你透過互動學習探索自己的人格特質，並加深對五個人格向度的理解。
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
