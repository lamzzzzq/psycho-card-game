'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { useAuthSession } from '@/lib/useAuthSession';
import { supabase } from '@/lib/supabase';
import { signOutUser, signInWithStudentId, MIN_PASSWORD, sendEmailChangeCode, verifyEmailChange } from '@/lib/auth';
import { AvatarPicker } from '@/components/pvp/AvatarPicker';
import { DEFAULT_AVATAR } from '@/data/avatars';
import { useProfileAvatar } from '@/stores/useProfileAvatar';
import { PasswordInput } from '@/components/shared/PasswordInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const { loading, userId, studentId, recoveryEmail, recoveryEmailVerified } = useAuthSession();

  // 未登录 → 去登录页
  useEffect(() => {
    if (!loading && !userId) router.replace('/login');
  }, [loading, userId, router]);

  // ── 找回邮箱（改邮箱需验证码）──
  const [email, setEmail] = useState('');
  const [emailStep, setEmailStep] = useState<'idle' | 'code'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [verified, setVerified] = useState(false);
  // 已验证时默认只读显示邮箱；点「更改信箱」才进入编辑+验证流程
  const [emailEditing, setEmailEditing] = useState(false);
  // 发码冷却（后端按学号 60s 限流，按钮如实倒计时）
  const [emailCooldown, setEmailCooldown] = useState(0);
  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => setEmailCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);
  useEffect(() => {
    if (recoveryEmail) setEmail(recoveryEmail);
  }, [recoveryEmail]);
  useEffect(() => {
    setVerified(recoveryEmailVerified);
  }, [recoveryEmailVerified]);

  // ── 头像（共享 store：profiles.avatar 真相源，各页互通）──
  const { avatar: sharedAvatar, load: loadAvatar, setAvatar: saveSharedAvatar } = useProfileAvatar();
  useEffect(() => {
    if (userId) void loadAvatar(userId);
  }, [userId, loadAvatar]);
  const avatarValue = sharedAvatar ?? DEFAULT_AVATAR;
  async function saveAvatar(next: string) {
    if (userId) await saveSharedAvatar(userId, next);
  }

  // 第一步：发码到（新）邮箱
  async function sendEmailCode(e: FormEvent) {
    e.preventDefault();
    setEmailMsg('');
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return setEmailMsg(t.vEmail);
    setEmailBusy(true);
    const res = await sendEmailChangeCode(next);
    setEmailBusy(false);
    if (!res.ok) return setEmailMsg(t.err[res.error] ?? t.err.unknown);
    setEmailCooldown(60);
    setEmailStep('code');
  }

  // 第二步：验码 → 邮箱更新为已验证
  async function confirmEmailCode(e: FormEvent) {
    e.preventDefault();
    setEmailMsg('');
    if (!/^\d{6}$/.test(emailCode.trim())) return setEmailMsg(t.err.invalid_code);
    setEmailBusy(true);
    const res = await verifyEmailChange(email, emailCode);
    setEmailBusy(false);
    if (!res.ok) return setEmailMsg(t.err[res.error] ?? t.err.unknown);
    setVerified(true);
    setEmailStep('idle');
    setEmailEditing(false);
    setEmailCode('');
    setEmailMsg(t.emailSaved);
  }

  // 取消更改：还原为已保存的邮箱 + 回到只读
  function cancelEmailEdit() {
    setEmailEditing(false);
    setEmailStep('idle');
    setEmailCode('');
    setEmailMsg('');
    if (recoveryEmail) setEmail(recoveryEmail);
    setVerified(recoveryEmailVerified);
  }

  // ── 改密码 ──
  const [curPwd, setCurPwd] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    if (pwd.length < MIN_PASSWORD) return setPwdMsg(t.vPwdLen);
    if (pwd !== pwd2) return setPwdMsg(t.vPwdMismatch);
    if (!studentId) return setPwdMsg(t.err.unknown);
    setPwdBusy(true);
    // 先验目前密码：防共用电脑上被人直接改密接管账号
    const check = await signInWithStudentId(studentId, curPwd);
    if (!check.ok) {
      setPwdBusy(false);
      return setPwdMsg(t.err.wrong_current_password);
    }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setPwdBusy(false);
      return setPwdMsg(t.err.unknown);
    }
    // 吊销其它设备的会话（本机保留）；失败不阻塞
    await supabase.auth.signOut({ scope: 'others' });
    setPwdBusy(false);
    setCurPwd('');
    setPwd('');
    setPwd2('');
    setPwdMsg(t.passwordUpdated);
  }

  async function onLogout() {
    await signOutUser();
    router.replace('/login');
  }

  if (loading || !userId) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <p className="text-sm text-[var(--psy-muted)]">{t.loadingAccount}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-6 py-10">
      <Link href="/" className="text-sm text-[var(--psy-muted)] underline-offset-2 hover:underline">
        {t.backHome}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mt-6 space-y-5"
      >
        {/* 顶部身份：emoji 头像 + 学号 */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-surface)] text-3xl">
            {avatarValue}
          </div>
          <div>
            <h1 className="psy-serif text-xl font-semibold text-[var(--psy-ink)]">{t.accountTitle}</h1>
            <p className="mt-0.5 text-sm tracking-[0.12em] text-[var(--psy-muted)]">{studentId}</p>
          </div>
        </div>

        {/* 头像（点击展开选择；顶部已显示学号，不再重复「學號」区）*/}
        <section className="psy-card rounded-2xl p-5">
          <AvatarPicker value={avatarValue} onChange={saveAvatar} />
        </section>

        {/* 找回邮箱（改邮箱需验证码）*/}
        <section className="psy-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--psy-ink)]">{t.recoveryEmailSectionTitle}</h2>
            <span
              className={`rounded-full bg-[var(--psy-bg)] px-2 py-0.5 text-[11px] ${verified ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-muted)]'}`}
            >
              {verified ? t.emailVerified : t.emailUnverified}
            </span>
          </div>

          {verified && !emailEditing ? (
            // 已验证 → 只读显示 + 「更改信箱」按钮（想换绑再进编辑+验证）
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-[var(--psy-ink)]">{email}</span>
              <button
                type="button"
                onClick={() => { setEmailEditing(true); setEmailMsg(''); }}
                className="psy-btn psy-btn-ghost psy-serif shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold"
              >
                {t.changeEmail}
              </button>
            </div>
          ) : emailStep === 'idle' ? (
            <>
              <form onSubmit={sendEmailCode} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  aria-label={t.recoveryEmailSectionTitle}
                  disabled={emailBusy}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (verified) setVerified(false); // 改了邮箱 → 需重新验证
                  }}
                  placeholder={t.recoveryEmailPlaceholder}
                  className="psy-input flex-1"
                />
                <button
                  type="submit"
                  disabled={emailBusy || emailCooldown > 0}
                  className="psy-btn psy-btn-ghost psy-serif whitespace-nowrap px-5 py-2.5 font-semibold disabled:opacity-40"
                >
                  {emailBusy ? t.processing : emailCooldown > 0 ? `${t.sendCodeBtn} (${emailCooldown}s)` : t.sendCodeBtn}
                </button>
              </form>
              {emailEditing && (
                <button
                  type="button"
                  onClick={cancelEmailEdit}
                  className="mt-2 text-xs text-[var(--psy-muted)] underline-offset-2 hover:underline"
                >
                  {t.cancelEdit}
                </button>
              )}
            </>
          ) : (
            <form onSubmit={confirmEmailCode} className="mt-3 space-y-2">
              <p className="text-xs leading-5 text-[var(--psy-muted)]">
                {t.emailChangeCodeHint} <span className="text-[var(--psy-ink-soft)]">{email}</span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  maxLength={6}
                  aria-label={t.codeLabel}
                  disabled={emailBusy}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t.codePlaceholder}
                  className="psy-input flex-1 text-center tracking-[0.2em]"
                />
                <button
                  type="submit"
                  disabled={emailBusy}
                  className="psy-btn psy-btn-accent psy-serif whitespace-nowrap px-5 py-2.5 font-semibold disabled:opacity-40"
                >
                  {emailBusy ? t.processing : t.verifyAndSave}
                </button>
              </div>
              <button
                type="button"
                disabled={emailBusy}
                onClick={() => { setEmailStep('idle'); setEmailMsg(''); setEmailCode(''); }}
                className="text-xs text-[var(--psy-muted)] underline-offset-2 hover:underline disabled:opacity-40"
              >
                {t.editInfo}
              </button>
            </form>
          )}

          {emailMsg && (
            <p
              role="status"
              className={`mt-2 text-xs ${emailMsg === t.emailSaved ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-danger)]'}`}
            >
              {emailMsg}
            </p>
          )}
        </section>

        {/* 改密码 */}
        <section className="psy-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--psy-ink)]">{t.changePasswordTitle}</h2>
          <form onSubmit={updatePassword} className="mt-3 space-y-2">
            <PasswordInput
              name="current-password"
              autoComplete="current-password"
              ariaLabel={t.currentPassword}
              disabled={pwdBusy}
              value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)}
              placeholder={t.currentPassword}
              locale={locale}
            />
            <PasswordInput
              name="new-password"
              autoComplete="new-password"
              ariaLabel={t.newPassword}
              disabled={pwdBusy}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder={t.newPassword}
              locale={locale}
            />
            <PasswordInput
              name="confirm-password"
              autoComplete="new-password"
              ariaLabel={t.confirmNewPassword}
              disabled={pwdBusy}
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder={t.confirmNewPassword}
              locale={locale}
            />
            <button
              type="submit"
              disabled={pwdBusy}
              className="psy-btn psy-btn-ghost psy-serif w-full py-2.5 font-semibold disabled:opacity-40"
            >
              {pwdBusy ? t.processing : t.updatePassword}
            </button>
          </form>
          {pwdMsg && (
            <p
              role="status"
              className={`mt-2 text-xs ${pwdMsg === t.passwordUpdated ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-danger)]'}`}
            >
              {pwdMsg}
            </p>
          )}
        </section>

        {/* 登出 */}
        <button
          onClick={onLogout}
          className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold"
        >
          {t.logout}
        </button>
      </motion.div>
    </main>
  );
}
