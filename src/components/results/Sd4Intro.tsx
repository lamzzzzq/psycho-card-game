'use client';

import type { Locale } from '@/lib/i18n';

// 四维（M-N-P-S）：名称(中/英) + 定義句(def) + 高/低分說明(hl) + 分量表小結(sub) + 維度色。
// ⚠️ 全部文案（含粗體/斜體與參考文獻標點）逐字照老板審定稿
//    《The Short Dark Tetrad_20260805.docx》，不得改寫或壓縮。
// 样式与 HexacoIntro 一致。
const DIMS = [
  {
    key: 'M', zh: '馬基維利主義', en: 'Machiavellianism', color: '#2A4365',
    defZh: '馬基維利主義描述一個人的策略性思考、操控傾向，以及為了達成個人目標而影響或利用他人的傾向。',
    defEn: 'Machiavellianism describes strategic thinking, manipulation, and a willingness to influence or exploit others to achieve personal goals.',
    hlZh: '得分較高的人通常較善於計劃和說服他人，亦較願意透過操控情境或人際關係來獲取個人利益。得分較低的人通常較坦率、誠實，亦較少利用操控來達成自己的目標。',
    hlEn: 'People with higher scores tend to be more calculating, persuasive, and willing to manipulate situations or relationships for personal benefit. People with lower scores tend to be more straightforward, honest, and less likely to use manipulation to achieve their goals.',
    subZh: '這個分量表反映一個人傾向透過策略性，甚至帶有欺瞞性的人際互動來追求個人成就。',
    subEn: 'This subscale reflects a tendency to pursue personal success through strategic and sometimes deceptive interpersonal behaviour.',
  },
  {
    key: 'N', zh: '自戀', en: 'Narcissism', color: '#D97706',
    defZh: '自戀描述一個人的自我重要感、自信、對他人讚賞的需求，以及相信自己具有獨特才能的傾向。',
    defEn: "Narcissism describes self-importance, confidence, admiration seeking, and a belief in one's own uniqueness.",
    hlZh: '得分較高的人通常認為自己有能力、有才華，並值得獲得他人的認同和讚賞。得分較低的人通常較謙遜，較少重視地位或讚美，亦較少主動尋求他人的關注。',
    hlEn: 'People with higher scores tend to view themselves as talented, capable, and deserving of recognition and admiration. People with lower scores tend to be more modest, less concerned with status or praise, and less likely to seek attention from others.',
    subZh: '這個分量表反映一個人傾向具有誇大的自我評價，以及追求社會認同的特質。',
    subEn: 'This subscale reflects a tendency toward grandiosity and a desire for social recognition.',
  },
  {
    key: 'P', zh: '病態人格', en: 'Psychopathy', color: '#A6423A',
    defZh: '病態人格描述一個人的衝動、無畏、冒險，以及較少顧及規則或自身行為後果的傾向。',
    defEn: "Psychopathy describes impulsivity, fearlessness, risk-taking, and a reduced concern for rules or the consequences of one's behaviour.",
    hlZh: '得分較高的人通常較衝動、喜歡刺激，並可能較少在意權威或自己行為對他人的影響。得分較低的人通常較謹慎、自律，並較傾向在行動前考慮自己行為可能帶來的後果。',
    hlEn: 'People with higher scores tend to act impulsively, enjoy excitement, and may show less concern for authority or the impact of their behaviour on others. People with lower scores tend to be more cautious, self-controlled, and more likely to consider the consequences of their actions.',
    subZh: '這個分量表反映一個人傾向表現出大膽、衝動及較少受社會規範約束的行為。',
    subEn: 'This subscale reflects a tendency toward bold, impulsive, and socially uninhibited behaviour.',
  },
  {
    key: 'S', zh: '虐待', en: 'Sadism', color: '#5C4A72',
    defZh: '虐待描述一個人享受殘酷、攻擊行為，以及從他人經歷不適或痛苦中獲得愉悅的傾向。',
    defEn: 'Sadism describes enjoyment of cruelty, aggression, and pleasure derived from seeing others experience discomfort or suffering.',
    hlZh: '得分較高的人可能較喜歡帶有攻擊性的幽默、暴力娛樂，或對他人的痛苦、尷尬或受挫感到愉快。得分較低的人通常較不喜歡傷害他人，亦較少從他人的痛苦中獲得樂趣。',
    hlEn: "People with higher scores may enjoy aggressive humour, violent entertainment, or situations in which others experience pain or embarrassment. People with lower scores tend to dislike causing harm to others and are less likely to find enjoyment in others' suffering.",
    subZh: '這個分量表反映一個人傾向從他人的不適、痛苦或不幸中獲得愉悅。',
    subEn: 'This subscale reflects a tendency to derive enjoyment from the discomfort or misfortune of others.',
  },
] as const;

