'use client';

import type { Locale } from '@/lib/i18n';

// 六维（H-E-X-A-C-O）：名称(中/英) + 定义句(def) + 高/低分说明(hl) + 与五大对照注记(note) + 维度色。
// ⚠️ 文案逐字照 The HEXACO Model_20260723 官方文档（中英双语），术语用「五大人格 / 評估」，
// 高/低分保留文档原「People with higher/lower scores…」两句式，不改写不压缩。样式与 BigFiveIntro 一致。
const DIMS = [
  {
    key: 'H', zh: '誠實－謙遜', en: 'Honesty–Humility', color: '#2dd4bf',
    defZh: '誠實－謙遜描述一個人的真誠、公平、謙遜，以及不願為了個人利益而利用他人的傾向。',
    defEn: 'Honesty–Humility describes sincerity, fairness, modesty, and unwillingness to exploit others for personal gain.',
    hlZh: '得分較高的人通常會避免欺騙或操控他人，亦較不重視財富、地位和特殊待遇。得分較低的人可能較願意使用奉承、為個人利益而變通規則，或追求地位和認同。',
    hlEn: 'People with higher scores tend to avoid cheating or manipulating others and place less importance on wealth, status, and special treatment. People with lower scores may be more willing to use flattery, bend rules for personal benefit, or seek status and recognition.',
    noteZh: '這是 HEXACO 模型中特有的向度，在五大人格模型中並沒有直接對應的獨立向度。',
    noteEn: 'This dimension is distinctive to HEXACO and has no direct equivalent in the Big Five.',
  },
  {
    key: 'E', zh: '情緒性', en: 'Emotionality', color: '#f87171',
    defZh: '情緒性描述一個人的恐懼、焦慮、情感依附、感性程度，以及對支持的需要。',
    defEn: 'Emotionality describes fearfulness, anxiety, emotional attachment, sentimentality, and need for support.',
    hlZh: '得分較高的人可能較擔心危險、較容易與他人建立強烈的情感連繫，並在面對困難時較傾向尋求支持。得分較低的人可能較少感到害怕、較不感性，並在情緒上較為獨立。',
    hlEn: 'People with higher scores may be more concerned about danger, form stronger emotional bonds, and seek support during difficult situations. People with lower scores may be less fearful, less sentimental, and more emotionally independent.',
    noteZh: '情緒性與五大人格中的神經質有關，但兩者並不相同。在 HEXACO 模型中，憤怒和易怒主要反映於較低的宜人性，而不是較高的情緒性。',
    noteEn: 'Emotionality is related to, but different from, Big Five Neuroticism. In HEXACO, anger and irritability are mainly reflected in lower Agreeableness rather than higher Emotionality.',
  },
  {
    key: 'X', zh: '外向性', en: 'Extraversion', color: '#facc15',
    defZh: '外向性描述一個人的社交自信、社交性、活力和熱情。',
    defEn: 'Extraversion describes social confidence, sociability, energy, and enthusiasm.',
    hlZh: '得分較高的人通常較喜歡社交互動、在他人面前較有自信，並表現出較多活力和熱情。得分較低的人可能較安靜、含蓄，並較喜歡較少的社交刺激。',
    hlEn: 'People with higher scores tend to enjoy social interaction, feel confident around others, and show greater energy and enthusiasm. People with lower scores may be quieter, more reserved, and more comfortable with less social stimulation.',
    noteZh: '這個向度與五大人格中的外向性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Extraversion.',
  },
  {
    key: 'A', zh: '宜人性', en: 'Agreeableness', color: '#4ade80',
    defZh: 'HEXACO 的宜人性描述一個人的耐性、寬恕、溫和，以及願意妥協的程度，尤其是在面對衝突時。',
    defEn: 'HEXACO Agreeableness describes patience, forgiveness, gentleness, and willingness to compromise, especially during conflict.',
    hlZh: '得分較高的人通常較能管理自己的憤怒、原諒他人，並在意見不合時保持彈性。得分較低的人可能較挑剔、固執、容易動怒，或較容易記恨。',
    hlEn: 'People with higher scores tend to manage their anger, forgive others, and remain flexible during disagreements. People with lower scores may be more critical, stubborn, quick-tempered, or likely to hold a grudge.',
    noteZh: '這與五大人格中的宜人性有所不同。五大人格的宜人性較廣泛地着重同理心、信任、合作和對他人的關心。',
    noteEn: 'This differs from Big Five Agreeableness, which focuses more broadly on compassion, trust, cooperation, and concern for others.',
  },
  {
    key: 'C', zh: '盡責性', en: 'Conscientiousness', color: '#60a5fa',
    defZh: '盡責性描述一個人的組織能力、勤奮、細心程度和自律。',
    defEn: 'Conscientiousness describes organisation, diligence, carefulness, and self-discipline.',
    hlZh: '得分較高的人通常會預先規劃、認真工作，並在面對困難任務時堅持下去。得分較低的人可能較喜歡彈性和隨性，亦可能較缺乏組織。',
    hlEn: 'People with higher scores tend to plan ahead, work carefully, and persist with difficult tasks. People with lower scores may prefer flexibility and spontaneity and may be less organised.',
    noteZh: '這個向度與五大人格中的盡責性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Conscientiousness.',
  },
  {
    key: 'O', zh: '開放性', en: 'Openness', color: '#c084fc',
    defZh: '開放性描述一個人的好奇心、創造力、對藝術和美感的欣賞，以及對新穎或非傳統觀念的興趣。',
    defEn: 'Openness describes curiosity, creativity, appreciation of art and beauty, and interest in new or unconventional ideas.',
    hlZh: '得分較高的人通常較喜歡學習、運用想像力和探索不同觀點。得分較低的人可能較偏好熟悉的觀念、實際的活動和傳統的做法。',
    hlEn: 'People with higher scores tend to enjoy learning, using their imagination, and exploring different perspectives. People with lower scores may prefer familiar ideas, practical activities, and traditional approaches.',
    noteZh: '這個向度與五大人格中的開放性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Openness.',
  },
] as const;

