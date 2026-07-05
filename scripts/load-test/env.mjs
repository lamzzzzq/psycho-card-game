// 讀取 Supabase 連接配置：優先 process.env，其次倉庫根目錄 .env.local。
// key 一律不寫死；SERVICE_ROLE_KEY 僅 cleanup.mjs 需要（本地環境變量提供，不入 git）。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function parseDotEnv(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const dotenv = parseDotEnv(resolve(repoRoot, '.env.local'));

function pick(...names) {
  for (const n of names) {
    if (process.env[n]) return process.env[n];
    if (dotenv[n]) return dotenv[n];
  }
  return undefined;
}

export const SUPABASE_URL = pick('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = pick('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const SERVICE_ROLE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY');

export function requireAnonEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('缺少 SUPABASE_URL / SUPABASE_ANON_KEY（或 .env.local 里的 NEXT_PUBLIC_ 版本）');
    process.exit(1);
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export function requireServiceEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('cleanup 需要 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（只放本地 env，勿入 git）');
    process.exit(1);
  }
  return { url: SUPABASE_URL, serviceKey: SERVICE_ROLE_KEY };
}
