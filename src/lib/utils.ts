export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 學號歸一：去空白 + 全大寫。大小寫不分（17094905g 與 17094905G 視為同一個）。
export function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

// 學號嚴格 9 位（PolyU：典型為 8 數字 + 1 英文字母，但不強制格式，只校驗長度）。
export const STUDENT_ID_LENGTH = 9;
export function isValidStudentId(raw: string): boolean {
  return normalizeStudentId(raw).length === STUDENT_ID_LENGTH;
}
