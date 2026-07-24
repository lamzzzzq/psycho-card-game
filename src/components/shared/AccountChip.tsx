'use client';

// 账号入口徽标（各页右上角）。未登录 → 「登入」按钮；已登录 → 头像 + 下拉(学号/邮箱 · 设置 · 退出登入)。
// 结构参考通用 SaaS 顶栏，配色用本站米金浅色主题。2026-07-21。

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { useAuthSession } from '@/lib/useAuthSession';
import { useProfileAvatar } from '@/stores/useProfileAvatar';
import { useBgm } from '@/stores/useBgm';
import { signOutUser } from '@/lib/auth';

export function AccountChip() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const { loading, userId, studentId, recoveryEmail } = useAuthSession();
  const { avatar: sharedAvatar, load: loadAvatar } = useProfileAvatar();
  const bgmOn = useBgm((s) => s.enabled);
  const toggleBgm = useBgm((s) => s.toggle);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 载入共享头像（各页互通）
  useEffect(() => {
    if (userId) void loadAvatar(userId);
  }, [userId, loadAvatar]);

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

  const face = sharedAvatar ?? '🙂';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.accountTitle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-surface)] text-2xl shadow-[var(--psy-shadow)] transition hover:border-[var(--psy-accent)]"
      >
        {face}
        {/* 右下角设置齿轮：点头像即开设置/退出下拉，齿轮作可视提示 */}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--psy-accent)] text-[#1a1206] shadow-[0_1px_3px_rgba(96,72,38,0.35)] ring-2 ring-[var(--psy-bg)]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
            <path d="M19.14 12.94a7.5 7.5 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7 7 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54a7 7 0 00-1.62.94l-2.39-.96a.5.5 0 00-.6.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58a7.5 7.5 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.05.7 1.62.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54a7 7 0 001.62-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
          </svg>
        </span>
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

          {/* 背景音乐开关（收在菜单里，避免浮动按钮撞底栏）*/}
          <button
            onClick={toggleBgm}
            role="switch"
            aria-checked={bgmOn}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[var(--psy-ink)] transition hover:bg-[var(--psy-surface-strong)]"
          >
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[var(--psy-muted)]" aria-hidden>
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              {t.menuBgm}
            </span>
            {/* 轨道式开关：开=金色靠右，关=灰色靠左 */}
            <span
              aria-hidden
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${bgmOn ? 'bg-[var(--psy-accent)]' : 'bg-[var(--psy-border)]'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${bgmOn ? 'left-[1.125rem]' : 'left-0.5'}`} />
            </span>
          </button>

          <div className="h-px bg-[var(--psy-border)]" />

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
