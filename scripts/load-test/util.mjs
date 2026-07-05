// 壓測公共層：參數解析 / 指標收集(分位數) / 結果落盤(JSON+CSV) / 節奏工具。
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const RESULTS_DIR = resolve(here, 'results');

// ── CLI ──────────────────────────────────────────────────────────────────────
// 用法：parseArgs({ clients: 200, ramp: 10, flagX: false })
// --key value 覆蓋數值/字符串默認；布爾默認的 key 出現即為 true。
export function parseArgs(defaults) {
  const out = { ...defaults };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!(key in out)) {
      console.error(`未知參數 --${a.slice(2)}，可用: ${Object.keys(out).map(k => '--' + k).join(' ')}`);
      process.exit(1);
    }
    if (typeof out[key] === 'boolean') { out[key] = true; continue; }
    const v = argv[++i];
    out[key] = typeof out[key] === 'number' ? Number(v) : v;
  }
  return out;
}

// ── 指標 ─────────────────────────────────────────────────────────────────────
export class Metrics {
  constructor() { this.rows = []; }
  // record('players_insert', 123, true, { client: 'LT-0001' })
  record(event, latencyMs, ok, extra = {}) {
    this.rows.push({ ts: Date.now(), event, latencyMs: Math.round(latencyMs), ok, ...extra });
  }
  latencies(event, onlyOk = true) {
    return this.rows
      .filter(r => r.event === event && (!onlyOk || r.ok))
      .map(r => r.latencyMs)
      .sort((a, b) => a - b);
  }
  events() { return [...new Set(this.rows.map(r => r.event))]; }
  summary() {
    const out = {};
    for (const ev of this.events()) {
      const all = this.rows.filter(r => r.event === ev);
      const ok = all.filter(r => r.ok);
      const lat = ok.map(r => r.latencyMs).sort((a, b) => a - b);
      out[ev] = {
        total: all.length,
        ok: ok.length,
        errors: all.length - ok.length,
        p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99),
        max: lat.length ? lat[lat.length - 1] : null,
      };
    }
    return out;
  }
  errorsSample(limit = 20) {
    return this.rows.filter(r => !r.ok).slice(0, limit);
  }
}

export function pct(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

// ── 落盤 ─────────────────────────────────────────────────────────────────────
export function saveResults(testName, summaryObj, metrics) {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = resolve(RESULTS_DIR, `${testName}-${stamp}`);
  writeFileSync(`${base}.summary.json`, JSON.stringify(summaryObj, null, 2));
  if (metrics?.rows?.length) {
    const cols = ['ts', 'event', 'latencyMs', 'ok', 'client', 'room', 'detail'];
    const csv = [cols.join(',')].concat(
      metrics.rows.map(r => cols.map(c => csvCell(r[c])).join(','))
    ).join('\n');
    writeFileSync(`${base}.csv`, csv);
  }
  console.log(`\n结果已写入 ${base}.summary.json`);
  return base;
}

function csvCell(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── 節奏 ─────────────────────────────────────────────────────────────────────
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const jitter = (min, max) => min + Math.random() * (max - min);

// 進度單行刷新（stderr，避免污染 stdout 摘要）
export function progress(text) {
  process.stderr.write(`\r${text}          `);
}

// ── Supabase client 工廠 ─────────────────────────────────────────────────────
// 一個模擬客戶端 = 一個 createClient 實例 = 一條獨立 websocket（訂閱時建立），
// 與真實學生端行為一致；不覆蓋 eventsPerSecond 等默認限速，保持仿真。
export function makeClient(env) {
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const sid = (i) => `LT-${String(i).padStart(4, '0')}`;

export function randomBigFive() {
  const r = () => +(Math.random() * 4 + 1).toFixed(2);
  return { O: r(), C: r(), E: r(), A: r(), N: r() };
}
