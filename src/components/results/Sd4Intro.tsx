'use client';

import type { Locale } from '@/lib/i18n';

// 四维（M-N-P-S）：名称(中/英) + 定义句(def) + 高/低分说明(hl) + 维度色。
// ⚠️ 维度名称逐字照 SD4_20260804.xlsx（馬基維利主義/自戀/病態人格/虐待）；
// 定义/高低分说明为依 Paulhus et al. (2021) 构念撰写的简短中性文案（暂无官方科普文档，待老板审定后替换）。
// 样式与 HexacoIntro 一致。
const DIMS = [
  {
    key: 'M', zh: '馬基維利主義', en: 'Machiavellianism', color: '#2A4365',
    defZh: '馬基維利主義描述一個人以策略性算計與操控來達成目的的傾向，重視長期布局而非直接衝突。',
    defEn: 'Machiavellianism describes a tendency toward strategic calculation and manipulation, favouring long-term planning over direct confrontation.',
    hlZh: '得分較高的人較傾向於謀定而後動、拉攏重要人士並迴避正面衝突。得分較低的人較少以算計的方式與人相處。',
    hlEn: 'People with higher scores tend to plan before acting, cultivate influential allies, and avoid open conflict. People with lower scores are less inclined to approach relationships strategically.',
  },
  {
    key: 'N', zh: '自戀', en: 'Narcissism', color: '#D97706',
    defZh: '自戀描述一個人的自我優越感、對讚賞與關注的渴望，以及愛表現的傾向。',
    defEn: 'Narcissism describes a sense of superiority, a desire for admiration and attention, and a tendency toward self-display.',
    hlZh: '得分較高的人通常自視特別、相信自己出類拔萃，並喜歡成為注意的焦點。得分較低的人對自我的評價較為平實。',
    hlEn: 'People with higher scores tend to see themselves as special, believe in their exceptional qualities, and enjoy being the centre of attention. People with lower scores hold a more modest view of themselves.',
  },
  {
    key: 'P', zh: '病態人格', en: 'Psychopathy', color: '#A6423A',
    defZh: '病態人格描述一個人的衝動、尋求刺激、對抗規範與權威，以及低恐懼的傾向。',
    defEn: 'Psychopathy describes impulsivity, thrill-seeking, defiance of rules and authority, and low fearfulness.',
    hlZh: '得分較高的人較容易先行動後思考、置身於危險情境，並與規範產生衝突。得分較低的人行事較為謹慎克制。',
    hlEn: 'People with higher scores tend to act before thinking, find themselves in risky situations, and clash with rules. People with lower scores are more cautious and restrained.',
  },
  {
    key: 'S', zh: '虐待', en: 'Sadism', color: '#5C4A72',
    defZh: '虐待描述一個人從他人的痛苦、衝突或暴力場面中獲得樂趣的傾向，是 Dark Tetrad 相對「黑暗三元」新增的向度。',
    defEn: 'Sadism describes deriving enjoyment from others’ pain, conflict, or violent scenes — the dimension the Dark Tetrad adds to the classic Dark Triad.',
    hlZh: '得分較高的人較容易覺得打鬥、暴力內容或他人出糗有趣。得分較低的人對這類場面較無興趣或感到不適。',
    hlEn: 'People with higher scores are more likely to find fights, violent content, or others’ misfortune entertaining. People with lower scores are indifferent to or uncomfortable with such scenes.',
  },
] as const;

/**
 * SD4（Dark Tetrad 暗黑四特質）模型科普介绍，样式与 HexacoIntro 一致。随语言切换中/英。
 * References 依 APA：期刊名/卷号斜体。
 */
export function Sd4Intro({ locale }: { locale: Locale }) {
  const isEn = locale === 'en';
  return (
    <section className="w-full space-y-5 text-left">
      <h2 className="psy-serif text-xl text-[var(--psy-ink)] sm:text-2xl">
        {isEn ? 'The Dark Tetrad (SD4)' : 'Dark Tetrad 暗黑四特質模型'}
      </h2>

      <p className="text-[15px] leading-7 text-[var(--psy-ink-soft)] sm:leading-8">
        {isEn ? (
          <>
            The <strong>Dark Tetrad</strong> describes four socially aversive — yet subclinical — personality
            tendencies: Machiavellianism, Narcissism, Psychopathy, and Sadism. The{' '}
            <strong>Short Dark Tetrad (SD4)</strong> measures them with 28 items, 7 per dimension. All items
            are scored in the same direction; each dimension score is the average of its items (1.0–5.0).
          </>
        ) : (
          <>
            <strong>Dark Tetrad（暗黑四特質）</strong>描述四種帶有社會嫌惡色彩、但仍屬一般人格範圍的傾向：馬基維利主義、自戀、病態人格與虐待。<strong>簡式暗黑四特質量表（SD4）</strong>以 28 題測量，每維 7 題；全部正向計分，各維分數為該維題目的平均（1.0–5.0）。
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
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-[var(--psy-border)] pt-5">
        <p className="psy-serif text-sm text-[var(--psy-ink-soft)]">{isEn ? 'References' : '參考文獻'}</p>
        <div className="space-y-2 text-[13px] leading-6 text-[var(--psy-muted)]">
          <p>
            Paulhus, D. L., Buckels, E. E., Trapnell, P. D., &amp; Jones, D. N. (2021). Screening for dark
            personalities: The Short Dark Tetrad (SD4). <em>European Journal of Psychological Assessment,
            37</em>(3), 208–222.{' '}
            <a href="https://doi.org/10.1027/1015-5759/a000602" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://doi.org/10.1027/1015-5759/a000602
            </a>
          </p>
          <p>
            張益慈、詹雨臻、陳學志（2021）。繁體中文版「簡式暗黑四特質量表」之發展與信效度考驗。
            <em>測驗學刊，68</em>(4)，287–316。{' '}
            <a href="https://doi.org/10.7108/PT.202112_68(4).0002" target="_blank" rel="noopener noreferrer" className="underline decoration-[rgba(200,155,93,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]">
              https://doi.org/10.7108/PT.202112_68(4).0002
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
