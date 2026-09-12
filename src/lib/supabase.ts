import { createClient } from '@supabase/supabase-js';
import { fetchWithRefreshRetry } from './supabase-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// global.fetch 也会传给 auth 客户端：换 token 被限流时改报 503，避免集体掉线（见 supabase-fetch.ts）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithRefreshRetry },
});
