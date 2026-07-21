'use client';

import { useState } from 'react';
import { AVATAR_GROUPS } from '@/data/avatars';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

interface AvatarPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

// 左右結構：左側大頭像預覽（點擊展開），右側提示 + 展開箭頭。
// 頭像數量多（180+），不內聯平鋪：展開後顯示可滾動的小縮略圖網格。
export function AvatarPicker({ value, onChange, label }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const en = (hydrated ? localeRaw : 'zh') === 'en';
  const labelText = label ?? (en ? 'Choose avatar' : '選擇頭像');

  return (
    <div className="space-y-2">
      <p className="psy-eyebrow text-[10px]">{labelText}</p>

      <div className="flex items-stretch gap-3">
        {/* 左：大頭像預覽，點擊展開 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={labelText}
          className="psy-tile flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.1rem] transition hover:scale-[1.03]"
        >
          <span className="text-4xl leading-none sm:text-5xl">{value}</span>
        </button>

        {/* 右：提示 + 箭頭，填滿剩餘寬度 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="psy-tile flex flex-1 items-center justify-between px-4 py-3 text-sm transition"
        >
          <span className="text-[var(--psy-ink-soft)]">{open ? (en ? 'Collapse' : '收起頭像選擇') : (en ? 'Tap to choose avatar' : '點擊選擇頭像')}</span>
          <span className={`text-xs text-[var(--psy-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* 展開：可滾動的小縮略圖網格 */}
      {open && (
        <div
          className="psy-panel max-h-60 overflow-y-auto rounded-[1rem] p-2"
          style={{ borderColor: 'rgba(200,155,93,0.18)' }}
        >
          {AVATAR_GROUPS.map((group) => (
            <div key={group.key} className="mb-1">
              {/* 分類小標題：滾動時吸頂 */}
              <p className="psy-eyebrow sticky top-0 z-10 -mx-2 mb-1 bg-[var(--psy-surface)] px-3 py-1 text-[10px] text-[var(--psy-muted)]">
                {en ? group.label.en : group.label.zh}
              </p>
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                {group.emojis.map((emoji) => {
                  const active = value === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji);
                        setOpen(false);
                      }}
                      aria-pressed={active}
                      title={emoji}
                      className={`flex aspect-square items-center justify-center rounded-md text-xl leading-none transition hover:scale-110 ${
                        active ? 'ring-2 ring-[var(--psy-accent)] scale-110' : ''
                      }`}
                      style={{ backgroundColor: active ? 'rgba(200,155,93,0.18)' : 'rgba(255,255,255,0.03)' }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