const LINK_CLS = 'underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]';

/**
 * SD4（短版黑暗四人格）模型科普介绍，样式与 HexacoIntro 一致。随语言切换中/英。
 * 文案与 References（含斜體範圍、英文逗號與 &）逐字照審定稿 docx。
 */
export function Sd4Intro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="w-full space-y-5 text-left">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The Short Dark Tetrad (SD4)' : '短版黑暗四人格（SD4）'}
      </h2>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            <strong>The Short Dark Tetrad (SD4)</strong> is a personality measure consisting of four subscales
            that assess socially aversive personality traits. The four subscales are{' '}
            <strong>Machiavellianism, Narcissism, Psychopathy, and Sadism</strong>.
          </>
        ) : (
          <>
            <strong>短版黑暗四人格（Short Dark Tetrad, SD4）</strong>是一個用於評估黑暗人格特質的人格量表，由四個分量表組成，包括<strong>馬基維利主義、自戀、病態人格和虐待</strong>。
          </>
        )}
      </p>

      {/* 四维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列 */}
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
              <p>{isEn ? d.subEn : d.subZh}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            In this game, you will learn more about your <strong>Dark Tetrad personality traits</strong>. Your
            assessment results will influence how you play Mahjong, creating an interactive learning experience
            that helps you explore your personality and deepen your understanding of the four{' '}
            <strong>SD4</strong> personality subscales.
          </>
        ) : (
          <>
            在這個遊戲中，你將進一步認識自己的<strong>黑暗四人格特質</strong>。你的評估結果將影響你在麻將遊戲中的玩法，讓你透過互動學習探索自己的人格，並加深對 <strong>SD4</strong> 四個人格分量表的理解。
          </>
        )}
      </p>

      <div className="space-y-2 border-t border-[var(--psy-border)] pt-5">
        <p className="psy-serif text-sm text-[var(--psy-ink-soft)]">References：</p>
        <div className="space-y-2 text-[13px] leading-6 text-[var(--psy-muted)]">
          <p>
            Paulhus, D. L. (n.d.). <em>Questionnaires</em>. Paulhus Personality Lab, University of British
            Columbia.{' '}
            <a href="https://www2.psych.ubc.ca/~dpaulhus/Paulhus_measures/" target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              https://www2.psych.ubc.ca/~dpaulhus/Paulhus_measures/
            </a>
          </p>
          <p>
            Paulhus, D. L., Buckels, E. E., Trapnell, P.D., &amp; Jones, D. N. (2018).{' '}
            <em>The Short Dark Tetrad (SD4)</em>. Introduced at the meeting of the International Conference for
            Applied Psychology, Montreal, Canada.
          </p>
          <p>
            Paulhus, D. L., Buckels, E. E., Trapnell, P. D., &amp; Jones, D. N. (2021). Screening for dark
            personalities: The Short Dark Tetrad (SD4).{' '}
            {/* 斜體範圍與期刊名中的窄空格( )照 docx 原样 */}
            <em>European Journal of Psychological Assessment{' '}: Official Organ of the European
            Association of Psychological Assessment, 37</em>(3), 208–222.{' '}
            <a href="https://doi.org/10.1027/1015-5759/a000602" target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              https://doi.org/10.1027/1015-5759/a000602
            </a>
          </p>
          <p>
            張益慈, 詹雨臻, &amp; 陳學志. (2021). 繁體中文版「簡式暗黑四特質量表」之發展與信效度考驗.{' '}
            <em>測驗學刊, 68</em>(4), 287–316.{' '}
            <a href="https://doi.org/10.7108/PT.202112_68(4).0002" target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              https://doi.org/10.7108/PT.202112_68(4).0002
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
