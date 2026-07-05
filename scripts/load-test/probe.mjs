// 最小廣播延遲探針（診斷工具）：A→B 單通道 20 發，量純協議 RTT，
// 用於在 T3 數字異常時區分「腳本問題」vs「Supabase/網絡本身抖動」。
// 冒煙實測（2026-07-05, free tier）：基線 p50 ≈ 260ms，但偶發 1-10s 尖峰/短暫堵塞。
// 用法：node scripts/load-test/probe.mjs
import { requireAnonEnv } from './env.mjs';
import { makeClient, sleep, pct } from './util.mjs';

const env = requireAnonEnv();
const A = makeClient(env);
const B = makeClient(env);

const lats = [];
const chB = B.channel('probe-x', { config: { broadcast: { self: false } } });
chB.on('broadcast', { event: 'ping' }, ({ payload }) => {
  const ms = Date.now() - payload.t;
  lats.push(ms);
  console.log(`#${payload.i} ${ms}ms`);
});
await new Promise(r => chB.subscribe((s, e) => { console.log('B:', s, e?.message ?? ''); if (s === 'SUBSCRIBED') r(); }));
const chA = A.channel('probe-x', { config: { broadcast: { self: false } } });
await new Promise(r => chA.subscribe((s, e) => { console.log('A:', s, e?.message ?? ''); if (s === 'SUBSCRIBED') r(); }));

for (let i = 0; i < 20; i++) {
  const res = await chA.send({ type: 'broadcast', event: 'ping', payload: { i, t: Date.now() } });
  if (res !== 'ok') console.log(`send #${i}: ${res}`);
  await sleep(500);
}
await sleep(20000); // 長尾等待：free tier 偶發堵塞會讓消息遲到數秒
lats.sort((a, b) => a - b);
console.log(`n=${lats.length}/20 p50=${pct(lats, 50)}ms p95=${pct(lats, 95)}ms max=${lats[lats.length - 1] ?? '-'}ms`);
process.exit(0);
