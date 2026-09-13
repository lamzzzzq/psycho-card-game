/**
 * 压测账号与数据的建 / 查 / 清。只依赖 Supabase 管理 token（钥匙串 "Supabase CLI"，
 * 即 `supabase login` 存的那个）；service_role key 用管理 API 现取，不落盘。
 *
 *   npx tsx scripts/loadtest/accounts.ts count   [--prefix ZSMK]
 *   npx tsx scripts/loadtest/accounts.ts create  [--bots 500] [--prefix ZSMK] [--password xxx]
 *   npx tsx scripts/loadtest/accounts.ts cleanup [--prefix ZSMK]
 *
 * 所有删除都按学号前缀（4 位字母，真实学号是 8 位数字 + 1 字母，不会撞）。
 */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const REF = 'msyrowizejzgxedmnjne';
const URL = `https://${REF}.supabase.co`;
const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';

const argv = process.argv.slice(2);
const MODE = argv[0];
const opt = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const PREFIX = opt('prefix', 'ZSMK').toUpperCase();
const N = Number(opt('bots', '500'));
const PASSWORD = opt('password', 'Smoke#2026');
if (!/^[A-Z]{4}$/.test(PREFIX)) throw new Error('prefix 必须是 4 个字母');
// 库里已存在的 4 字母开头学号（真实账号 / 历史测试数据），不许拿来当压测前缀
const RESERVED = ['DUDB', 'FHBH', 'TEST', 'SIMT', 'LIVE'];
if (RESERVED.includes(PREFIX)) throw new Error(`prefix ${PREFIX} 与现有数据冲突`);
const studentIdOf = (i: number) => `${PREFIX}${String(i).padStart(5, '0')}`;

function pat(): string {
  // CI（GitHub Actions）没有钥匙串，从 secret 注入的环境变量取
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const raw = execSync(`security find-generic-password -s 'Supabase CLI' -w`).toString().trim();
  return raw.startsWith('go-keyring-base64:') ? Buffer.from(raw.slice(18), 'base64').toString() : raw;
}

