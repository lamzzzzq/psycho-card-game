'use client';

// 单会话守卫：登录状态下定时心跳；若 active_device 被别的设备顶了 → 本机登出并回登录页。
// auth 页（登录/注册等）跳过：那里由登录流程自己决定是否占用会话，避免登录中途把自己误顶下线。
// 2026-07-22。

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { heartbeatSession, signOutUser } from '@/lib/auth';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (AUTH_ROUTES.some((r) => pathname?.startsWith(r))) return;

    let cancelled = false;

    async function tick() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const r = await heartbeatSession(uid);
      if (r === 'taken_over' && !cancelled) {
        await signOutUser();
        router.replace('/login?kicked=1');
      }
    }

    void tick();
    const timer = setInterval(tick, 60_000);
    function onVis() {
      if (document.visibilityState === 'visible') void tick();
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pathname, router]);

  return null;
}
