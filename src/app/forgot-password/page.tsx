'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';
import { requestPasswordRecovery } from '@/lib/auth';
import { normalizeStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const idOk = normalizeStudentId(studentId).length === STUDENT_ID_LENGTH;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idOk) return;
    setBusy(true);
    await requestPasswordRecovery(studentId); // 防枚举：永远成功
    setBusy(false);
    setSent(true);
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
          {t.forgotTitle}
        </h1>

        {sent ? (
          <>
            <p className="mt-4 text-center text-sm leading-6 text-[var(--psy-accent)]">{t.forgotSent}</p>
            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="text-[var(--psy-muted)] underline-offset-2 hover:underline">
                {t.backToLogin}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-center text-sm leading-6 text-[var(--psy-muted)]">{t.forgotSubtitle}</p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--psy-muted)]">{t.studentIdLabel}</label>
                <input
                  type="text"
                  autoComplete="username"
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
        )}
      </motion.div>
    </main>
  );
}
