// T2 · 開場寫入尖峰 — 對應 docs/LOAD_TEST_PLAN.md §1-T2
// 模擬 N 個學生在 --window 秒內（隨機到達）執行真實開場序列：
//   ① players insert（撞 23505 → update，複刻 room-api.upsertPlayer 兩步路徑）
//   ② assessment_results insert（50 題 answers+scores JSONB，真實 payload 形狀）
//   ③ 每 --room-size 人一組：組長建房（撞碼重試），其餘並發進房（seat 23505 競態重試）
// 純 REST 寫入壓測，不建 realtime 連接。
//
// 用法：node scripts/load-test/t2-write-spike.mjs --clients 200 --window 120 --room-size 4
//
// ⚠️ players / assessment_results 是 INSERT-only RLS（SELECT 被鎖），本腳本不做讀回
//    驗證；行數用 Dashboard 或 cleanup.mjs（service_role）清點。
import { requireAnonEnv } from './env.mjs';
import { Metrics, makeClient, parseArgs, progress, randomBigFive, saveResults, sid, sleep } from './util.mjs';

const args = parseArgs({ clients: 200, window: 120, roomSize: 4 });
const env = requireAnonEnv();
const metrics = new Metrics();

// 組長建好房後把 room row 交給同組人（in-process 註冊表）
const groupRoom = new Map(); // groupIdx -> { promise, resolve, reject }
function groupSlot(g) {
  if (!groupRoom.has(g)) {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    groupRoom.set(g, { promise, resolve, reject });
  }
  return groupRoom.get(g);
}

async function timed(event, playerId, fn, detail) {
  const t0 = Date.now();
  try {
    await fn();
    metrics.record(event, Date.now() - t0, true, { client: playerId, detail });
    return true;
  } catch (e) {
    metrics.record(event, Date.now() - t0, false, { client: playerId, detail: e?.message ?? String(e) });
    return false;
  }
}

function fakeAnswers() {
  const a = {};
  for (let q = 1; q <= 50; q++) a[q] = 1 + Math.floor(Math.random() * 5);
  return a;
}

// 複刻 room-api.upsertPlayer：INSERT-only RLS 下不能用 .upsert()
async function upsertPlayer(db, playerId, bigFive) {
  const { error } = await db.from('players').insert({ id: playerId, student_id: playerId, big_five: bigFive });
  if (!error) return;
  if (error.code === '23505') {
    const { error: updateError } = await db.from('players')
      .update({ student_id: playerId, big_five: bigFive }).eq('id', playerId);
    if (updateError) throw new Error(updateError.message);
    return;
  }
  throw new Error(error.message);
}

// 複刻 room-api.createRoom：4 位隨機碼，撞 23505 重試 5 次
async function createRoom(db, hostId) {
  for (let i = 0; i < 5; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data, error } = await db.from('rooms')
      .insert({ code, host_id: hostId, status: 'waiting', settings: { maxPlayers: args.roomSize, totalRounds: 5 } })
      .select().single();
    if (error?.code === '23505') continue;
    if (error) throw new Error(error.message);
    const { error: seatErr } = await db.from('room_players')
      .insert({ room_id: data.id, player_id: hostId, seat_index: 0, avatar: null });
    if (seatErr) throw new Error(seatErr.message);
    return data;
  }
  throw new Error('撞碼重試 5 次仍失敗');
}

// 複刻 room-api.joinRoom 的 seat 競態重試循環（同組 3 人並發進房刻意打 23505）
async function joinRoom(db, room, playerId) {
  let retries = 0;
  for (let attempt = 0; attempt <= args.roomSize; attempt++) {
    const { data: players, error: countError } = await db.from('room_players')
      .select('seat_index, player_id').eq('room_id', room.id);
    if (countError) throw new Error(countError.message);
    const mine = players?.find(p => p.player_id === playerId);
    if (mine) return retries;
    if ((players?.length ?? 0) >= args.roomSize) throw new Error('房間已滿');
    const taken = new Set(players?.map(p => p.seat_index) ?? []);
    let seat = 0;
    while (taken.has(seat)) seat++;
    const { error: joinError } = await db.from('room_players')
      .insert({ room_id: room.id, player_id: playerId, seat_index: seat, avatar: null });
    if (!joinError) return retries;
    if (joinError.code === '23505') { retries++; continue; }
    throw new Error(joinError.message);
  }
  throw new Error('seat 重試耗盡');
}

async function runStudent(i) {
  const playerId = sid(i);
  const group = Math.floor(i / args.roomSize);
  const isLeader = i % args.roomSize === 0;
  const db = makeClient(env);

  // 泊松式隨機到達：均勻散在窗口內（組長也隨機，成員 await 組長完成再進房）
  await sleep(Math.random() * args.window * 1000);

  await timed('players_upsert', playerId, () => upsertPlayer(db, playerId, randomBigFive()));
  await timed('assessment_insert', playerId, () => db.from('assessment_results').insert({
    student_id: playerId,
    device_token: 'loadtest',
    source: 'assessment',
    answers: fakeAnswers(),
    scores: randomBigFive(),
    answered_count: 50,
  }).then(({ error }) => { if (error) throw new Error(error.message); }));

  const slot = groupSlot(group);
  if (isLeader) {
    const t0 = Date.now();
    try {
      const room = await createRoom(db, playerId);
      metrics.record('room_create', Date.now() - t0, true, { client: playerId, room: room.code });
      slot.resolve(room);
    } catch (e) {
      metrics.record('room_create', Date.now() - t0, false, { client: playerId, detail: e.message });
      slot.reject(e);
    }
  } else {
    let room;
    try { room = await slot.promise; } catch {
      metrics.record('room_join', 0, false, { client: playerId, detail: '組長建房失敗，跳過進房' });
      return;
    }
    const t0 = Date.now();
    try {
      const retries = await joinRoom(db, room, playerId);
      metrics.record('room_join', Date.now() - t0, true, { client: playerId, room: room.code, detail: `retries=${retries}` });
    } catch (e) {
      metrics.record('room_join', Date.now() - t0, false, { client: playerId, room: room.code, detail: e.message });
    }
  }
}

async function main() {
  console.log(`T2 開場寫入尖峰: clients=${args.clients} window=${args.window}s roomSize=${args.roomSize}`);
  console.log(`目標: ${env.url} · 學號前綴 LT-（跑完用 cleanup.mjs 清理）`);

  let done = 0;
  const ticker = setInterval(() => progress(`完成 ${done}/${args.clients}`), 1000);
  await Promise.all(Array.from({ length: args.clients }, (_, i) =>
    runStudent(i).finally(() => { done++; })
  ));
  clearInterval(ticker);
  console.log('');

  const s = metrics.summary();
  const totalErrors = Object.values(s).reduce((n, v) => n + v.errors, 0);
  const totalOps = Object.values(s).reduce((n, v) => n + v.total, 0);
  const worstP95 = Math.max(...Object.values(s).map(v => v.p95 ?? 0));
  const summary = {
    test: 't2-write-spike', args, target: env.url,
    byEvent: s,
    totalOps, totalErrors,
    errorRate: +(totalErrors / totalOps * 100).toFixed(2) + '%',
    errorsSample: metrics.errorsSample(),
    passCriteria: {
      '各類寫入 p95 < 1500ms': worstP95 < 1500,
      '非預期錯誤率 < 0.5%（23505 已在重試內部消化，不計錯）': totalErrors / totalOps < 0.005,
    },
  };
  console.log(JSON.stringify(summary, (k, v) => k === 'errorsSample' ? undefined : v, 2));
  saveResults('t2-write-spike', summary, metrics);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
