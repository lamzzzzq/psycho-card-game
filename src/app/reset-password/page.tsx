'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { supabase } from '@/lib/supabase';
import { signOutUser, MIN_PASSWORD } from '@/lib/auth';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

// 只認 recovery 流程：沒帶 token 直接進來（含已登錄用戶誤入）一律 invalid，
// 不讓普通登錄態走「改密→強制登出」。放在模塊頂層同步求值 —— supabase client
// 的 detectSessionInUrl 建完會話就 replaceState 清 hash，useState initializer
// 可能已經來不及讀到；模塊求值搶在那條異步鏈之前。
const HAD_TOKEN =
  typeof window !== 'undefined' &&
  (window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('access_token') ||
    new URLSearchParams(window.location.search).has('code'));

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
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
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
          <p className="mt-6 text-center text-sm leading-6 text-[var(--psy-accent)]">{t.resetDone}</p>
        )}

        {shownPhase === 'ready' && (
          <>
            <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.resetSubtitle}</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-3">
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
              {error && <p className="text-xs leading-5 text-[var(--psy-danger)]">{error}</p>}
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
