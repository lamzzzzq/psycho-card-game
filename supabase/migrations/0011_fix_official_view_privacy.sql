-- 🔒 紧急隐私修补（2026-06-20）：assessment_results_official 视图泄露给 anon。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：0010 初版建的视图没设 security_invoker，默认按视图属主(postgres)读底表 →
-- 绕过 assessment_results 的 RLS；加上 Supabase 默认给 anon 的 public schema 读权，
-- 导致 anon 能直接 SELECT 到全部学号官方结果（实测 18 行明细泄露）。
--
-- 修补：① 视图改为 security_invoker（按调用者身份读底表 → anon 受 RLS 拦截看 0 行，
-- 老师 service_role/postgres 绕过 RLS 仍看全部）；② 显式 REVOKE 双保险。
-- 已运行过 0010 的项目跑这一条即可；尚未运行的直接跑修好后的 0010 也等价。

ALTER VIEW public.assessment_results_official SET (security_invoker = true);
REVOKE ALL ON public.assessment_results_official FROM anon, authenticated;
