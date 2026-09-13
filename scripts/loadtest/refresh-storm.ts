/**
 * 「上课时 500 人同时打开网站」换 token 风暴测试。
 *
 * 场景：学生几天前登录过，本地存着会话但 access token（1 小时）已过期。上课一起打开网站，
 * 每个页面都会用 refresh token 去换新 token，全部来自同一出口 IP → 撞 Auth 限流（429）。
 *
 * 做法：
 *   1. 登录全部账号（按限流速度，429 就隔几秒重试），把每人的本地会话快照存下来
 *   2. 冷却，让限流窗口清空
 *   3. 把快照里的 expires_at 改成已过期，在 --window 秒内陆续「打开网站」：
 *      偶数号 = 对照组（原代码：普通 fetch + 旧 useAuthSession：getSession 为空就去 /login）
 *      奇数号 = 改后组（src/lib/supabase-fetch.ts 的 429→503 + 新 useAuthSession：可重试错误先等）
 *   4. 观察 --observe 秒：本地会话被删（=被登出）、会不会被送去 /login、多久恢复
 *
 *   npx tsx scripts/loadtest/refresh-storm.ts --bots 500 [--window 60] [--observe 180] [--cooldown 300]
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { withRefreshRetry } from '@/lib/supabase-fetch';

const argv = process.argv.slice(2);
const opt = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const N = Number(opt('bots', '500'));
const PREFIX = opt('prefix', 'ZSMK').toUpperCase();
const PASSWORD = opt('password', 'Smoke#2026');
const WINDOW_S = Number(opt('window', '60'));
const OBSERVE_S = Number(opt('observe', '360'));
const COOLDOWN_S = Number(opt('cooldown', '300'));
const LOGIN_WINDOW_S = Number(opt('login-window', '240'));
const GIVE_UP_MS = 300_000; // 与新 useAuthSession 一致
const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';
if (!/^[A-Z]{4}$/.test(PREFIX) || ['DUDB', 'FHBH', 'TEST', 'SIMT', 'LIVE'].includes(PREFIX)) throw new Error('bad prefix');

// 本机读 .env.local；CI 没有这个文件，直接用环境变量
const env: Record<string, string> = { ...(process.env as Record<string, string>) };
if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const log = (s: string) => console.log(`[${Math.round((Date.now() - T0) / 1000)}s] ${s}`);
const pct = (a: number[], p: number) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

// 本机代理会掐大量并发新建 TLS：限并发复用连接（与 pvp-smoke 同理）
let inFlight = 0;
const waiters: (() => void)[] = [];
const limitedFetch: typeof fetch = async (input, init) => {
  if (inFlight >= 64) await new Promise<void>((r) => waiters.push(r));
  inFlight++;
  try {
    return await fetch(input, init);
  } finally {
    inFlight--;
    waiters.shift()?.();
  }
};

class MemStorage {
  m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

const studentIdOf = (i: number) => `${PREFIX}${String(i).padStart(5, '0')}`;

// ── 1. 登录 ──
async function loginOne(i: number): Promise<{ key: string; value: string } | null> {
  const storage = new MemStorage();
  const sb = createClient(URL_, ANON, {
    auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: limitedFetch },
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: `${studentIdOf(i).toLowerCase()}@${EMAIL_DOMAIN}`,
      password: PASSWORD,
    });
    if (!error && data.session) {
      const [key, value] = [...storage.m.entries()].find(([k]) => k.endsWith('-auth-token'))!;
      return { key, value };
    }
    await sleep(3000 + Math.random() * 5000);
  }
  return null;
}

type Group = 'control' | 'fixed';
type Result = { group: Group; kickedOut: boolean; sentToLogin: boolean; recoveredMs: number | null };

// ── 3. 打开网站 ──
async function openSite(snap: { key: string; value: string }, group: Group): Promise<Result> {
  const s = JSON.parse(snap.value);
  s.expires_at = Math.floor(Date.now() / 1000) - 60; // access token 已过期
  const storage = new MemStorage();
  storage.setItem(snap.key, JSON.stringify(s));
  const sb: SupabaseClient = createClient(URL_, ANON, {
    auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: group === 'fixed' ? withRefreshRetry(limitedFetch) : limitedFetch },
  });
  const opened = Date.now();
  void sb.auth.startAutoRefresh(); // 浏览器里页面可见时 auth-js 会自己开

  // 模拟 useAuthSession 的首次判定
  //   旧逻辑：getSession 为空就去 /login
  //   新逻辑：可重试错误 → 不轮询，等 TOKEN_REFRESHED；等满 GIVE_UP_MS 再查一次，仍空才去 /login
  let sentToLogin = false;
  let refreshedEvent = false;
  const { data: sub } = sb.auth.onAuthStateChange((event) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') refreshedEvent = true;
  });
  const decide = async () => {
    const { data, error } = await sb.auth.getSession();
    if (data.session) return;
    const retryable = (error as { name?: string } | null)?.name === 'AuthRetryableFetchError';
    if (group === 'control' || !retryable) return void (sentToLogin = true);
    while (!refreshedEvent && Date.now() - opened < GIVE_UP_MS) await sleep(1000);
    if (refreshedEvent) return;
    const again = await sb.auth.getSession();
    if (!again.data.session) sentToLogin = true;
  };
  const decision = decide();

  // 观察：本地会话是否被删、何时换到新 token
  let kickedOut = false;
  let recoveredMs: number | null = null;
  while (Date.now() - opened < OBSERVE_S * 1000) {
    const raw = storage.getItem(snap.key);
    if (!raw) {
      kickedOut = true;
      break;
    }
    if (JSON.parse(raw).expires_at * 1000 > Date.now() + 60_000) {
      recoveredMs = Date.now() - opened;
      break;
    }
    await sleep(1000);
  }
  await decision;
  sub.subscription.unsubscribe();
  await sb.auth.stopAutoRefresh();
  return { group, kickedOut, sentToLogin, recoveredMs };
}

async function main() {
  log(`phase 1: logging in ${N} accounts over ~${LOGIN_WINDOW_S}s`);
  const snaps = await Promise.all(
    Array.from({ length: N }, async (_, k) => {
      await sleep(Math.random() * LOGIN_WINDOW_S * 1000);
      return loginOne(k + 1);
    })
  );
  const ok = snaps.filter(Boolean) as { key: string; value: string }[];
  log(`phase 1 done: ${ok.length}/${N} sessions`);

  log(`phase 2: cooldown ${COOLDOWN_S}s (rate-limit window reset)`);
  await sleep(COOLDOWN_S * 1000);

  log(`phase 3: ${ok.length} clients open the site within ${WINDOW_S}s (half control / half fixed)`);
  const ticker = setInterval(() => log('storm running…'), 30_000);
  const results = await Promise.all(
    ok.map(async (snap, k) => {
      await sleep(Math.random() * WINDOW_S * 1000);
      return openSite(snap, k % 2 === 0 ? 'control' : 'fixed');
    })
  );
  clearInterval(ticker);

  const summary = (['control', 'fixed'] as Group[]).map((g) => {
    const rs = results.filter((r) => r.group === g);
    const rec = rs.filter((r) => r.recoveredMs != null).map((r) => r.recoveredMs!);
    return {
      group: g,
      n: rs.length,
      kickedOut: rs.filter((r) => r.kickedOut).length,
      sentToLogin: rs.filter((r) => r.sentToLogin).length,
      recovered: rec.length,
      neitherWithinObserve: rs.filter((r) => !r.kickedOut && r.recoveredMs == null).length,
      recoverMs: { p50: pct(rec, 50), p95: pct(rec, 95), max: rec.length ? Math.max(...rec) : null },
    };
  });
  mkdirSync('scripts/loadtest/out', { recursive: true });
  const file = `scripts/loadtest/out/refresh-storm-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify({ config: { N, WINDOW_S, OBSERVE_S, COOLDOWN_S }, summary, results }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  log(`full report → ${file}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
