'use client';

// 登录态 hook：订阅 Supabase auth，返回当前登录用户的 userId + 学号（从 profiles 读）。
// loading 期间 studentId 为 null；未登录时 userId=null。2026-07-20。

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthSession = {
  loading: boolean;
  userId: string | null;
  studentId: string | null;
  recoveryEmail: string | null;
  recoveryEmailVerified: boolean;
};

const EMPTY: AuthSession = {
  loading: false,
  userId: null,
  studentId: null,
  recoveryEmail: null,
  recoveryEmailVerified: false,
};

export function useAuthSession(): AuthSession {
  const [state, setState] = useState<AuthSession>({ ...EMPTY, loading: true });

  useEffect(() => {
    let active = true;

    async function load(userId: string | null) {
      if (!userId) {
        if (active) setState({ ...EMPTY });
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('student_id, recovery_email, recovery_email_verified')
        .eq('id', userId)
        .maybeSingle();
      if (!active) return;
      setState({
        loading: false,
        userId,
        studentId: data?.student_id ?? null,
        recoveryEmail: data?.recovery_email ?? null,
        recoveryEmailVerified: data?.recovery_email_verified ?? false,
      });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
