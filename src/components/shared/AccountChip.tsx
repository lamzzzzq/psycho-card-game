'use client';

// 账号入口徽标（各页右上角）。未登录 → 「登入」按钮；已登录 → 头像 + 下拉(学号/邮箱 · 设置 · 退出登入)。
// 结构参考通用 SaaS 顶栏，配色用本站米金浅色主题。2026-07-21。

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { useAuthSession } from '@/lib/useAuthSession';
import { signOutUser } from '@/lib/auth';

export function AccountChip() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const { loading, userId, studentId, recoveryEmail, avatar } = useAuthSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部 / Escape 关闭下拉
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // 加载中不占位（避免闪烁）
  if (loading) return null;

  // 未登录 → 登入按钮
  if (!userId) {
    return (
      <Link
        href="/login"
        className="psy-btn psy-btn-ghost psy-serif rounded-full px-5 py-2 text-sm font-semibold"
      >
        {t.login}
      </Link>
    );
  }

  const face = avatar ?? '🙂';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.accountTitle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-surface)] text-2xl shadow-[var(--psy-shadow)] transition hover:border-[var(--psy-accent)]"
      >
        {face}
      </button>

      {open && (
        <div className="psy-panel absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl p-0">
          {/* 身份卡：头像 + 学号 + 邮箱 */}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--psy-surface-strong)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--psy-bg)] text-xl">
              {face}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium tracking-[0.1em] text-[var(--psy-ink)]">
                {studentId}
              </span>
              {recoveryEmail && (
                <span className="block truncate text-xs text-[var(--psy-muted)]">{recoveryEmail}</span>
              )}
            </span>
          </Link>

          <div className="h-px bg-[var(--psy-border)]" />

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm text-[var(--psy-ink)] transition hover:bg-[var(--psy-surface-strong)]"
          >
            {t.menuSettings}
          </Link>

          <button
            onClick={async () => {
              setOpen(false);
              await signOutUser();
            }}
            className="block w-full px-4 py-3 text-left text-sm text-[var(--psy-ink)] transition hover:bg-[var(--psy-surface-strong)]"
          >
            {t.menuLogout}
          </button>
        </div>
      )}
    </div>
  );
}
