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
  avatar: string | null;
};

const EMPTY: AuthSession = {
  loading: false,
  userId: null,
  studentId: null,
  recoveryEmail: null,
  recoveryEmailVerified: false,
  avatar: null,
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
      const { data, error } = await supabase
        .from('profiles')
        .select('student_id, recovery_email, recovery_email_verified, avatar')
        .eq('id', userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        // 网络抖动/瞬时失败 ≠ profiles 行不存在：保留上一份数据，只收掉 loading。
        // 清成 null 会误触发测评/PVP 的「帳號資料異常」gate（TOKEN_REFRESHED 每小时
        // 都会重新 load 一次，答题中途一次抖动就把人踢出去）。
        setState((prev) => ({ ...prev, loading: false, userId }));
        return;
      }
      setState({
        loading: false,
        userId,
        studentId: data?.student_id ?? null,
        recoveryEmail: data?.recovery_email ?? null,
        recoveryEmailVerified: data?.recovery_email_verified ?? false,
        avatar: data?.avatar ?? null,
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
