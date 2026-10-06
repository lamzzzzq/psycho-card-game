import { describe, it, expect, vi } from 'vitest';

// 只测纯函数；supabase 客户端在测试环境没有 env，mock 掉免得 import 时抛错
vi.mock('../supabase', () => ({ supabase: {} }));
vi.mock('../auth', () => ({ getCurrentStudentId: async () => null }));
import { quizContextFromPath } from '../quiz-record';

describe('quizContextFromPath', () => {
  it('三套聯機對局頁 → pvp + 房號', () => {
    expect(quizContextFromPath('/pvp/game/1234')).toEqual({ mode: 'pvp', roomCode: '1234' });
    expect(quizContextFromPath('/hexaco-pvp/game/5678')).toEqual({ mode: 'pvp', roomCode: '5678' });
    expect(quizContextFromPath('/sd4-pvp/game/0042')).toEqual({ mode: 'pvp', roomCode: '0042' });
  });
  it('單機對局頁 / 大廳 / 空值 → single', () => {
    for (const p of ['/game', '/hexaco-game', '/sd4-game', '/pvp', '/pvp/room/1234', null]) {
      expect(quizContextFromPath(p)).toEqual({ mode: 'single', roomCode: null });
    }
  });
});
