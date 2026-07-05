// T1 · 連接風暴 — 對應 docs/LOAD_TEST_PLAN.md §1-T1
// N 個獨立 supabase-js client（各一條 websocket）訂閱 pvp 頻道 + presence.track，
// 量：訂閱成功率 / 到 SUBSCRIBED 耗時分位數 / 保持期掉線與自動重連。
//
// 用法：
//   node scripts/load-test/t1-connections.mjs --clients 200 --ramp 10 --hold 300
//   --ramp 0 = 一次性全上（模擬「大家現在掃碼進房」）
//   --room-size 4 = 每 4 個 client 共享一個房間頻道（貼近真實 50 房×4 人拓撲）
import { requireAnonEnv } from './env.mjs';
import { Metrics, makeClient, parseArgs, progress, saveResults, sid, sleep } from './util.mjs';

const args = parseArgs({ clients: 200, ramp: 10, hold: 300, roomSize: 4, subscribeTimeout: 15 });
const env = requireAnonEnv();
const metrics = new Metrics();

const state = {
  subscribed: 0, failed: 0, drops: 0, rejoins: 0,
  clients: [], // { client, channel, id }
};

function connectOne(i) {
  const playerId = sid(i);
  const room = `LT-T1-${Math.floor(i / args.roomSize)}`;
  const client = makeClient(env);
  const channel = client.channel(`pvp-${room}`, {
    config: { broadcast: { self: false }, presence: { key: playerId } },
  });

  const started = Date.now();
  let everSubscribed = false;
  let settled = false;

  return new Promise((resolveOne) => {
    // 訂閱超時兜底：callback 一直不來也要記一筆失敗
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        state.failed++;
        metrics.record('subscribe', Date.now() - started, false, { client: playerId, room, detail: 'local-timeout' });
        resolveOne();
      }
    }, args.subscribeTimeout * 1000);

    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          state.subscribed++;
          metrics.record('subscribe', Date.now() - started, true, { client: playerId, room });
          try { await channel.track({ player_id: playerId, t: Date.now() }); } catch {}
          resolveOne();
        } else if (everSubscribed) {
          // 保持期內斷後重連成功
          state.rejoins++;
          metrics.record('rejoin', 0, true, { client: playerId, room });
        }
        everSubscribed = true;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          state.failed++;
          metrics.record('subscribe', Date.now() - started, false, { client: playerId, room, detail: `${status}${err ? ':' + err.message : ''}` });
          resolveOne();
        } else if (everSubscribed && status !== 'CLOSED') {
          // CLOSED 是主動 unsubscribe 也會觸發，只把 ERROR/TIMED_OUT 記為掉線
          state.drops++;
          metrics.record('drop', 0, false, { client: playerId, room, detail: status });
        }
      }
    });

    state.clients.push({ client, channel, id: playerId });
  });
}

async function main() {
  console.log(`T1 連接風暴: clients=${args.clients} ramp=${args.ramp}/s hold=${args.hold}s roomSize=${args.roomSize}`);
  console.log(`目標: ${env.url}`);
  const t0 = Date.now();

  const pending = [];
  for (let i = 0; i < args.clients; i++) {
    pending.push(connectOne(i));
    progress(`發起 ${i + 1}/${args.clients} · 已訂閱 ${state.subscribed} · 失敗 ${state.failed}`);
    if (args.ramp > 0) await sleep(1000 / args.ramp);
  }
  await Promise.all(pending);
  const rampDone = Date.now();
  console.log(`\n全部發起完成（${((rampDone - t0) / 1000).toFixed(1)}s）: 訂閱成功 ${state.subscribed}/${args.clients}, 失敗 ${state.failed}`);

  // 保持期：觀察掉線/重連
  console.log(`保持 ${args.hold}s 觀察掉線...`);
  const holdEnd = Date.now() + args.hold * 1000;
  while (Date.now() < holdEnd) {
    await sleep(5000);
    progress(`保持中 ${Math.round((holdEnd - Date.now()) / 1000)}s · 掉線 ${state.drops} · 重連恢復 ${state.rejoins}`);
  }
  console.log('');

  // 收尾
  for (const { client } of state.clients) {
    try { await client.removeAllChannels(); } catch {}
  }

  const lat = metrics.latencies('subscribe');
  const summary = {
    test: 't1-connections', args, target: env.url,
    attempted: args.clients,
    subscribed: state.subscribed,
    failed: state.failed,
    successRate: +(state.subscribed / args.clients * 100).toFixed(2) + '%',
    subscribeLatency: metrics.summary().subscribe,
    holdSeconds: args.hold,
    dropsDuringHold: state.drops,
    rejoinsDuringHold: state.rejoins,
    errorsSample: metrics.errorsSample(),
    passCriteria: {
      'subscribe 成功率 ≥ 99.5% (200 併發檔)': state.subscribed / args.clients >= 0.995,
      'p95 subscribe < 3000ms': (metrics.summary().subscribe?.p95 ?? Infinity) < 3000,
      '保持期非人為斷連 < 1%': state.drops / Math.max(1, state.subscribed) < 0.01,
    },
  };
  console.log(JSON.stringify(summary, (k, v) => k === 'errorsSample' ? undefined : v, 2));
  saveResults('t1-connections', summary, metrics);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
