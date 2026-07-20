'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { registerStudent, signInWithStudentId, MIN_PASSWORD } from '@/lib/auth';
import { normalizeStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;
  const pwdOk = password.length >= MIN_PASSWORD;
  const matchOk = password === confirm;
  const emailOk = EMAIL_RE.test(email.trim());
  const canSubmit = idOk && pwdOk && matchOk && emailOk && !busy;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    // 前端即时校验（服务端还会再校一遍）
    if (!idOk) return setError(t.vIdLen);
    if (!pwdOk) return setError(t.vPwdLen);
    if (!matchOk) return setError(t.vPwdMismatch);
    if (!emailOk) return setError(t.vEmail);

    setBusy(true);
    const res = await registerStudent({ studentId, password, recoveryEmail: email });
    if (!res.ok) {
      setBusy(false);
      setError(t.err[res.error] ?? t.err.unknown);
      return;
    }
    // 注册成功 → 自动登录 → 回首页
    setSuccess(true);
    const login = await signInWithStudentId(studentId, password);
    setBusy(false);
    if (login.ok) router.push('/');
    else setError(t.err.invalid_credentials); // 极少数：建号成功但登录失败，让用户去登录页
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
          {t.registerTitle}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">
          {t.registerSubtitle}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {/* 学号 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--psy-muted)]">{t.studentIdLabel}</label>
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
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
              <label className="text-xs font-medium text-[var(--psy-muted)]">{t.passwordLabel}</label>
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-xs text-[var(--psy-muted)] underline-offset-2 hover:underline"
              >
                {showPwd ? t.hide : t.show}
              </button>
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="psy-input w-full"
            />
          </div>

          {/* 确认密码 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--psy-muted)]">{t.confirmPasswordLabel}</label>
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              className="psy-input w-full"
            />
          </div>

          {/* 找回邮箱 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--psy-muted)]">{t.recoveryEmailLabel}</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.recoveryEmailPlaceholder}
              className="psy-input w-full"
            />
            <p className="text-[11px] leading-4 text-[var(--psy-muted)]">{t.recoveryEmailHint}</p>
          </div>

          {error && <p className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}
          {success && !error && (
            <p className="text-xs leading-5 text-[var(--psy-accent)]">{t.registerSuccess}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? t.processing : t.registerBtn}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--psy-muted)]">
          {t.haveAccount}{' '}
          <Link href="/login" className="font-medium text-[var(--psy-accent)] underline-offset-2 hover:underline">
            {t.goLogin}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
