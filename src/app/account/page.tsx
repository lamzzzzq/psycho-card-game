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
import { signOutUser, MIN_PASSWORD } from '@/lib/auth';
import { AvatarPicker } from '@/components/pvp/AvatarPicker';
import { DEFAULT_AVATAR } from '@/data/avatars';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const { loading, userId, studentId, recoveryEmail, recoveryEmailVerified, avatar } = useAuthSession();

  // 未登录 → 去登录页
  useEffect(() => {
    if (!loading && !userId) router.replace('/login');
  }, [loading, userId, router]);

  // ── 找回邮箱编辑 ──
  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  useEffect(() => {
    if (recoveryEmail) setEmail(recoveryEmail);
  }, [recoveryEmail]);

  // ── 头像（emoji）──
  const [avatarValue, setAvatarValue] = useState(DEFAULT_AVATAR);
  useEffect(() => {
    if (avatar) setAvatarValue(avatar);
  }, [avatar]);
  async function saveAvatar(next: string) {
    setAvatarValue(next); // 乐观更新
    await supabase.from('profiles').update({ avatar: next }).eq('id', userId!);
  }

  async function saveEmail(e: FormEvent) {
    e.preventDefault();
    setEmailMsg('');
    const next = email.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return setEmailMsg(t.vEmail);
    setEmailBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ recovery_email: next, recovery_email_verified: false })
      .eq('id', userId!);
    setEmailBusy(false);
    setEmailMsg(error ? t.err.unknown : t.emailSaved);
  }

  // ── 改密码 ──
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    if (pwd.length < MIN_PASSWORD) return setPwdMsg(t.vPwdLen);
    if (pwd !== pwd2) return setPwdMsg(t.vPwdMismatch);
    setPwdBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdBusy(false);
    if (error) return setPwdMsg(t.err.unknown);
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

        {/* 选择头像 */}
        <section className="psy-card rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--psy-ink)]">{t.chooseAvatarTitle}</h2>
          <AvatarPicker value={avatarValue} onChange={saveAvatar} />
        </section>

        {/* 账号：学号只读 */}
        <section className="psy-card space-y-2 rounded-2xl p-5">
          <label className="text-xs font-medium text-[var(--psy-muted)]">{t.identityLabel}</label>
          <p className="text-lg tracking-[0.14em] text-[var(--psy-ink)]">{studentId}</p>
          <p className="text-[11px] leading-4 text-[var(--psy-muted)]">{t.identityReadonlyHint}</p>
        </section>

        {/* 找回邮箱 */}
        <section className="psy-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--psy-ink)]">{t.recoveryEmailSectionTitle}</h2>
            {!recoveryEmailVerified && (
              <span className="rounded-full bg-[var(--psy-bg)] px-2 py-0.5 text-[11px] text-[var(--psy-muted)]">
                {t.emailUnverified}
              </span>
            )}
          </div>
          <form onSubmit={saveEmail} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.recoveryEmailPlaceholder}
              className="psy-input flex-1"
            />
            <button
              type="submit"
              disabled={emailBusy}
              className="psy-btn psy-btn-ghost psy-serif whitespace-nowrap px-5 py-2.5 font-semibold disabled:opacity-40"
            >
              {emailBusy ? t.processing : t.saveEmail}
            </button>
          </form>
          {emailMsg && (
            <p
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
            <input
              type="password"
              autoComplete="new-password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder={t.newPassword}
              className="psy-input w-full"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder={t.confirmNewPassword}
              className="psy-input w-full"
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
