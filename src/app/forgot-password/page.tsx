'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { AuthTopBar } from '@/components/shared/AuthTopBar';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { requestPasswordRecovery, resetPasswordWithCode, MIN_PASSWORD } from '@/lib/auth';
import { normalizeStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';

// 忘记密码（验证码流程）：输学号发码 → 输 6 位码 + 设新密码 → 成功去登录。
// 改自原「发重置链接」——链接邮件被机构邮箱过滤/发不出，改用和注册/换绑一致的验证码。
export default function ForgotPasswordPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [step, setStep] = useState<'id' | 'reset'>('id');
  const [studentId, setStudentId] = useState('');
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // 发码冷却（后端按学号 60s 限流，按钮如实倒计时）
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;
  const codeOk = /^\d{6}$/.test(code.trim());
  const pwdOk = pwd.length >= MIN_PASSWORD;
  const matchOk = pwd === pwd2;

  // 第一步：发码（防枚举：永远成功）→ 进第二步
  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    if (!idOk) return;
    setError('');
    setBusy(true);
    await requestPasswordRecovery(studentId);
    setBusy(false);
    setCooldown(60);
    setStep('reset');
  }

  // 第二步：验码 + 设新密码
  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!codeOk) return setError(t.err.invalid_code);
    if (!pwdOk) return setError(t.vPwdLen);
    if (!matchOk) return setError(t.vPwdMismatch);
    setBusy(true);
    const res = await resetPasswordWithCode(studentId, code, pwd);
    if (!res.ok) {
      setBusy(false);
      return setError(t.err[res.error] ?? t.err.unknown);
    }
    setBusy(false);
    setDone(true);
    setTimeout(() => router.replace('/login'), 1500);
  }

  async function onResend() {
    setError('');
    setBusy(true);
    await requestPasswordRecovery(studentId);
    setBusy(false);
    setCooldown(60);
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
          {t.forgotTitle}
        </h1>

        {done ? (
          <p role="status" className="mt-6 text-center text-sm leading-6 text-[var(--psy-accent)]">{t.resetDone}</p>
        ) : step === 'id' ? (
          <>
            <p className="mt-3 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.forgotSubtitle}</p>
            <form onSubmit={onSendCode} className="mt-12 space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="forgot-student-id" className="text-xs font-medium text-[var(--psy-muted)]">{t.studentIdLabel}</label>
                <input
                  id="forgot-student-id"
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
              <button
                type="submit"
                disabled={!idOk || busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t.processing : t.forgotBtn}
              </button>
            </form>
            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="text-[var(--psy-muted)] underline-offset-2 hover:underline">
                {t.backToLogin}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p role="status" className="mt-4 text-center text-sm leading-6 text-[var(--psy-accent)]">{t.forgotSent}</p>
            <p className="mt-1 text-center text-xs text-[var(--psy-muted)]">{t.forgotCodeStepHint}</p>
            <form onSubmit={onReset} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="forgot-code" className="text-xs font-medium text-[var(--psy-muted)]">{t.codeLabel}</label>
                <input
                  id="forgot-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  maxLength={6}
                  disabled={busy}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t.codePlaceholder}
                  className="psy-input w-full text-center text-2xl tracking-[0.2em]"
                />
              </div>
              <PasswordInput
                name="new-password"
                autoComplete="new-password"
                ariaLabel={t.newPassword}
                disabled={busy}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder={t.newPassword}
                locale={locale}
              />
              <PasswordInput
                name="confirm-password"
                autoComplete="new-password"
                ariaLabel={t.confirmNewPassword}
                disabled={busy}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                placeholder={t.confirmNewPassword}
                locale={locale}
              />

              {error && <p role="alert" className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}

              <button
                type="submit"
                disabled={!codeOk || !pwdOk || !matchOk || busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t.processing : t.resetBtn}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setStep('id'); setError(''); setCode(''); }}
                className="text-[var(--psy-muted)] underline-offset-2 hover:underline disabled:opacity-40"
              >
                {t.editInfo}
              </button>
              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={onResend}
                className="text-[var(--psy-accent)] underline-offset-2 hover:underline disabled:opacity-40"
              >
                {cooldown > 0 ? `${t.resendCode} (${cooldown}s)` : t.resendCode}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </main>
  );
}
