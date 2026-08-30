'use client';

// SD4 版对局内「維度速查 / Dimensions」按钮，摆在玩法教學左边（HEXACO 版的物理隔离副本）。
// 来由：老板反馈——semi-open / hidden 难度下玩家判断「這張牌屬於哪一維」缺依据，
// 希望对局中随时能看到 profile 页那份四维介绍。拍板：三档难度都显示，不按难度分流。
//
// ⚠️ 物理隔离：DIMS 文案是 components/results/Sd4Intro.tsx 的独立副本，不 import、不共用。
// 已定稿的结果页组件一行不改。文案逐字照《The Short Dark Tetrad_20260805.docx》老板审定稿（中英双语）。
// 与结果页版本的差别：只保留四维表（判断依据），去掉模型总述、「在這個遊戲中…」段落和参考文献
// ——对局中要的是速查，不是科普全文。

import { useState } from 'react';
import { STRINGS, type Locale } from '@/lib/i18n';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

const DIMS = [
  {
    key: 'M', zh: '馬基維利主義', en: 'Machiavellianism', color: '#2A4365',
    defZh: '馬基維利主義描述一個人的策略性思考、操控傾向，以及為了達成個人目標而影響或利用他人的傾向。',
    defEn: 'Machiavellianism describes strategic thinking, manipulation, and a willingness to influence or exploit others to achieve personal goals.',
    hlZh: '得分較高的人通常較善於計劃和說服他人，亦較願意透過操控情境或人際關係來獲取個人利益。得分較低的人通常較坦率、誠實，亦較少利用操控來達成自己的目標。',
    hlEn: 'People with higher scores tend to be more calculating, persuasive, and willing to manipulate situations or relationships for personal benefit. People with lower scores tend to be more straightforward, honest, and less likely to use manipulation to achieve their goals.',
    noteZh: '這個分量表反映一個人傾向透過策略性，甚至帶有欺瞞性的人際互動來追求個人成就。',
    noteEn: 'This subscale reflects a tendency to pursue personal success through strategic and sometimes deceptive interpersonal behaviour.',
  },
  {
    key: 'N', zh: '自戀', en: 'Narcissism', color: '#D97706',
    defZh: '自戀描述一個人的自我重要感、自信、對他人讚賞的需求，以及相信自己具有獨特才能的傾向。',
    defEn: "Narcissism describes self-importance, confidence, admiration seeking, and a belief in one's own uniqueness.",
    hlZh: '得分較高的人通常認為自己有能力、有才華，並值得獲得他人的認同和讚賞。得分較低的人通常較謙遜，較少重視地位或讚美，亦較少主動尋求他人的關注。',
    hlEn: 'People with higher scores tend to view themselves as talented, capable, and deserving of recognition and admiration. People with lower scores tend to be more modest, less concerned with status or praise, and less likely to seek attention from others.',
    noteZh: '這個分量表反映一個人傾向具有誇大的自我評價，以及追求社會認同的特質。',
    noteEn: 'This subscale reflects a tendency toward grandiosity and a desire for social recognition.',
  },
  {
    key: 'P', zh: '病態人格', en: 'Psychopathy', color: '#A6423A',
    defZh: '病態人格描述一個人的衝動、無畏、冒險，以及較少顧及規則或自身行為後果的傾向。',
    defEn: "Psychopathy describes impulsivity, fearlessness, risk-taking, and a reduced concern for rules or the consequences of one's behaviour.",
    hlZh: '得分較高的人通常較衝動、喜歡刺激，並可能較少在意權威或自己行為對他人的影響。得分較低的人通常較謹慎、自律，並較傾向在行動前考慮自己行為可能帶來的後果。',
    hlEn: 'People with higher scores tend to act impulsively, enjoy excitement, and may show less concern for authority or the impact of their behaviour on others. People with lower scores tend to be more cautious, self-controlled, and more likely to consider the consequences of their actions.',
    noteZh: '這個分量表反映一個人傾向表現出大膽、衝動及較少受社會規範約束的行為。',
    noteEn: 'This subscale reflects a tendency toward bold, impulsive, and socially uninhibited behaviour.',
  },
  {
    key: 'S', zh: '虐待', en: 'Sadism', color: '#5C4A72',
    defZh: '虐待描述一個人享受殘酷、攻擊行為，以及從他人經歷不適或痛苦中獲得愉悅的傾向。',
    defEn: 'Sadism describes enjoyment of cruelty, aggression, and pleasure derived from seeing others experience discomfort or suffering.',
    hlZh: '得分較高的人可能較喜歡帶有攻擊性的幽默、暴力娛樂，或對他人的痛苦、尷尬或受挫感到愉快。得分較低的人通常較不喜歡傷害他人，亦較少從他人的痛苦中獲得樂趣。',
    hlEn: "People with higher scores may enjoy aggressive humour, violent entertainment, or situations in which others experience pain or embarrassment. People with lower scores tend to dislike causing harm to others and are less likely to find enjoyment in others' suffering.",
    noteZh: '這個分量表反映一個人傾向從他人的不適、痛苦或不幸中獲得愉悅。',
    noteEn: 'This subscale reflects a tendency to derive enjoyment from the discomfort or misfortune of others.',
  },
] as const;

export function Sd4DimensionSummaryButton({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const isEn = locale === 'en';
  const label = STRINGS[locale].common.dimensionSummaries;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-1 text-[10px] font-medium text-[var(--psy-ink-soft)] shadow-[0_8px_18px_rgba(96,72,38,0.1)] transition hover:border-[var(--psy-accent)] hover:text-[var(--psy-accent-strong)] sm:text-[11px]"
      >
        {label}
      </button>

      <PsyOverlayPanel open={open} onClose={() => setOpen(false)} title={label} variant="centered" locale={locale}>
        <div className="space-y-3 px-1 py-1 text-left">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            {isEn
              ? 'Use these summaries to judge which dimension a card belongs to.'
              : '看不準手上的牌屬於哪一維時，可以對照下面的說明判斷。'}
          </p>

          {/* 四维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列——与结果页一致 */}
          <div className="overflow-hidden rounded-[1.1rem] border border-[var(--psy-border)] text-[14px]">
            {DIMS.map((d, i) => (
              <div key={d.key} className={`flex flex-col sm:flex-row ${i > 0 ? 'border-t border-[var(--psy-border)]' : ''}`}>
                <div className="flex items-center gap-2 border-b border-[var(--psy-border)] bg-[var(--psy-accent-soft)] px-3 py-2.5 sm:w-52 sm:shrink-0 sm:items-start sm:border-b-0 sm:border-r sm:px-4 sm:py-3">
                  <span className="h-2 w-2 shrink-0 rounded-full sm:mt-[6px]" style={{ backgroundColor: d.color }} />
                  <span className="psy-serif text-[13px] font-semibold leading-5 text-[var(--psy-ink)]">
                    {isEn ? d.en : (
                      <>
                        {d.zh}
                        <span className="font-normal text-[var(--psy-muted)]">（{d.en}）</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 px-3 py-2.5 text-[13px] leading-6 text-[var(--psy-ink-soft)] sm:px-4 sm:py-3">
                  <p>{isEn ? d.defEn : d.defZh}</p>
                  <p className="text-[12.5px] leading-6 text-[var(--psy-muted)]">{isEn ? d.hlEn : d.hlZh}</p>
                  <p className="text-[12px] leading-5 text-[var(--psy-muted)]">{isEn ? d.noteEn : d.noteZh}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PsyOverlayPanel>
    </>
  );
}
