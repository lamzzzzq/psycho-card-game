// 清理壓測數據（LT- 前綴）。需要 service_role key（INSERT-only 表 anon 刪不掉）：
//   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/load-test/cleanup.mjs
// 只刪 LT- 前綴的行，正式課堂數據不受影響。默認 dry-run，加 --yes 才真刪。
import { createClient } from '@supabase/supabase-js';
import { requireServiceEnv } from './env.mjs';
import { parseArgs } from './util.mjs';

const args = parseArgs({ yes: false });
const env = requireServiceEnv();
const db = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });

// FK 順序：room_players → rooms → players；測評表獨立。
// game_sessions/participants 壓測腳本不寫入，不清。
const TARGETS = [
  { table: 'room_players', col: 'player_id' },
  { table: 'rooms', col: 'host_id' },
  { table: 'assessment_results', col: 'student_id' },
  { table: 'players', col: 'id' },
];

async function main() {
  for (const { table, col } of TARGETS) {
    const { count, error: cntErr } = await db.from(table)
      .select('*', { count: 'exact', head: true }).like(col, 'LT-%');
    if (cntErr) { console.error(`${table}: 清點失敗 ${cntErr.message}`); continue; }
    if (!args.yes) {
      console.log(`[dry-run] ${table}: ${count} 行待刪（${col} like 'LT-%'）`);
      continue;
    }
    const { error } = await db.from(table).delete().like(col, 'LT-%');
    console.log(error ? `${table}: 刪除失敗 ${error.message}` : `${table}: 已刪 ${count} 行`);
  }
  if (!args.yes) console.log('\n加 --yes 執行真刪。');
}

main().catch(e => { console.error(e); process.exit(1); });
