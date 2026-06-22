// 校验：人格牌的「插画(按 imageId 命名 /cards/{imageId}.webp) ↔ 卡面文字」始终对应，
// 且复制牌的 imageId 必在 1-50（有真图，不空白）、每维度随机不重复复制。
import { describe, it, expect } from 'vitest';
import { generatePersonalityCards } from '@/lib/card-engine';
import { QUESTIONS } from '@/data/questions';

const qById = new Map(QUESTIONS.map((q) => [q.id, q]));

describe('personality card image ↔ text correspondence', () => {
  for (const count of [50, 60, 80] as const) {
    it(`deck(${count}): 每张牌的 imageId 都指向「文字/维度完全一致」的真题(1-50)`, () => {
      const deck = generatePersonalityCards(count);
      expect(deck.length).toBe(count);
      for (const c of deck) {
        const imgId = c.imageId ?? c.id;
        // 图 id 必在 1-50（public/cards 有该 webp，不会空白）
        expect(imgId, `imageId ${imgId} 必须是真题 1-50`).toBeGreaterThanOrEqual(1);
        expect(imgId).toBeLessThanOrEqual(50);
        const q = qById.get(imgId)!;
        expect(q).toBeDefined();
        // 该 imageId 对应的图所画的，正是这张卡的文字 → 图文同源、对应
        expect(c.text).toBe(q.text);
        expect(c.textEn).toBe(q.textEn);
        expect(c.dimension).toBe(q.dimension);
      }
    });
  }

  it('每维度复制张数正确，且复制的是「随机不重复」的同维度真题', () => {
    for (const [count, perDimCopies] of [[60, 2], [80, 6]] as const) {
      const deck = generatePersonalityCards(count);
      const byDim: Record<string, typeof deck> = {};
      for (const c of deck) (byDim[c.dimension] ??= []).push(c);
      for (const d of Object.keys(byDim)) {
        expect(byDim[d].length).toBe(count / 5);          // 每维度总张数
        const copies = byDim[d].filter((c) => c.id >= 5000);
        expect(copies.length).toBe(perDimCopies);          // 复制张数
        const imgs = copies.map((c) => c.imageId);
        expect(new Set(imgs).size).toBe(perDimCopies);     // 不重复
      }
    }
  });

  it('复制是随机的（多次生成 80 张，复制集合不应每次都相同）', () => {
    const sig = () => generatePersonalityCards(80).filter((c) => c.id >= 5000).map((c) => c.imageId).sort((a, b) => (a! - b!)).join(',');
    const runs = new Set(Array.from({ length: 8 }, sig));
    expect(runs.size).toBeGreaterThan(1); // 8 次里至少出现 2 种不同的复制组合
  });
});
