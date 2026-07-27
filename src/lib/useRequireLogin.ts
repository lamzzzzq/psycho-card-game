'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/lib/useAuthSession';

// 登录闸：登录态就绪后仍未登入 → replace 去 /login。
// 用于任何「登入才该看/该玩」的受保护页（报告、对局、房间等），
// 防登出/未登入用户靠本地残留(localStorage)直接访问 URL 看到数据或继续游戏。
// 返回 ready：false 时页面应渲染占位/加载，勿渲染受保护内容。
export function useRequireLogin(): { authLoading: boolean; userId: string | null; ready: boolean } {
  const router = useRouter();
  const { loading, userId } = useAuthSession();
  useEffect(() => {
    if (!loading && !userId) router.replace('/login');
  }, [loading, userId, router]);
  return { authLoading: loading, userId, ready: !loading && !!userId };
}
