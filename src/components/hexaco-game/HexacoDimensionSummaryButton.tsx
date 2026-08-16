'use client';

// HEXACO 版对局内「維度速查 / Dimensions」按钮，摆在玩法教學左边。2026-08-16。
// 来由：老板反馈——semi-open / hidden 难度下玩家判断「這張牌屬於哪一維」缺依据，
// 希望对局中随时能看到 profile 页那份六维介绍。拍板：三档难度都显示，不按难度分流。
//
// ⚠️ 物理隔离：DIMS 文案是 components/results/HexacoIntro.tsx 的独立副本，不 import、不共用。
// 已定稿的结果页组件一行不改。文案逐字照 The HEXACO Model_20260723 官方文档（中英双语）。
// 与结果页版本的差别：只保留六维表（判断依据），去掉模型总述、「在這個遊戲中…」段落和参考文献
// ——对局中要的是速查，不是科普全文。

import { useState } from 'react';
import { STRINGS, type Locale } from '@/lib/i18n';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

const DIMS = [
  {
    key: 'H', zh: '誠實－謙遜', en: 'Honesty–Humility', color: '#5F7A46',
    defZh: '誠實－謙遜描述一個人的真誠、公平、謙遜，以及不願為了個人利益而利用他人的傾向。',
    defEn: 'Honesty–Humility describes sincerity, fairness, modesty, and unwillingness to exploit others for personal gain.',
    hlZh: '得分較高的人通常會避免欺騙或操控他人，亦較不重視財富、地位和特殊待遇。得分較低的人可能較願意使用奉承、為個人利益而變通規則，或追求地位和認同。',
    hlEn: 'People with higher scores tend to avoid cheating or manipulating others and place less importance on wealth, status, and special treatment. People with lower scores may be more willing to use flattery, bend rules for personal benefit, or seek status and recognition.',
    noteZh: '這是 HEXACO 模型中特有的向度，在五大人格模型中並沒有直接對應的獨立向度。',
    noteEn: 'This dimension is distinctive to HEXACO and has no direct equivalent in the Big Five.',
  },
  {
    key: 'E', zh: '情緒性', en: 'Emotionality', color: '#7E6C8F',
    defZh: '情緒性描述一個人的恐懼、焦慮、情感依附、感性程度，以及對支持的需要。',
    defEn: 'Emotionality describes fearfulness, anxiety, emotional attachment, sentimentality, and need for support.',
    hlZh: '得分較高的人可能較擔心危險、較容易與他人建立強烈的情感連繫，並在面對困難時較傾向尋求支持。得分較低的人可能較少感到害怕、較不感性，並在情緒上較為獨立。',
    hlEn: 'People with higher scores may be more concerned about danger, form stronger emotional bonds, and seek support during difficult situations. People with lower scores may be less fearful, less sentimental, and more emotionally independent.',
    noteZh: '情緒性與五大人格中的神經質有關，但兩者並不相同。在 HEXACO 模型中，憤怒和易怒主要反映於較低的宜人性，而不是較高的情緒性。',
    noteEn: 'Emotionality is related to, but different from, Big Five Neuroticism. In HEXACO, anger and irritability are mainly reflected in lower Agreeableness rather than higher Emotionality.',
  },
  {
    key: 'X', zh: '外向性', en: 'Extraversion', color: '#D97706',
    defZh: '外向性描述一個人的社交自信、社交性、活力和熱情。',
    defEn: 'Extraversion describes social confidence, sociability, energy, and enthusiasm.',
    hlZh: '得分較高的人通常較喜歡社交互動、在他人面前較有自信，並表現出較多活力和熱情。得分較低的人可能較安靜、含蓄，並較喜歡較少的社交刺激。',
    hlEn: 'People with higher scores tend to enjoy social interaction, feel confident around others, and show greater energy and enthusiasm. People with lower scores may be quieter, more reserved, and more comfortable with less social stimulation.',
    noteZh: '這個向度與五大人格中的外向性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Extraversion.',
  },
  {
    key: 'A', zh: '宜人性', en: 'Agreeableness', color: '#E07A5F',
    defZh: 'HEXACO 的宜人性描述一個人的耐性、寬恕、溫和，以及願意妥協的程度，尤其是在面對衝突時。',
    defEn: 'HEXACO Agreeableness describes patience, forgiveness, gentleness, and willingness to compromise, especially during conflict.',
    hlZh: '得分較高的人通常較能管理自己的憤怒、原諒他人，並在意見不合時保持彈性。得分較低的人可能較挑剔、固執、容易動怒，或較容易記恨。',
    hlEn: 'People with higher scores tend to manage their anger, forgive others, and remain flexible during disagreements. People with lower scores may be more critical, stubborn, quick-tempered, or likely to hold a grudge.',
    noteZh: '這與五大人格中的宜人性有所不同。五大人格的宜人性較廣泛地着重同理心、信任、合作和對他人的關心。',
    noteEn: 'This differs from Big Five Agreeableness, which focuses more broadly on compassion, trust, cooperation, and concern for others.',
  },
  {
    key: 'C', zh: '盡責性', en: 'Conscientiousness', color: '#2A4365',
    defZh: '盡責性描述一個人的組織能力、勤奮、細心程度和自律。',
    defEn: 'Conscientiousness describes organisation, diligence, carefulness, and self-discipline.',
    hlZh: '得分較高的人通常會預先規劃、認真工作，並在面對困難任務時堅持下去。得分較低的人可能較喜歡彈性和隨性，亦可能較缺乏組織。',
    hlEn: 'People with higher scores tend to plan ahead, work carefully, and persist with difficult tasks. People with lower scores may prefer flexibility and spontaneity and may be less organised.',
    noteZh: '這個向度與五大人格中的盡責性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Conscientiousness.',
  },
  {
    key: 'O', zh: '開放性', en: 'Openness', color: '#2A9D8F',
    defZh: '開放性描述一個人的好奇心、創造力、對藝術和美感的欣賞，以及對新穎或非傳統觀念的興趣。',
    defEn: 'Openness describes curiosity, creativity, appreciation of art and beauty, and interest in new or unconventional ideas.',
    hlZh: '得分較高的人通常較喜歡學習、運用想像力和探索不同觀點。得分較低的人可能較偏好熟悉的觀念、實際的活動和傳統的做法。',
    hlEn: 'People with higher scores tend to enjoy learning, using their imagination, and exploring different perspectives. People with lower scores may prefer familiar ideas, practical activities, and traditional approaches.',
    noteZh: '這個向度與五大人格中的開放性大致相似。',
    noteEn: 'This dimension is broadly similar to Big Five Openness.',
  },
] as const;

export function HexacoDimensionSummaryButton({ locale }: { locale: Locale }) {
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

          {/* 六维表格：移动端上下堆叠(名称块在上、说明在下)，桌面端 2 列——与结果页一致 */}
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
