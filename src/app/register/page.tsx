'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { sendVerifyCode, registerStudent, signInWithStudentId, MIN_PASSWORD } from '@/lib/auth';
import { normalizeStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [step, setStep] = useState<'info' | 'code'>('info');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // 注册成功但自动登录失败：提示改用刚设的密码去登录（不能报「學號或密碼不對」误导）。
  const [loginFallback, setLoginFallback] = useState(false);
  // 发码冷却（后端同样按学号 60s 限流，这里让按钮如实倒计时）。
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;
  const pwdOk = password.length >= MIN_PASSWORD;
  const matchOk = password === confirm;
  const emailOk = EMAIL_RE.test(email.trim());
  const infoOk = idOk && pwdOk && matchOk && emailOk;
  const codeOk = /^\d{6}$/.test(code.trim());

  // 第一步：校验信息 → 发验证码 → 进入第二步
  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!idOk) return setError(t.vIdLen);
    if (!pwdOk) return setError(t.vPwdLen);
    if (!matchOk) return setError(t.vPwdMismatch);
    if (!emailOk) return setError(t.vEmail);
    setBusy(true);
    const res = await sendVerifyCode(studentId, email);
    setBusy(false);
    if (!res.ok) return setError(t.err[res.error] ?? t.err.unknown);
    setCooldown(60);
    setStep('code');
  }

  // 第二步：带验证码注册 → 自动登录
  async function onRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!codeOk) return setError(t.err.invalid_code);
    setBusy(true);
    const res = await registerStudent({ studentId, password, recoveryEmail: email, code });
    if (!res.ok) {
      setBusy(false);
      return setError(t.err[res.error] ?? t.err.unknown);
    }
    setSuccess(true);
    const login = await signInWithStudentId(studentId, password);
    if (login.ok) {
      setBusy(false);
      router.push('/');
    } else {
      // 账号已建成、码已销毁 —— 再点註冊/重發只会得到误导性错误，
      // 保持 busy 锁住入口，提示后带去登录页。
      setLoginFallback(true);
      setTimeout(() => router.replace('/login'), 1800);
    }
  }

  async function onResend() {
    setError('');
    setBusy(true);
    const res = await sendVerifyCode(studentId, email);
    setBusy(false);
    if (!res.ok) return setError(t.err[res.error] ?? t.err.unknown);
    setCooldown(60);
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

        {step === 'info' ? (
          <>
            <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.registerSubtitle}</p>
            <form onSubmit={onSendCode} className="mt-8 space-y-4">
              {/* 学号 */}
              <div className="space-y-1.5">
                <label htmlFor="reg-student-id" className="text-xs font-medium text-[var(--psy-muted)]">{t.studentIdLabel}</label>
                <input
                  id="reg-student-id"
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  maxLength={STUDENT_ID_LENGTH}
                  disabled={busy}
                  value={studentId}
                  onChange={(e) => setStudentId(normalizeStudentId(e.target.value).slice(0, STUDENT_ID_LENGTH))}
                  placeholder={t.studentIdPlaceholder}
                  className="psy-input w-full text-center text-lg tracking-[0.15em]"
                />
              </div>

              {/* 密码 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="reg-password" className="text-xs font-medium text-[var(--psy-muted)]">{t.passwordLabel}</label>
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="text-xs text-[var(--psy-muted)] underline-offset-2 hover:underline"
                  >
                    {showPwd ? t.hide : t.show}
                  </button>
                </div>
                <input
                  id="reg-password"
                  name="new-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={busy}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="psy-input w-full"
                />
              </div>

              {/* 确认密码 */}
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="text-xs font-medium text-[var(--psy-muted)]">{t.confirmPasswordLabel}</label>
                <input
                  id="reg-confirm"
                  name="confirm-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={busy}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder}
                  className="psy-input w-full"
                />
              </div>

              {/* 找回邮箱 */}
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-xs font-medium text-[var(--psy-muted)]">{t.recoveryEmailLabel}</label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.recoveryEmailPlaceholder}
                  className="psy-input w-full"
                />
                <p className="text-[11px] leading-4 text-[var(--psy-muted)]">{t.recoveryEmailHint}</p>
              </div>

              {error && <p role="alert" className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}

              <button
                type="submit"
                disabled={!infoOk || busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t.processing : t.sendCodeBtn}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--psy-muted)]">
              {t.haveAccount}{' '}
              <Link href="/login" className="font-medium text-[var(--psy-accent)] underline-offset-2 hover:underline">
                {t.goLogin}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.codeSentHint}</p>
            <p className="mt-1 text-center text-xs text-[var(--psy-muted)]">{email}</p>
            <form onSubmit={onRegister} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reg-code" className="text-xs font-medium text-[var(--psy-muted)]">{t.codeLabel}</label>
                <input
                  id="reg-code"
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
                  className="psy-input w-full text-center text-2xl tracking-[0.5em]"
                />
              </div>

              {error && <p role="alert" className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}
              {success && !error && (
                <p role="status" className="text-xs leading-5 text-[var(--psy-accent)]">
                  {loginFallback ? t.registeredGoLogin : t.registerSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={!codeOk || busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t.processing : t.registerBtn}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setStep('info'); setError(''); setCode(''); }}
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