/**
 * HEXACO 六维人格模型科普介绍，样式与 BigFiveIntro 一致。随语言切换中/英。
 * 文案逐字照官方文档；References 依 APA：期刊名/卷号斜体、The HEXACO Personality Inventory–Revised 斜体。
 */
export function HexacoIntro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="w-full space-y-5 text-left">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The HEXACO Model' : 'HEXACO 人格模型'}
      </h2>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            The <strong>HEXACO</strong> model describes personality using six broad dimensions. The name{' '}
            <strong>HEXACO</strong> represents Honesty–Humility, Emotionality, eXtraversion, Agreeableness,
            Conscientiousness, and Openness.
          </>
        ) : (
          <>
            <strong>HEXACO</strong> 人格模型以六個廣泛的人格向度來描述人格。<strong>HEXACO</strong> 這個名稱代表誠實－謙遜、情緒性、外向性、宜人性、盡責性和開放性六個向度。
          </>
        )}
      </p>

      {/* 六维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列 */}
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
                <p className="text-[12.5px] leading-5 text-[var(--psy-muted)]">{isEn ? d.noteEn : d.noteZh}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            In this game, you will learn more about your <strong>HEXACO</strong> personality profile. Your
            assessment results will influence how you play Mahjong, creating an interactive learning experience
            that helps you explore your personality and deepen your understanding of the six HEXACO personality
            dimensions.
          </>
        ) : (
          <>
            在這個遊戲中，你將進一步認識自己的 <strong>HEXACO</strong> 人格特徵。你的評估結果將影響你在麻將遊戲中的玩法，讓你透過互動學習探索自己的人格，並加深對六個 HEXACO 人格向度的理解。
          </>
        )}
      </p>

      <div className="space-y-2 border-t border-[var(--psy-border)] pt-5">
        <p className="psy-serif text-sm text-[var(--psy-ink-soft)]">{isEn ? 'References' : '參考文獻'}</p>
        <div className="space-y-2 text-[13px] leading-6 text-[var(--psy-muted)]">
          <p>
            Ashton, M. C., &amp; Lee, K. (2007). Empirical, theoretical, and practical advantages of the
            HEXACO model of personality structure. <em>Personality and Social Psychology Review, 11</em>(2),
            150–166.{' '}
            <a href="https://doi.org/10.1177/1088868306294907" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://doi.org/10.1177/1088868306294907
            </a>
          </p>
          <p>
            Ashton, M. C., &amp; Lee, K. (2009). The HEXACO–60: A short measure of the major dimensions of
            personality. <em>Journal of Personality Assessment, 91</em>(4), 340–345.{' '}
            <a href="https://doi.org/10.1080/00223890902935878" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://doi.org/10.1080/00223890902935878
            </a>
          </p>
          <p>
            蔡珊妮, &amp; 許建中. (2023). 評估 HEXACO 人格量表的跨文化適用性與效度.{' '}
            <em>臺灣諮商心理學報, 11</em>(2), 106–132.{' '}
            <a href="https://doi.org/10.53106/2304781X2023111102004" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://doi.org/10.53106/2304781X2023111102004
            </a>
          </p>
          <p>
            Lee, K., &amp; Ashton, M. C. (n.d.). <em>The HEXACO Personality Inventory–Revised.</em> Retrieved
            July 20, 2026, from{' '}
            <a href="https://hexaco.org/hexaco-inventory" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://hexaco.org/hexaco-inventory
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
