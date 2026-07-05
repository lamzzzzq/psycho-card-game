// T3 · 對局消息風暴（--churn > 0 即 T4 斷線重連風暴）— docs/LOAD_TEST_PLAN.md §1-T3/T4
// 按真實協議模擬 50 房 × 4 人打牌：
//   非 host 成員發 action-request → host 收到後按人 fan-out roomSize 條
//   game-state-update（toPlayerId 定向，含 seq/sentAt/仿真 payload）。
// 量：端到端延遲分位數 / seq 空洞丟包率 / send 返回非 ok（rate limited）/
//     churn 模式下重連 + state-request 重同步耗時。
//
// 用法：
//   node scripts/load-test/t3-message-storm.mjs --rooms 50 --room-size 4 --duration 600
//   T4：加 --churn 0.2 --churn-every 60（每 60s 隨機斷掉 20% 非 host 成員，5-30s 後重連）
//
// 注意：所有模擬端同進程 → sentAt 比較無時鐘偏移問題；若分片到多機跑，
//       延遲統計只在同進程內有效。
import { requireAnonEnv } from './env.mjs';
import { Metrics, makeClient, parseArgs, jitter, pct, progress, saveResults, sleep } from './util.mjs';

const args = parseArgs({
  rooms: 50, roomSize: 4, duration: 600,
  intervalMin: 2000, intervalMax: 5000,
  payload: 4096,           // 仿真序列化狀態體積（bytes），對齊真實 game-state-update 量級
  churn: 0, churnEvery: 60, // T4 參數
});
const env = requireAnonEnv();
const metrics = new Metrics();
const FILLER = 'x'.repeat(args.payload);

const counters = { sent: 0, sendErrors: 0, received: 0, lost: 0 };
const allMembers = []; // 扁平成員表，churn 取樣用

class Member {
  constructor(roomIdx, seat) {
    this.roomIdx = roomIdx;
    this.seat = seat;
    this.id = `LT-R${roomIdx}-P${seat}`;
    this.roomCode = `LT-R${roomIdx}`;
    this.isHost = seat === 0;
    this.client = makeClient(env);
    this.channel = null;
    this.online = false;
    this.lastSeq = 0;       // 丟包統計基線；重連後置 null 表示「下一條重設基線」
    this.hostSeq = 0;       // host 專用：本房狀態版本號
    this.pendingReqs = new Map(); // reqId -> sentAt（actor 端 RTT / resync 統計）
  }

  subscribe() {
    return new Promise((resolve) => {
      const t0 = Date.now();
      let settled = false;
      this.channel = this.client.channel(`pvp-${this.roomCode}`, {
        config: { broadcast: { self: false }, presence: { key: this.id } },
      });
      this.channel.on('broadcast', { event: 'msg' }, ({ payload }) => this.onMessage(payload));
      this.channel.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          this.online = true;
          if (!settled) { settled = true; metrics.record('subscribe', Date.now() - t0, true, { client: this.id, room: this.roomCode }); resolve(true); }
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          if (!settled) { settled = true; metrics.record('subscribe', Date.now() - t0, false, { client: this.id, room: this.roomCode, detail: `${status}${err ? ':' + err.message : ''}` }); resolve(false); }
        }
      });
    });
  }

  async send(payload) {
    if (!this.channel || !this.online) return;
    counters.sent++;
    try {
      const res = await this.channel.send({ type: 'broadcast', event: 'msg', payload });
      if (res !== 'ok') {
        counters.sendErrors++;
        metrics.record('send_error', 0, false, { client: this.id, room: this.roomCode, detail: res });
      }
    } catch (e) {
      counters.sendErrors++;
      metrics.record('send_error', 0, false, { client: this.id, room: this.roomCode, detail: e?.message ?? String(e) });
    }
  }

  onMessage(payload) {
    if (!payload) return;
    if (payload.type === 'action-request' && this.isHost) {
      // host 收到出牌請求 → 按人 fan-out roomSize 條個人視角狀態（複刻真實 handlePlayerAction 廣播）
      void this.fanOutState(payload.reqId);
      return;
    }
    if (payload.type === 'state-request' && this.isHost) {
      // 重連者要狀態 → 定向補一條（複刻真實 resync 路徑）
      void this.send({
        type: 'game-state-update', toPlayerId: payload.fromPlayerId,
        seq: this.hostSeq, sentAt: Date.now(), resyncFor: payload.reqId, filler: FILLER,
      });
      return;
    }
    if (payload.type === 'game-state-update') {
      if (payload.toPlayerId && payload.toPlayerId !== this.id) return; // 定向消息，非本人忽略
      counters.received++;
      metrics.record('state_latency', Date.now() - payload.sentAt, true, { client: this.id, room: this.roomCode });
      if (payload.resyncFor && this.pendingReqs.has(payload.resyncFor)) {
        metrics.record('resync', Date.now() - this.pendingReqs.get(payload.resyncFor), true, { client: this.id, room: this.roomCode });
        this.pendingReqs.delete(payload.resyncFor);
      }
      // seq 空洞 = 丟包（重連後第一條只重設基線，離線期漏掉的不計協議丟包）
      if (typeof payload.seq === 'number') {
        if (this.lastSeq === null) {
          this.lastSeq = payload.seq;
        } else if (payload.seq > this.lastSeq) {
          const gap = payload.seq - this.lastSeq - 1;
          if (gap > 0) {
            counters.lost += gap;
            metrics.record('seq_gap', 0, false, { client: this.id, room: this.roomCode, detail: `missed=${gap}` });
          }
          this.lastSeq = payload.seq;
        }
      }
    }
  }

  async fanOutState(reqId) {
    this.hostSeq++;
    const sentAt = Date.now();
    for (let s = 0; s < args.roomSize; s++) {
      await this.send({
        type: 'game-state-update', toPlayerId: `LT-R${this.roomIdx}-P${s}`,
        seq: this.hostSeq, sentAt, reqFor: reqId, filler: FILLER,
      });
    }
  }
}

