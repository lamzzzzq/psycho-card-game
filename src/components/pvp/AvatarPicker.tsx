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
  // 展开后按分类 tab 切换；默认停在当前头像所属的分类
  const [activeTab, setActiveTab] = useState<'face' | 'animal' | 'people'>(
    AVATAR_GROUPS.find((g) => g.emojis.includes(value))?.key ?? 'face',
  );
  const activeGroup = AVATAR_GROUPS.find((g) => g.key === activeTab) ?? AVATAR_GROUPS[0];
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

      {/* 展開：頂部分類 tab + 當前分類網格 */}
      {open && (
        <div
          className="psy-panel rounded-[1rem] p-2"
          style={{ borderColor: 'rgba(200,155,93,0.18)' }}
        >
          {/* 分類 tab：點一下直接切分類，快速定位 */}
          <div className="mb-2 flex gap-1">
            {AVATAR_GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setActiveTab(g.key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  activeTab === g.key
                    ? 'bg-[var(--psy-accent-soft)] text-[var(--psy-accent)]'
                    : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
                }`}
              >
                {en ? g.label.en : g.label.zh}
              </button>
            ))}
          </div>
          {/* 當前分類網格（可滾動）*/}
          <div className="max-h-52 overflow-y-auto">
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {activeGroup.emojis.map((emoji) => {
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
        </div>
      )}
    </div>
  );
}
