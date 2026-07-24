'use client';

// 登入即拿结果：登录后（拿到 studentId）若本地没有测评分数，就走 RPC
// get_scores_by_student_id 从 Supabase 拉回该学号最新一次 Big Five 分数写入 store。
// 让「是否做过测评」的检测服务端权威 + 跨设备，而不是只靠本机 localStorage。
// assessment_results 表本身 anon 读不到（防篡改），RPC(SECURITY DEFINER) 只回五维分数。2026-07-24。

import { useEffect, useRef } from 'react';
import { useAuthSession } from '@/lib/useAuthSession';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { restoreAssessmentScores } from '@/lib/assessment-record';

export function AssessmentSync() {
  const { studentId } = useAuthSession();
  const bigFiveScores = useAssessmentStore((s) => s.bigFiveScores);
  const setManualScores = useAssessmentStore((s) => s.setManualScores);
  // 每个学号只尝试一次，避免 TOKEN_REFRESHED / 重渲染反复打 RPC
  const triedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    if (bigFiveScores) return; // 本机已有分数 → 不覆盖（正在重测等场景交给测评页）
    if (triedFor.current === studentId) return;
    triedFor.current = studentId;
    void restoreAssessmentScores(studentId).then((scores) => {
      // 拉回期间用户可能已本地测完；再判一次避免覆盖更新的本地结果
      if (scores && !useAssessmentStore.getState().bigFiveScores) {
        setManualScores(scores);
      }
    });
  }, [studentId, bigFiveScores, setManualScores]);

  return null;
}
