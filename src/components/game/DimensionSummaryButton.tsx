'use client';

// 大五版对局内「維度速查 / Dimensions」按钮，摆在玩法教學左边。2026-08-16。
// 来由：老板反馈——semi-open / hidden 难度下玩家判断「這張牌屬於哪一維」缺依据，
// 希望对局中随时能看到 profile 页那份维度介绍。拍板：三档难度都显示，不按难度分流。
// HEXACO 侧有独立副本 hexaco-game/HexacoDimensionSummaryButton.tsx（两套牌局物理隔离）。
//
// ⚠️ 物理隔离：DIMS 文案是 components/results/BigFiveIntro.tsx 的独立副本，不 import、不共用。
// 已定稿的结果页组件一行不改。文案逐字照 The Big Five Model_20260723 官方文档（中英双语）。
// 圆点颜色仍取 DIMENSION_META[key].colorHex（配色单一真相源，只读引用）。
// 与结果页版本的差别：只保留五维表（判断依据），去掉模型总述、「在這個遊戲中…」段落和参考文献。

import { useState } from 'react';
import { STRINGS, type Locale } from '@/lib/i18n';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';
import { DIMENSION_META } from '@/data/dimensions';
import type { Dimension } from '@/types';

const DIMS = [
  {
    key: 'O', zh: '開放性', en: 'Openness',
    defZh: '開放性描述一個人的好奇心、想像力、創造力，以及對新觀念和新體驗的興趣。',
    defEn: 'Openness describes curiosity, imagination, creativity, and interest in new ideas and experiences.',
    hlZh: '得分較高的人可能較喜歡探索陌生的觀念、文化、活動和藝術體驗。得分較低的人則可能較偏好熟悉、實際和既有的做事方式。',
    hlEn: 'People with higher scores may enjoy exploring unfamiliar ideas, cultures, activities, and artistic experiences. People with lower scores may prefer familiar, practical, and established ways of doing things.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'C', zh: '盡責性', en: 'Conscientiousness',
    defZh: '盡責性描述一個人的組織能力、自律、細心程度和堅持性。',
    defEn: 'Conscientiousness describes organisation, self-discipline, carefulness, and persistence.',
    hlZh: '得分較高的人通常會預先規劃、朝着目標努力，並重視自己的責任。得分較低的人可能較喜歡彈性和隨性，亦可能較不習慣高度結構化的計劃。',
    hlEn: 'People with higher scores tend to plan ahead, work towards goals, and pay attention to their responsibilities. People with lower scores may prefer flexibility and spontaneity and may be less comfortable with highly structured plans.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'E', zh: '外向性', en: 'Extraversion',
    defZh: '外向性描述一個人的社交性、活力、自信表達，以及對社交互動的喜愛程度。',
    defEn: 'Extraversion describes sociability, energy, assertiveness, and enjoyment of social interaction.',
    hlZh: '得分較高的人可能會從社交活動中獲得活力，並較自在地發言或帶領他人。得分較低的人可能較安靜、含蓄，並較喜歡小組活動或獨處。',
    hlEn: 'People with higher scores may feel energised by social activities and be comfortable speaking or taking the lead. People with lower scores may be quieter, more reserved, and more comfortable in smaller groups or spending time alone.',
    noteZh: '外向性得分較低並不代表不喜歡與人相處，而可能只是較偏好較少的社交刺激。',
    noteEn: 'Lower Extraversion does not necessarily mean disliking people. It may simply reflect a preference for less social stimulation.',
  },
  {
    key: 'A', zh: '宜人性', en: 'Agreeableness',
    defZh: '宜人性描述一個人的同理心、合作性、信任，以及對他人的關心程度。',
    defEn: 'Agreeableness describes compassion, cooperation, trust, and concern for other people.',
    hlZh: '得分較高的人通常較體貼、富有同情心，並願意與他人合作。得分較低的人可能較懷疑他人、表達較直接、競爭性較強，或較願意質疑和挑戰他人。',
    hlEn: 'People with higher scores tend to be considerate, sympathetic, and willing to cooperate. People with lower scores may be more sceptical, direct, competitive, or willing to challenge others.',
    noteZh: '', noteEn: '',
  },
  {
    key: 'N', zh: '神經質', en: 'Neuroticism',
    defZh: '神經質描述一個人出現憂慮、壓力、悲傷和其他負面情緒的強度和頻率。',
    defEn: 'Neuroticism describes how strongly and frequently a person tends to experience worry, stress, sadness, and other negative emotions.',
    hlZh: '得分較高的人可能對威脅、問題和情緒變化較敏感。得分較低的人通常較能保持冷靜，並較容易從壓力經驗中恢復。',
    hlEn: 'People with higher scores may be more sensitive to threats, problems, and emotional changes. People with lower scores tend to remain calmer and recover more easily from stressful experiences.',
    noteZh: '部分問卷會使用「情緒穩定性」一詞，代表與神經質相反的方向。情緒穩定性得分愈高，通常表示神經質程度愈低。',
    noteEn: 'Some questionnaires use the term Emotional Stability, which represents the opposite direction of Neuroticism. Higher Emotional Stability generally corresponds to lower Neuroticism.',
  },
] as const;

export function DimensionSummaryButton({ locale }: { locale: Locale }) {
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

          {/* 五维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列——与结果页一致 */}
          <div className="overflow-hidden rounded-[1.1rem] border border-[var(--psy-border)] text-[14px]">
            {DIMS.map((d, i) => (
              <div key={d.key} className={`flex flex-col sm:flex-row ${i > 0 ? 'border-t border-[var(--psy-border)]' : ''}`}>
                <div className="flex items-center gap-2 border-b border-[var(--psy-border)] bg-[var(--psy-accent-soft)] px-3 py-2.5 sm:w-52 sm:shrink-0 sm:items-start sm:border-b-0 sm:border-r sm:px-4 sm:py-3">
                  <span className="h-2 w-2 shrink-0 rounded-full sm:mt-[6px]" style={{ backgroundColor: DIMENSION_META[d.key as Dimension].colorHex }} />
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
                  {(isEn ? d.noteEn : d.noteZh) && (
                    <p className="text-[12px] leading-5 text-[var(--psy-muted)]">{isEn ? d.noteEn : d.noteZh}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PsyOverlayPanel>
    </>
  );
}
