'use client';

// 密码输入框：框内右侧内嵌「眼睛」图标切换明/暗文（取代原来标签行的「顯示」文字按钮）。
// 自带 show 状态，每个实例独立；aria-label 随语言走。2026-07-22。

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { AUTH_T } from '@/lib/i18n/auth';

interface PasswordInputProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** 无可见 <label> 时用（如 reset 页）——直接给输入框加 aria-label。 */
  ariaLabel?: string;
  locale: Locale;
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  ariaLabel,
  locale,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const t = AUTH_T[locale];

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        // psy-input 是未分层 CSS（padding 简写会盖过 Tailwind 的 pr-*），
        // 用内联 paddingRight 强制给眼睛按钮留位。
        style={{ paddingRight: '3rem' }}
        className="psy-input w-full"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t.hide : t.show}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--psy-muted)] transition hover:text-[var(--psy-ink-soft)]"
      >
        {show ? (
          // eye-off
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
        ) : (
          // eye
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
