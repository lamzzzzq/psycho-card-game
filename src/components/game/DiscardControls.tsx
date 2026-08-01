'use client';

import { STRINGS, type Locale } from '@/lib/i18n';

interface DiscardControlsProps {
  locale?: Locale;
  /** 已圈定要棄的那張牌；null = 還沒點牌 */
  discardPickId: number | null;
  onCancel: () => void;
  onSubmit: (cardId: number) => void;
}

/**
 * 出牌階段的「取消 / 提交棄牌」胶囊。單機與 PVP【共用同一個組件】——
 * 老闆多次要求兩邊完全一致，之前兩處各畫一份（單機在操作排、PVP 在
 * PlayerHand 裏），改一邊漏一邊。要改樣式/行為請只改這裏。
 *
 * 規則（老闆 2026-08-01）：
 *   - 出牌階段一進來就顯示，兩顆鈕置灰不可點（"When this is shown, the box
 *     below shd be shown, but dimmed"）；圈定一張牌後才亮起。
 *   - 未圈定時不顯示提示文案 —— 那句「先點擊一張要捨棄的牌」已經在上方
 *     回合行（FilingProgressCard 的 info 位）出現過，重複顯示被指出過。
 *
 * 顯示時機由調用方控制（必須是自己回合的出牌階段，且不在查看/碰牌意圖中）。
 */
export function DiscardControls({
  locale = 'zh',
  discardPickId,
  onCancel,
  onSubmit,
}: DiscardControlsProps) {
  const t = STRINGS[locale].game;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] px-3 py-1.5">
      {discardPickId !== null && (
        <span className="hidden max-w-[15rem] truncate text-xs text-[var(--psy-muted)] sm:inline">
          {t.confirmDiscardHint}
        </span>
      )}
      <button
        onClick={onCancel}
        disabled={discardPickId === null}
        className="psy-btn psy-btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-35"
      >
        {t.cancel}
      </button>
      <button
        onClick={() => {
          if (discardPickId === null) return;
          onSubmit(discardPickId);
          onCancel();
        }}
        disabled={discardPickId === null}
        className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35"
        title={discardPickId === null ? t.pickDiscard : undefined}
      >
        {t.submitDiscard}
      </button>
    </div>
  );
}
