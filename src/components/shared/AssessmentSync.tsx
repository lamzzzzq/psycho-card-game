'use client';

// 登入即拿结果 + 按学号归属核对（防串号）。2026-07-24。
// 测评分数存在 localStorage(psycho-card-assessment)，是【按浏览器】存的、不按用户。
// 若不核对，同一浏览器换账号登录会看到上一个人的报告（隐私泄露）。
// 这里在登录拿到 studentId 后：
//   1) 本地已有分数但归属 ≠ 当前登录学号（或归属不明）→ 立即清掉（防看到别人的报告）；
//   2) 当前用户本地无分数 → 走 RPC get_scores_by_student_id 从 Supabase 拉回自己的最新分数。
// assessment_results 表 anon 读不到（防篡改），RPC(SECURITY DEFINER) 只回五维分数。

import { useEffect, useRef } from 'react';
import { useAuthSession } from '@/lib/useAuthSession';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { restoreAssessmentScores } from '@/lib/assessment-record';
import { normalizeStudentId } from '@/lib/utils';

export function AssessmentSync() {
  const { studentId } = useAuthSession();
  // 每个学号只跑一次核对/拉取，避免 TOKEN_REFRESHED / 重渲染反复触发
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    // 登出（studentId 变 null）必须清掉 syncedFor：AccountChip 登出时会 reset 本地
    // 分数，而本组件挂在 root layout 不卸载、signOutUser 也不刷新页面——不清的话
    // 同一浏览器重新登录会因 syncedFor 命中而早退，跳过下面的 restore，报告页显示
    // 「未測評」直到手动刷新。2026-07-29。
    if (!studentId) {
      syncedFor.current = null;
      return;
    }
    const norm = normalizeStudentId(studentId);
    if (!norm) return;
    if (syncedFor.current === norm) return;
    syncedFor.current = norm;

    const st = useAssessmentStore.getState();
    const owner = st.studentId ? normalizeStudentId(st.studentId) : null;

    // 归属核对：本地有分数【或半截答案】但不是当前登录用户的（或归属不明）→ 清掉。
    // 不只看 bigFiveScores：上一个用户只答了一半(有 answers 无 scores)时也必须清，
    // 否则新用户会在 /assessment 看到别人预填的答案，并把两人答案混着存到新学号名下。
    // 正在重测(retaking)也照清——换了人，旧半截重测无意义。
    const hasLocalData = st.bigFiveScores !== null || Object.keys(st.answers).length > 0;
    if (hasLocalData && owner !== norm) {
      st.reset();
    }
    // 认领为当前用户（reset 不清 studentId，这里显式写正确归属）
    useAssessmentStore.getState().setStudentId(norm);

    // 当前用户本地无分数（或刚被清）→ 从服务端拉回自己的分数
    if (!useAssessmentStore.getState().bigFiveScores) {
      void restoreAssessmentScores(norm).then((scores) => {
        const cur = useAssessmentStore.getState();
        // 拉回期间没换人、且仍无分数 → 写入
        if (scores && normalizeStudentId(cur.studentId ?? '') === norm && !cur.bigFiveScores) {
          cur.setManualScores(scores);
        }
      });
    }
  }, [studentId]);

  return null;
}
