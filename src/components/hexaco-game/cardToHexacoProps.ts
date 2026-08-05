import { GameCard, isPersonalityCard } from '@/types/hexaco-game';
import type { Locale } from '@/lib/i18n';

// GameCard → HexacoCard 入参的统一映射（cardToTarotProps 的 HEXACO 平行版本）。
// HEXACO 卡图固定读 public/cards/hexaco/（60 张全套，与大五的 /cards/ 完全分离）；
// 复制牌(id 5000+)用 imageId 指回原题图。缺图由 HexacoCard 回退 ◈。
export function cardToHexacoProps(card: GameCard, locale: Locale) {
  const persona = isPersonalityCard(card);
  return {
    text: card.text,
    textEn: card.textEn,
    dimension: persona ? card.dimension : undefined,
    imageSrc: persona ? `/cards/hexaco/${card.imageId ?? card.id}.webp` : undefined,
    isDummy: !persona,
    description: persona ? undefined : (locale === 'en' ? (card.definitionEn ?? card.definition) : card.definition),
    locale,
  };
}
