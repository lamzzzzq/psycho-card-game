import { Question } from '@/types';

/**
 * IPIP-50 Big Five 人格測評（50 題）
 * 來源：docs/Big Five Personality_20260612.xlsx（Goldberg, 1999 / IPIP）
 * 順序：嚴格按文件「correct order」E/A/C/N/O 交錯排列，不打亂。
 * reversed：嚴格照文件 (- keyed) 標記。計分 reversed 時用 6 - rawScore。
 * ⚠️ N 維度文件按『情緒穩定』方向 keying（放鬆/不憂鬱為正向），
 *    故 N 高分 = 情緒穩定冷靜，維度標籤已改為「情緒穩定性 / Emotional Stability」。
 * 中英雙語：text 繁中、textEn 英文，語言由 locale 切換。
 */
export const QUESTIONS: Question[] = [
  { id: 1, dimension: 'E', reversed: false, text: '我是派對中的靈魂人物。', textEn: 'Am the life of the party.' },
  { id: 2, dimension: 'A', reversed: true, text: '我覺得自己很少關心別人。', textEn: 'Feel little concern for others.' },
  { id: 3, dimension: 'C', reversed: false, text: '我隨時做好準備。', textEn: 'Am always prepared.' },
  { id: 4, dimension: 'N', reversed: true, text: '我容易感到壓力過大。', textEn: 'Get stressed out easily.' },
  { id: 5, dimension: 'O', reversed: false, text: '我詞彙豐富。', textEn: 'Have a rich vocabulary.' },
  { id: 6, dimension: 'E', reversed: true, text: '我話不多。', textEn: 'Don\'t talk a lot.' },
  { id: 7, dimension: 'A', reversed: false, text: '我對人感興趣。', textEn: 'Am interested in people.' },
  { id: 8, dimension: 'C', reversed: true, text: '我總是丟三落四。', textEn: 'Leave my belongings around.' },
  { id: 9, dimension: 'N', reversed: false, text: '我大多時候是放鬆的。', textEn: 'Am relaxed most of the time.' },
  { id: 10, dimension: 'O', reversed: true, text: '我對於理解抽象概念有困難。', textEn: 'Have difficulty understanding abstract ideas.' },
  { id: 11, dimension: 'E', reversed: false, text: '我和其他人在一起時感覺自在。', textEn: 'Feel comfortable around people.' },
  { id: 12, dimension: 'A', reversed: true, text: '我會侮辱別人。', textEn: 'Insult people.' },
  { id: 13, dimension: 'C', reversed: false, text: '我經常注意細節。', textEn: 'Pay attention to details.' },
  { id: 14, dimension: 'N', reversed: true, text: '我時常為事擔心。', textEn: 'Worry about things.' },
  { id: 15, dimension: 'O', reversed: false, text: '我有生動的想像力。', textEn: 'Have a vivid imagination.' },
  { id: 16, dimension: 'E', reversed: true, text: '我是個低調的人。', textEn: 'Keep in the background.' },
  { id: 17, dimension: 'A', reversed: false, text: '我會同情他人的感受。', textEn: 'Sympathize with others\' feelings.' },
  { id: 18, dimension: 'C', reversed: true, text: '我常把事物弄得一團糟。', textEn: 'Make a mess of things.' },
  { id: 19, dimension: 'N', reversed: false, text: '我很少感到鬱悶。', textEn: 'Seldom feel blue.' },
  { id: 20, dimension: 'O', reversed: true, text: '我對抽象概念不感興趣。', textEn: 'Am not interested in abstract ideas.' },
  { id: 21, dimension: 'E', reversed: false, text: '我總是主動開始談話。', textEn: 'Start conversations.' },
  { id: 22, dimension: 'A', reversed: true, text: '我對別人的問題不感興趣。', textEn: 'Am not interested in other people\'s problems.' },
  { id: 23, dimension: 'C', reversed: false, text: '我會立即將日常家務做完。', textEn: 'Get chores done right away.' },
  { id: 24, dimension: 'N', reversed: true, text: '我容易受擾亂。', textEn: 'Am easily disturbed.' },
  { id: 25, dimension: 'O', reversed: false, text: '我常有絕佳的點子。', textEn: 'Have excellent ideas.' },
  { id: 26, dimension: 'E', reversed: true, text: '我沒什麼話說。', textEn: 'Have little to say.' },
  { id: 27, dimension: 'A', reversed: false, text: '我有顆柔軟的心。', textEn: 'Have a soft heart.' },
  { id: 28, dimension: 'C', reversed: true, text: '我常忘記物歸原處。', textEn: 'Often forget to put things back in their proper place.' },
  { id: 29, dimension: 'N', reversed: true, text: '我容易感到悶悶不樂。', textEn: 'Get upset easily.' },
  { id: 30, dimension: 'O', reversed: true, text: '我想像力欠佳。', textEn: 'Do not have a good imagination.' },
  { id: 31, dimension: 'E', reversed: false, text: '在聚會中我會跟許多不同的人說話。', textEn: 'Talk to a lot of different people at parties.' },
  { id: 32, dimension: 'A', reversed: true, text: '我對別人沒什麼興趣。', textEn: 'Am not really interested in others.' },
  { id: 33, dimension: 'C', reversed: false, text: '我喜歡井然有序。', textEn: 'Like order.' },
  { id: 34, dimension: 'N', reversed: true, text: '我的心情變化很大。', textEn: 'Change my mood a lot.' },
  { id: 35, dimension: 'O', reversed: false, text: '我可以很快理解事物。', textEn: 'Am quick to understand things.' },
  { id: 36, dimension: 'E', reversed: true, text: '我不喜歡引起別人對自己的注意。', textEn: 'Don\'t like to draw attention to myself.' },
  { id: 37, dimension: 'A', reversed: false, text: '我總會為別人抽出時間。', textEn: 'Take time out for others.' },
  { id: 38, dimension: 'C', reversed: true, text: '我會推卸責任。', textEn: 'Shirk my duties.' },
  { id: 39, dimension: 'N', reversed: true, text: '我的心情時常起伏不定。', textEn: 'Have frequent mood swings.' },
  { id: 40, dimension: 'O', reversed: false, text: '我常使用艱澀的字彙。', textEn: 'Use difficult words.' },
  { id: 41, dimension: 'E', reversed: false, text: '我不介意成為注目的焦點。', textEn: 'Don\'t mind being the center of attention.' },
  { id: 42, dimension: 'A', reversed: false, text: '我能感受他人的情緒。', textEn: 'Feel others\' emotions.' },
  { id: 43, dimension: 'C', reversed: false, text: '我總是按照預定計畫行事。', textEn: 'Follow a schedule.' },
  { id: 44, dimension: 'N', reversed: true, text: '我容易感到煩躁。', textEn: 'Get irritated easily.' },
  { id: 45, dimension: 'O', reversed: false, text: '我會花時間反思事物。', textEn: 'Spend time reflecting on things.' },
  { id: 46, dimension: 'E', reversed: true, text: '我和陌生人相處時顯得安靜。', textEn: 'Am quiet around strangers.' },
  { id: 47, dimension: 'A', reversed: false, text: '我能使人感到自在。', textEn: 'Make people feel at ease.' },
  { id: 48, dimension: 'C', reversed: false, text: '我對我的工作要求嚴謹。', textEn: 'Am exacting in my work.' },
  { id: 49, dimension: 'N', reversed: true, text: '我常感到鬱悶。', textEn: 'Often feel blue.' },
  { id: 50, dimension: 'O', reversed: false, text: '我總是充滿想法。', textEn: 'Am full of ideas.' },
];
