'use client';

// 登入即拿 HEXACO 结果 + 按学号归属核对（防串号）。对齐大五 AssessmentSync。2026-07-27。
// HEXACO 分数存 localStorage(psycho-card-hexaco)，按浏览器存、不按用户。
// 同一浏览器换账号登录若不核对，会看到上一个人的 HEXACO 报告（隐私泄露）。
// 登录拿到 studentId 后：
//   1) 本地有分数但归属 ≠ 当前登录学号（或归属不明）→ 立即清掉；
//   2) 当前用户本地无分数 → 走 RPC 从 Supabase 拉回自己的最新 HEXACO 分数。

import { useEffect, useRef } from 'react';
import { useAuthSession } from '@/lib/useAuthSession';
import { useHexacoStore } from '@/stores/useHexacoStore';
import { restoreHexacoScores } from '@/lib/hexaco-record';
import { normalizeStudentId } from '@/lib/utils';

export function HexacoSync() {
  const { studentId } = useAuthSession();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    const norm = normalizeStudentId(studentId);
    if (!norm) return;
    if (syncedFor.current === norm) return;
    syncedFor.current = norm;

    const st = useHexacoStore.getState();
    const owner = st.studentId ? normalizeStudentId(st.studentId) : null;

    // 归属核对：本地有分数【或半截答案】但不是当前登录用户的（或归属不明）→ 清掉。
    // 不只看 scores：上一个用户只答了一半(有 answers 无 scores)时，也必须清，
    // 否则新用户会在 /hexaco/assess 看到别人预填的答案，并把两人答案混着存到新学号名下。
    const hasLocalData = st.scores !== null || Object.keys(st.answers).length > 0;
    if (hasLocalData && owner !== norm) {
      st.reset();
    }
    // 认领为当前用户（reset 不清 studentId）
    useHexacoStore.getState().setStudentId(norm);

    // 当前用户本地无分数（或刚被清）→ 从服务端拉回自己的分数
    if (!useHexacoStore.getState().scores) {
      void restoreHexacoScores(norm).then((scores) => {
        const cur = useHexacoStore.getState();
        if (scores && normalizeStudentId(cur.studentId ?? '') === norm && !cur.scores) {
          cur.setRestoredScores(scores);
        }
      });
    }
  }, [studentId]);

  return null;
}
