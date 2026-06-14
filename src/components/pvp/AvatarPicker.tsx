'use client';

import { useState } from 'react';
import { AVATAR_EMOJIS } from '@/data/avatars';

interface AvatarPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

// 左右結構：左側大頭像預覽（點擊展開），右側提示 + 展開箭頭。
// 頭像數量多（180+），不內聯平鋪：展開後顯示可滾動的小縮略圖網格。
export function AvatarPicker({ value, onChange, label = '選擇頭像' }: AvatarPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="psy-eyebrow text-[10px]">{label}</p>

      <div className="flex items-stretch gap-3">
        {/* 左：大頭像預覽，點擊展開 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={label}
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
          <span className="text-[var(--psy-ink-soft)]">{open ? '收起頭像選擇' : '點擊選擇頭像'}</span>
          <span className={`text-xs text-[var(--psy-muted)] transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* 展開：可滾動的小縮略圖網格 */}
      {open && (
        <div
          className="psy-panel max-h-60 overflow-y-auto rounded-[1rem] p-2"
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
      )}
    </div>
  );
}
