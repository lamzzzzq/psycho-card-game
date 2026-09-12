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

    // 换 token 暂时失败（被限流、断网）时 getSession 返回空会话 + AuthRetryableFetchError，
    // 但本地会话还在。此时判「未登入」会被 useRequireLogin 送去 /login —— 登录页不会自己
    // 跳回来，重新登录又撞同一个限流（2026-09-11 压测：500 人同 IP 打开网站集体掉线）。
    // 改为保持 loading，等 auth-js 自带的 30s 自动续期成功（TOKEN_REFRESHED）直接接上。
    // 不自己轮询 getSession：每次 getSession 都会再起一条 ~25s 的退避重试链，
    // 几百个客户端一起轮询只会更挤限流。等满 GIVE_UP_MS（= 限流的 5 分钟窗口）才按未登入处理。
    const GIVE_UP_MS = 300_000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function check(final = false) {
      retryTimer = null;
      let session: { user: { id: string } } | null = null;
      let retryable = false;
      try {
        const { data, error } = await supabase.auth.getSession();
        session = data.session;
        retryable = (error as { name?: string } | null)?.name === 'AuthRetryableFetchError';
      } catch {
        retryable = true; // 非 AuthError 的异常（锁被抢等）：同样当暂时失败，别卡死在 loading
      }
      if (!active) return;
      if (!session && retryable && !final) {
        retryTimer = setTimeout(() => void check(true), GIVE_UP_MS);
        return;
      }
      load(session?.user.id ?? null);
    }
    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION 与上面的 getSession 重复，且换 token 失败时 auth-js 会推 null
      // （_emitInitialSession 的 catch 分支），不能拿它判登出。
      if (event === 'INITIAL_SESSION') return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      load(session?.user.id ?? null);
    });

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
