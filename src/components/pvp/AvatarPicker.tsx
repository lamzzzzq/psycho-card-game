'use client';

import { useState } from 'react';
import { AVATAR_EMOJIS } from '@/data/avatars';

interface AvatarPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

// 頭像數量多（180+），不內聯平鋪：點擊當前頭像 → 展開可滾動的小縮略圖網格挑選。
export function AvatarPicker({ value, onChange, label = '選擇頭像' }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="psy-eyebrow text-[10px]">{label}</p>
        <span className="text-xl leading-none">{value}</span>
      </div>

      {/* 觸發器：顯示當前頭像 + 提示，點擊展開/收起 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="psy-tile flex w-full items-center justify-between px-4 py-2.5 text-sm transition"
      >
        <span className="flex items-center gap-2">
          <span className="text-2xl leading-none">{value}</span>
          <span className="text-[var(--psy-ink-soft)]">{open ? '收起' : '點擊選擇頭像'}</span>
        </span>
        <span className={`text-xs text-[var(--psy-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* 展開：可滾動的小縮略圖網格 */}
      {open && (
        <div
          className="psy-panel max-h-56 overflow-y-auto rounded-[1rem] p-2"
          style={{ borderColor: 'rgba(200,155,93,0.18)' }}
        >
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
            {AVATAR_EMOJIS.map((emoji) => {
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
                  className={`flex aspect-square items-center justify-center rounded-md text-lg leading-none transition hover:scale-110 ${
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
      )}
    </div>
  );
}