async function mgmt(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${pat()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`mgmt ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
export const sql = (query: string) => mgmt('/database/query', { method: 'POST', body: JSON.stringify({ query }) });

async function serviceKey(): Promise<string> {
  const keys: { name: string; api_key: string; type?: string }[] = await mgmt('/api-keys?reveal=true');
  const k = keys.find((x) => x.name === 'service_role') ?? keys.find((x) => x.type === 'secret');
  if (!k) throw new Error('找不到 service_role key');
  return k.api_key;
}

// 精确匹配「前缀 + 5 位数字」，不用 LIKE 前缀（库里已有 DUDB/TEST/SIMT 等 4 字母开头的真实/历史数据）
const re = `'^${PREFIX}[0-9]{5}$'`;
const emailRe = `'^${PREFIX.toLowerCase()}[0-9]{5}@${EMAIL_DOMAIN.replace(/\./g, '\\.')}$'`;
// auth.users 只认本脚本建的号（user_metadata.loadtest = true）
const authOurs = `email ~ ${emailRe} and raw_user_meta_data->>'loadtest' = 'true'`;

async function count() {
  const r = await sql(`
    select
      (select count(*) from auth.users where ${authOurs}) as auth_users,
      (select count(*) from auth.users where email ~ ${emailRe} and coalesce(raw_user_meta_data->>'loadtest','') <> 'true') as foreign_auth_users,
      (select count(*) from profiles where student_id ~ ${re}) as profiles,
      (select count(*) from players where id ~ ${re}) as players,
      (select count(*) from rooms where host_id ~ ${re}) as rooms,
      (select count(*) from room_players where player_id ~ ${re}) as room_players,
      (select count(*) from game_sessions where id in (select session_id from game_participants where student_id ~ ${re})
         or room_id in (select id from rooms where host_id ~ ${re})) as sessions,
      (select count(*) from game_participants where student_id ~ ${re}) as participants,
      (select count(*) from big_five_snapshots where student_id ~ ${re}) as snapshots;`);
  console.log(`[${PREFIX}]`, r[0]);
  return r[0];
}

async function create() {
  const admin = createClient(URL, await serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  let made = 0;
  let skipped = 0;
  const ids = Array.from({ length: N }, (_, i) => studentIdOf(i + 1));
  const CONC = 8;
  for (let i = 0; i < ids.length; i += CONC) {
    await Promise.all(
      ids.slice(i, i + CONC).map(async (sid) => {
        const { data, error } = await admin.auth.admin.createUser({
          email: `${sid.toLowerCase()}@${EMAIL_DOMAIN}`,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { student_id: sid, loadtest: true },
        });
        let userId = data?.user?.id;
        if (error) {
          if (!/already|exists|registered/i.test(error.message)) throw new Error(`${sid}: ${error.message}`);
          // 已存在：可能是上次建号成功但 profile 没插上 → 查出 id 补插
          const r = await sql(`select id from auth.users where email = '${sid.toLowerCase()}@${EMAIL_DOMAIN}'
            and raw_user_meta_data->>'loadtest' = 'true'`);
          userId = r[0]?.id;
          if (!userId) throw new Error(`${sid}: 已存在但不是压测账号`);
          const { data: prof } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
          if (prof) return void skipped++;
        }
        const { error: pe } = await admin.from('profiles').insert({
          id: userId!,
          student_id: sid,
          recovery_email: null,
          recovery_email_verified: false,
        });
        if (pe) throw new Error(`${sid} profile: ${pe.message}`);
        made++;
      })
    );
    if ((i / CONC) % 10 === 0) console.log(`  ${i + CONC}/${ids.length}`);
  }
  console.log(`created ${made}, skipped(existing) ${skipped}`);
  await count();
}

async function cleanup() {
  console.log('before:');
  const before = await count();
  if (Number(before.foreign_auth_users) > 0) {
    throw new Error(`前缀 ${PREFIX} 下有 ${before.foreign_auth_users} 个不是本脚本建的账号，拒绝清理`);
  }
  // 整个事务：先收集要删的局 / 房，守卫检查里面有没有非测试学号（真学生误进 bot 房、
  // bot 进过真人局），有就 RAISE 让整个事务回滚、一行不删。
  await sql(`
    begin;
    create temp table t_rooms on commit drop as
      select id from rooms where host_id ~ ${re};
    create temp table t_sess on commit drop as
      select distinct session_id as id from game_participants where student_id ~ ${re}
      union
      select id from game_sessions where room_id in (select id from t_rooms);
    do $$ begin
      if exists (select 1 from game_participants where session_id in (select id from t_sess)
                 and (student_id is null or student_id !~ ${re})) then
        raise exception 'cleanup aborted: test sessions contain non-test participants';
      end if;
      if exists (select 1 from room_players where room_id in (select id from t_rooms)
                 and player_id !~ ${re}) then
        raise exception 'cleanup aborted: test rooms contain non-test players';
      end if;
    end $$;
    delete from game_participants where session_id in (select id from t_sess);
    delete from big_five_snapshots where student_id ~ ${re};
    delete from game_sessions where id in (select id from t_sess);
    delete from room_players where player_id ~ ${re} or room_id in (select id from t_rooms);
    delete from rooms where id in (select id from t_rooms);
    delete from players where id ~ ${re};
    delete from profiles where student_id ~ ${re}
      and id in (select id from auth.users where ${authOurs});
    delete from auth.users where ${authOurs};
    commit;`);
  console.log('after:');
  await count();
}

const run = { count, create, cleanup }[MODE as 'count' | 'create' | 'cleanup'];
if (!run) {
  console.error('usage: accounts.ts count|create|cleanup [--prefix ZSMK] [--bots 500]');
  process.exit(1);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
