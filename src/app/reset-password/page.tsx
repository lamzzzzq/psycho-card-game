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
import { supabase } from '@/lib/supabase';
import { signOutUser, MIN_PASSWORD } from '@/lib/auth';
import type { EmailOtpType } from '@supabase/supabase-js';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

// 只認 recovery 流程：沒帶 token 直接進來（含已登錄用戶誤入）一律 invalid，
// 不讓普通登錄態走「改密→強制登出」。放在模塊頂層同步求值 —— supabase client
// 的 detectSessionInUrl 建完會話就 replaceState 清 hash，useState initializer
// 可能已經來不及讀到；模塊求值搶在那條異步鏈之前。
// token_hash：新流程（郵件安全網關防護）——郵件連結帶 ?token_hash=..&type=recovery，
// 由本頁 JS 主動 verifyOtp（掃描器 GET 不觸發 JS，不會提前消耗一次性 token）。
const HAD_TOKEN =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('access_token') ||
    new URLSearchParams(window.location.search).has('code') ||
    new URLSearchParams(window.location.search).has('token_hash'));

export default function ResetPasswordPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [phase, setPhase] = useState<Phase>(HAD_TOKEN ? 'checking' : 'invalid');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 郵件連結帶 recovery token；supabase client(detectSessionInUrl) 會自動建立臨時會話並觸發事件。
  // 帶 token 但事件在訂閱前被消費時，兜底用「已有會話」放行；弱網放寬到 8s 再下 invalid 結論。
  useEffect(() => {
    if (!HAD_TOKEN) return;

    // token_hash 流程（郵件安全網關防護）：**不在挂载时核验**——即使高级扫描器在沙箱里
    // 跑 JS 引爆链接，也不会消耗一次性 token。直接显示表单，等用户「提交」时才 verifyOtp
    // （需人为点击，扫描器不会填表提交）。见 onSubmit。
    if (new URLSearchParams(window.location.search).has('token_hash')) {
      setPhase('ready');
      return;
    }

    // 旧 hash 流程：supabase client(detectSessionInUrl) 自动建立临时会话并触发事件。
    // 事件在订阅前被消费时，兜底用「已有会话」放行；弱网放宽到 8s 再下 invalid 结论。
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setPhase('ready');
      }
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setPhase((p) => (p === 'checking' ? (data.session ? 'ready' : 'invalid') : p));
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // 服務端預渲染讀不到 hash（HAD_TOKEN=false → invalid），帶 token 的客戶端首渲染
  // 是 checking —— hydrate 前統一顯示 checking，避免 hydration mismatch。
  const shownPhase: Phase = hydrated ? phase : 'checking';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (pwd.length < MIN_PASSWORD) return setError(t.vPwdLen);
    if (pwd !== pwd2) return setError(t.vPwdMismatch);
    setBusy(true);

    // token_hash 流程：**提交时**才核验一次性 token（人为点击，邮件扫描器不会填表提交，
    // 故不会提前消耗）。核验成功即建立 recovery 会话，随后 updateUser 才有权限。
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    if (tokenHash) {
      const type = (params.get('type') ?? 'recovery') as EmailOtpType;
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (vErr) {
        setBusy(false);
        setPhase('invalid'); // 链接失效/过期/已被使用 → 显示「请重新申请」
        return;
      }
      window.history.replaceState(null, '', window.location.pathname);
    }

    const { error: upErr } = await supabase.auth.updateUser({ password: pwd });
    if (upErr) {
      setBusy(false);
      setError(t.err.unknown);
      return;
    }
    setPhase('done');
    // 用新密碼重新登入更清晰：登出恢復會話 → 去登入頁
    await signOutUser();
    setTimeout(() => router.replace('/login'), 1500);
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
          {t.resetTitle}
        </h1>

        {shownPhase === 'checking' && (
          <p className="mt-6 text-center text-sm text-[var(--psy-muted)]">{t.resetChecking}</p>
        )}

        {shownPhase === 'invalid' && (
          <>
            <p className="mt-4 text-center text-sm leading-6 text-[var(--psy-danger)]">{t.resetInvalid}</p>
            <p className="mt-6 text-center text-sm">
              <Link href="/forgot-password" className="text-[var(--psy-accent)] underline-offset-2 hover:underline">
                {t.forgotTitle}
              </Link>
            </p>
          </>
        )}

        {shownPhase === 'done' && (
          <p role="status" className="mt-6 text-center text-sm leading-6 text-[var(--psy-accent)]">{t.resetDone}</p>
        )}

        {shownPhase === 'ready' && (
          <>
            <p className="mt-3 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.resetSubtitle}</p>
            <form onSubmit={onSubmit} className="mt-12 space-y-6">
              <PasswordInput
                name="new-password"
                autoComplete="new-password"
                ariaLabel={t.newPassword}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder={t.newPassword}
                locale={locale}
              />
              <PasswordInput
                name="confirm-password"
                autoComplete="new-password"
                ariaLabel={t.confirmNewPassword}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                placeholder={t.confirmNewPassword}
                locale={locale}
              />
              {error && <p role="alert" className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t.processing : t.resetBtn}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </main>
  );
}
