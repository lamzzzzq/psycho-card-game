import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 登录重试分类（2026-10-26 400 人压测后：429 也排队重试）
const signIn = vi.fn();
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithPassword: (...a: unknown[]) => signIn(...a) } } }));
vi.mock('@/lib/deviceToken', () => ({ getDeviceToken: () => 'test-device' }));

import { signInWithStudentId, SIGN_IN_MAX_RATE_LIMIT_RETRIES, SIGN_IN_MAX_RETRIES } from '../auth';

const ok = { data: { session: {} }, error: null };
const rateLimited = { data: {}, error: { status: 429, name: 'AuthApiError', message: 'Request rate limit reached' } };
const busy = { data: {}, error: { status: 504, name: 'AuthRetryableFetchError', message: 'gateway timeout' } };
const wrong = { data: {}, error: { status: 400, name: 'AuthApiError', code: 'invalid_credentials', message: 'Invalid login credentials' } };

async function run(p: Promise<unknown>) {
  await vi.runAllTimersAsync();
  return p;
}

describe('signInWithStudentId 重试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    signIn.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('429 几次后成功 → 自动排队登上，onBusy 报 queue', async () => {
    signIn.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(ok);
    const onBusy = vi.fn();
    const res = await run(signInWithStudentId('12345678B', 'x', { onBusy }));
    expect(res).toEqual({ ok: true });
    expect(signIn).toHaveBeenCalledTimes(4);
    expect(onBusy).toHaveBeenCalledTimes(3);
    expect(onBusy.mock.calls.every((c) => c[2] === 'queue')).toBe(true);
  });

  it('一直 429 → 重试用完才报 login_too_many', async () => {
    signIn.mockResolvedValue(rateLimited);
    const res = await run(signInWithStudentId('12345678B', 'x'));
    expect(res).toEqual({ ok: false, error: 'login_too_many' });
    expect(signIn).toHaveBeenCalledTimes(SIGN_IN_MAX_RATE_LIMIT_RETRIES + 1);
  });

  it('密码错 → 不重试', async () => {
    signIn.mockResolvedValue(wrong);
    const res = await run(signInWithStudentId('12345678B', 'x'));
    expect(res).toEqual({ ok: false, error: 'invalid_credentials' });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('服务器忙与限流各自计数：忙用完报 server_busy', async () => {
    signIn.mockResolvedValueOnce(rateLimited).mockResolvedValue(busy);
    const onBusy = vi.fn();
    const res = await run(signInWithStudentId('12345678B', 'x', { onBusy }));
    expect(res).toEqual({ ok: false, error: 'server_busy' });
    expect(signIn).toHaveBeenCalledTimes(1 + SIGN_IN_MAX_RETRIES + 1);
    expect(onBusy.mock.calls[0][2]).toBe('queue');
    expect(onBusy.mock.calls[1][2]).toBe('busy');
  });

  it('maxRetries 同时封顶两类重试（注册后自动登录只试 2 次）', async () => {
    signIn.mockResolvedValue(rateLimited);
    const res = await run(signInWithStudentId('12345678B', 'x', { maxRetries: 2 }));
    expect(res).toEqual({ ok: false, error: 'login_too_many' });
    expect(signIn).toHaveBeenCalledTimes(3);
  });
});
