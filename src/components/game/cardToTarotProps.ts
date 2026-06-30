import { GameCard, isPersonalityCard } from '@/types';
import type { Locale } from '@/lib/i18n';

// GameCard → TarotCard 入参的统一映射：人格牌带图(/cards/{id}.webp)+维度；
// 知识牌(dummy)带 description(定义) 走纯文字版式。全卡组件统一用这个，避免各处重复展开。
export function cardToTarotProps(card: GameCard, locale: Locale) {
  const persona = isPersonalityCard(card);
  return {
    text: card.text,
    textEn: card.textEn, // 人格牌+知识牌都带：术语/题面英文，由 TarotCard 按 locale 取
    dimension: persona ? card.dimension : undefined,
    imageSrc: persona ? `/cards/${card.imageId ?? card.id}.webp` : undefined,
    isDummy: !persona,
    // 知识牌定义按 locale 切换（definition 繁中 / definitionEn 英文）
    description: persona ? undefined : (locale === 'en' ? (card.definitionEn ?? card.definition) : card.definition),
    locale,
  };
}
