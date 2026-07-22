'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { AuthTopBar } from '@/components/shared/AuthTopBar';
import { signInWithStudentId, isSessionActiveElsewhere, claimSession, signOutUser, currentUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { normalizeStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // 单会话：其它设备已登入 → 弹确认「继续会顶掉对方」
  const [conflict, setConflict] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  // 被其它设备顶下线后回到登录页的提示
  const [kicked, setKicked] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('kicked') === '1') setKicked(true);
  }, []);

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;
  const canSubmit = idOk && password.length > 0 && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setKicked(false);
    setBusy(true);
    const res = await signInWithStudentId(studentId, password);
    if (!res.ok) {
      setBusy(false);
      return setError(t.err[res.error] ?? t.err.unknown);
    }
    const uid = await currentUserId();
    if (!uid) {
      setBusy(false);
      return setError(t.err.unknown);
    }
    // 其它设备近期活跃 → 先弹确认，不导航
    if (await isSessionActiveElsewhere(uid)) {
      setBusy(false);
      setPendingUid(uid);
      setConflict(true);
      return;
    }
    await claimSession(uid);
    setBusy(false);
    router.push('/');
  }

  // 确认：占用会话 + 顶掉其它设备
  async function confirmTakeover() {
    if (!pendingUid) return;
    setBusy(true);
    await claimSession(pendingUid);
    await supabase.auth.signOut({ scope: 'others' });
    setBusy(false);
    router.push('/');
  }

  // 取消：登出本次登录，不影响对方
  async function cancelTakeover() {
    setConflict(false);
    setPendingUid(null);
    await signOutUser();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pt-14 pb-12 sm:pt-20">
      <AuthTopBar />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <Link
          href="/"
          className="mb-10 inline-block text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
        >
          {t.backHome}
        </Link>
        <h1 className="psy-serif text-center text-2xl font-semibold text-[var(--psy-ink)]">
          {t.loginTitle}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-[var(--psy-muted)]">
          {t.loginSubtitle}
        </p>
        {kicked && (
          <p className="mt-4 text-center text-sm leading-6 text-[var(--psy-danger)]">{t.sessionKicked}</p>
        )}

        <form onSubmit={onSubmit} className="mt-12 space-y-6">
          {/* 学号 */}
          <div className="space-y-1.5">
            <label htmlFor="login-student-id" className="text-xs font-medium text-[var(--psy-muted)]">{t.studentIdLabel}</label>
            <input
              id="login-student-id"
              name="username"
              type="text"
              autoComplete="username"
              spellCheck={false}
              maxLength={STUDENT_ID_LENGTH}
              value={studentId}
              onChange={(e) => setStudentId(normalizeStudentId(e.target.value).slice(0, STUDENT_ID_LENGTH))}
              placeholder={t.studentIdPlaceholder}
              className="psy-input w-full text-center text-lg tracking-[0.15em]"
            />
          </div>

          {/* 密码 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="text-xs font-medium text-[var(--psy-muted)]">{t.passwordLabel}</label>
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-xs text-[var(--psy-muted)] underline-offset-2 hover:underline"
              >
                {showPwd ? t.hide : t.show}
              </button>
            </div>
            <input
              id="login-password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="psy-input w-full"
            />
          </div>

          {error && <p role="alert" className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? t.processing : t.loginBtn}
          </button>
        </form>

        <div className="mt-10 space-y-3 text-center text-sm text-[var(--psy-muted)]">
          <p>
            {t.noAccount}{' '}
            <Link href="/register" className="font-medium text-[var(--psy-accent)] underline-offset-2 hover:underline">
              {t.goRegister}
            </Link>
          </p>
          <p>
            <Link href="/forgot-password" className="underline-offset-2 hover:underline">
              {t.forgotPassword}
            </Link>
          </p>
        </div>
      </motion.div>

      {/* 单会话冲突确认 */}
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="psy-panel w-full max-w-sm rounded-2xl p-6 text-center">
            <h2 className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">{t.sessionConflictTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--psy-muted)]">{t.sessionConflictBody}</p>
            <div className="mt-6 space-y-2">
              <button
                onClick={confirmTakeover}
                disabled={busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:opacity-40"
              >
                {busy ? t.processing : t.sessionContinue}
              </button>
              <button
                onClick={cancelTakeover}
                disabled={busy}
                className="psy-btn psy-btn-ghost psy-serif w-full py-3 font-semibold disabled:opacity-40"
              >
                {t.sessionCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
