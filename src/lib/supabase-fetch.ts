// 换 token 撞 Auth 限流（429）→ 改报 503。2026-09-11。
//
// auth-js 只把 502/503/504 当「可重试」，其余错误（含 429）一律当会话失效、直接删掉本地会话
// （@supabase/auth-js lib/fetch.js 的 NETWORK_ERROR_CODES + GoTrueClient 的 _callRefreshToken）。
// 课堂上几百人共用学校出口 IP，同时打开网站换 token，被限流的人会被集体踢下线、再去挤登录。
// 改报 503 后 auth-js 退避重试并保留本地会话，限流一过就自己接上。只动 refresh 这一种请求。
//
// 独立成文件（不读 env），压测脚本 scripts/loadtest/refresh-storm.ts 直接复用同一份逻辑。

export function withRefreshRetry(baseFetch: typeof fetch): typeof fetch {
  return async (input, init) => {
    const res = await baseFetch(input, init);
    if (res.status !== 429) return res;
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/auth/v1/token') || !url.includes('grant_type=refresh_token')) return res;
    return new Response(res.body, { status: 503, statusText: 'Refresh rate limited', headers: res.headers });
  };
}

// 浏览器里必须惰性取全局 fetch（直接传 fetch 引用会丢 this 绑定）
export const fetchWithRefreshRetry = withRefreshRetry((input, init) => fetch(input, init));
