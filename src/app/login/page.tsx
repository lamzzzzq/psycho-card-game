'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { signInWithStudentId } from '@/lib/auth';
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

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;
  const canSubmit = idOk && password.length > 0 && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await signInWithStudentId(studentId, password);
    setBusy(false);
    if (res.ok) router.push('/');
    else setError(t.err[res.error] ?? t.err.unknown);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        <h1 className="psy-serif text-center text-2xl font-semibold text-[var(--psy-ink)]">
          {t.loginTitle}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">
          {t.loginSubtitle}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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

        <div className="mt-6 space-y-2 text-center text-sm text-[var(--psy-muted)]">
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
    </main>
  );
}
