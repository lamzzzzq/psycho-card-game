'use client';

// 账号头像的全局共享状态（profiles.avatar 为唯一真相源）。
// 所有展示/修改头像的地方（AccountChip / /account / PVP / 单机 lobby）都读写这个 store，
// 任一处改了 → store 更新 → 各页立刻同步；同时写回 DB 持久化。2026-07-21。

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATAR } from '@/data/avatars';

type ProfileAvatarState = {
  avatar: string | null;      // null = 尚未载入
  loadedFor: string | null;   // 已载入的 userId
  load: (userId: string) => Promise<void>;
  setAvatar: (userId: string, next: string) => Promise<void>;
  reset: () => void;
};

export const useProfileAvatar = create<ProfileAvatarState>((set, get) => ({
  avatar: null,
  loadedFor: null,

  async load(userId) {
    if (get().loadedFor === userId && get().avatar !== null) return;
    const { data } = await supabase.from('profiles').select('avatar').eq('id', userId).maybeSingle();
    set({ avatar: data?.avatar ?? DEFAULT_AVATAR, loadedFor: userId });
  },

  async setAvatar(userId, next) {
    set({ avatar: next, loadedFor: userId }); // 乐观更新 → 各页立即同步
    await supabase.from('profiles').update({ avatar: next }).eq('id', userId);
  },

  reset() {
    set({ avatar: null, loadedFor: null });
  },
}));