// ── 每房對局循環 ─────────────────────────────────────────────────────────────
async function roomLoop(members, endAt) {
  const host = members[0];
  let turn = 0;
  while (Date.now() < endAt) {
    await sleep(jitter(args.intervalMin, args.intervalMax));
    const actor = members[turn % members.length];
    turn++;
    if (!actor.online) continue; // churn 斷線中，跳過他的回合（真實桌上就是卡他）
    if (actor.isHost) {
      await host.fanOutState(null); // host 自己出牌：直接廣播新狀態
    } else {
      const reqId = `${actor.id}-${turn}`;
      await actor.send({ type: 'action-request', fromPlayerId: actor.id, reqId, action: { type: 'discard' } });
    }
  }
}

// ── churn（T4）：隨機斷線 → 5-30s 後重連 + state-request ────────────────────
async function churnLoop(endAt) {
  while (Date.now() < endAt - 35_000) { // 结束前 35s 停止制造断线，让最后一批赶得上重连
    await sleep(args.churnEvery * 1000);
    const candidates = allMembers.filter(m => !m.isHost && m.online);
    const victims = candidates.sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(candidates.length * args.churn));
    for (const v of victims) void churnOne(v);
    if (victims.length) console.error(`\n[churn] 斷掉 ${victims.length} 個成員`);
  }
}

async function churnOne(m) {
  m.online = false;
  try { await m.client.removeAllChannels(); } catch {}
  m.client.realtime.disconnect();
  await sleep(jitter(5000, 30000));
  const reconnStart = Date.now();
  m.lastSeq = null; // 重連後重設丟包基線
  const ok = await m.subscribe();
  metrics.record('reconnect', Date.now() - reconnStart, ok, { client: m.id, room: m.roomCode });
  if (ok) {
    const reqId = `resync-${m.id}-${Date.now()}`;
    m.pendingReqs.set(reqId, Date.now());
    await m.send({ type: 'state-request', fromPlayerId: m.id, reqId });
  }
}

async function main() {
  const totalClients = args.rooms * args.roomSize;
  console.log(`T3 消息風暴: rooms=${args.rooms}×${args.roomSize}人 (${totalClients} 連接) duration=${args.duration}s payload=${args.payload}B churn=${args.churn}`);
  console.log(`目標: ${env.url}`);

  // 建房入座（realtime only，不寫 DB）
  for (let r = 0; r < args.rooms; r++) {
    const members = Array.from({ length: args.roomSize }, (_, s) => new Member(r, s));
    allMembers.push(...members);
  }
  // 分批訂閱（避免 join 風暴掩蓋本測試主題；join 風暴屬 T1）
  let subscribed = 0;
  for (let i = 0; i < allMembers.length; i += 20) {
    const batch = allMembers.slice(i, i + 20);
    const results = await Promise.all(batch.map(m => m.subscribe()));
    subscribed += results.filter(Boolean).length;
    progress(`訂閱 ${Math.min(i + 20, allMembers.length)}/${allMembers.length}`);
  }
  console.log(`\n訂閱完成 ${subscribed}/${totalClients}，開始 ${args.duration}s 風暴`);

  const endAt = Date.now() + args.duration * 1000;
  const loops = [];
  for (let r = 0; r < args.rooms; r++) {
    loops.push(roomLoop(allMembers.slice(r * args.roomSize, (r + 1) * args.roomSize), endAt));
  }
  if (args.churn > 0) loops.push(churnLoop(endAt));

  const ticker = setInterval(() => {
    const lat = metrics.latencies('state_latency');
    progress(`剩 ${Math.max(0, Math.round((endAt - Date.now()) / 1000))}s · 發 ${counters.sent} 收 ${counters.received} 丟 ${counters.lost} 發送失敗 ${counters.sendErrors} · p95=${pct(lat, 95) ?? '-'}ms`);
  }, 3000);

  await Promise.all(loops);
  clearInterval(ticker);
  await sleep(15000); // 長尾等待在途消息落地（free tier 偶發堵塞會遲到數秒，見 probe.mjs）
  for (const m of allMembers) { try { await m.client.removeAllChannels(); } catch {} }
  console.log('');

  const expected = counters.received + counters.lost;
  const s = metrics.summary();
  const msgsPerClassHour = Math.round(counters.sent / args.duration * 3600);
  const summary = {
    test: args.churn > 0 ? 't4-reconnect-storm' : 't3-message-storm',
    args, target: env.url,
    sent: counters.sent, received: counters.received,
    sendErrors: counters.sendErrors,
    lost: counters.lost,
    lossRate: expected ? +(counters.lost / expected * 100).toFixed(3) + '%' : '0%',
    stateLatency: s.state_latency ?? null,
    reconnect: s.reconnect ?? null,
    resync: s.resync ?? null,
    extrapolation: { '外推一堂課(60min)總消息數': msgsPerClassHour, '對照 free 2M/月': msgsPerClassHour < 2_000_000 },
    errorsSample: metrics.errorsSample(),
    passCriteria: {
      'state p95 < 800ms': (s.state_latency?.p95 ?? Infinity) < 800,
      '丟包率 < 1%': !expected || counters.lost / expected < 0.01,
      ...(args.churn > 0 ? { 'resync p95 < 5000ms': (s.resync?.p95 ?? Infinity) < 5000 } : {}),
    },
  };
  console.log(JSON.stringify(summary, (k, v) => k === 'errorsSample' ? undefined : v, 2));
  saveResults(summary.test, summary, metrics);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
