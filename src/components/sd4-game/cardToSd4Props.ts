import { GameCard, isPersonalityCard } from '@/types/sd4-game';
import type { Locale } from '@/lib/i18n';

// GameCard → Sd4Card 入参的统一映射（cardToHexacoProps 的 SD4 平行版本）。
// SD4 卡图固定读 public/cards/sd4/（28 张全套，与大五 /cards/、HEXACO /cards/hexaco/ 完全分离）；
// 复制牌(id 5000+)用 imageId 指回原题图。缺图由 Sd4Card 回退 ◈。
export function cardToSd4Props(card: GameCard, locale: Locale) {
  const persona = isPersonalityCard(card);
  return {
    text: card.text,
    textEn: card.textEn,
    dimension: persona ? card.dimension : undefined,
    imageSrc: persona ? `/cards/sd4/${card.imageId ?? card.id}.webp` : undefined,
    isDummy: !persona,
    description: persona ? undefined : (locale === 'en' ? (card.definitionEn ?? card.definition) : card.definition),
    locale,
  };
}
