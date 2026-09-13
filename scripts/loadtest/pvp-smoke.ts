/**
 * 五大人格 PVP 冒烟压测：N 个机器人（默认 500）分成 4 人桌同时开局、打完、存档。
 *
 * 每个机器人 = 一个独立 supabase client（独立 websocket + 独立登录态），
 * 走和浏览器完全相同的数据路径：
 *   登录 → profiles 占会话/心跳 → players upsert → rooms/room_players 建房/入座
 *   → Realtime 频道 pvp-<code>（broadcast + presence）+ rooms postgres_changes
 *   → 房主跑真引擎(pvp-game-logic) 逐人推送状态 → 终局写 game_sessions/snapshots/participants
 * 出牌决策复用 ai-engine（medium），另有小概率故意乱胡，覆盖罚停路径。
 *
 * 用法（在仓库根目录）：
 *   npx tsx scripts/loadtest/pvp-smoke.ts run --bots 500 --auth
 *   选项：--bots N  --prefix ZSMK  --password xxx  --auth  --think 2000-6000
 *        --claim 600-2500  --table-rate 2(桌/秒)  --rounds 10  --timeout-min 30
 *
 * 学号 = <prefix(4)><5位序号>，共 9 位（与真实学号同长度），清理时按前缀删。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { initializePvpGame, applyPvpAction } from '@/lib/pvp-game-logic';
import { serializeGameState } from '@/lib/pvp-serializer';
import { getPlayerScore, getRankings } from '@/lib/game-logic';
import {
  makeAIDecision,
  makeAIHuDecision,
  makeAIPongDecision,
  makeAISelfPongDecision,
} from '@/lib/ai-engine';
import type { GameState, Player, PlayerId, BigFiveScores, GameCard } from '@/types';
import type {
  Room,
  RoomPlayer,
  RoomSettings,
  RealtimeMessage,
  PvpAction,
  SerializedGameState,
  SerializedPlayer,
} from '@/types/pvp';

// ── 参数 ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const MODE = argv[0] ?? 'run';
function opt(name: string, dflt: string): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
const flag = (name: string) => argv.includes(`--${name}`);
const range = (s: string): [number, number] => {
  const [a, b] = s.split('-').map(Number);
  return [a, b ?? a];
};

const N_BOTS = Number(opt('bots', '500'));
const PREFIX = opt('prefix', 'ZSMK').toUpperCase();
const PASSWORD = opt('password', 'Smoke#2026');
const USE_AUTH = flag('auth');
const THINK = range(opt('think', '2000-6000'));
const CLAIM_THINK = range(opt('claim', '600-2500'));
const TABLE_RATE = Number(opt('table-rate', '2'));
const ROUNDS = Number(opt('rounds', '10'));
const TIMEOUT_MS = Number(opt('timeout-min', '30')) * 60_000;
const OUT_DIR = opt('out', 'scripts/loadtest/out');
// 登录分阶段：--login-only 只测登录；--login-first 全员登上再开局。
// 被 429 挡住的像真人一样隔几秒再点一次登录，最多 --login-retries 次。
const LOGIN_ONLY = flag('login-only');
const LOGIN_FIRST = flag('login-first') || LOGIN_ONLY;
const LOGIN_WINDOW_S = Number(opt('login-window', '60'));
const LOGIN_RETRIES = Number(opt('login-retries', LOGIN_FIRST ? '20' : '1'));
const LOGIN_BACKOFF = range(opt('login-backoff', '3000-8000'));
// 与 accounts.ts 同一套前缀规则：4 字母，且避开库里已有的 4 字母开头学号
if (!/^[A-Z]{4}$/.test(PREFIX) || ['DUDB', 'FHBH', 'TEST', 'SIMT', 'LIVE'].includes(PREFIX)) {
  throw new Error(`prefix ${PREFIX} 不可用（须 4 字母且不与现有数据冲突）`);
}

const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';
const CLAIM_WINDOW_MS = 20_000; // 与 usePvpStore 一致
const HEARTBEAT_MS = 60_000; // 与 auth 单会话心跳一致
const STALL_MS = 120_000; // 一桌 2 分钟没有任何状态推进 = 卡死

// 本机读 .env.local；CI 没有这个文件，直接用环境变量
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  if (!existsSync('.env.local')) return env;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}
const ENV = loadEnv();
const URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const ANON = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const studentIdOf = (i: number) => `${PREFIX}${String(i).padStart(9 - PREFIX.length, '0')}`;

// 本机走 Shadowrocket TUN 代理：500 个客户端同时新建 TLS 连接会被代理 ECONNRESET
// （实测连 cloudflare.com 并发 300 都被重置 9~36%）。给 REST 请求加并发上限，
// 让 undici 复用 keep-alive 连接 —— DB 侧每秒请求量不变，只是不再每次新握手。
// Realtime websocket 不走 fetch，仍是每个机器人一条独立连接。
const HTTP_CONC = Number(opt('http-conc', '64'));
let inFlight = 0;
const waiters: (() => void)[] = [];
// 本机排队时间记到当前 timed() 调用上，db.* 延迟里扣掉，只剩 Supabase 真实耗时
const queueCtx = new AsyncLocalStorage<{ queued: number }>();
const limitedFetch: typeof fetch = async (input, init) => {
  if (inFlight >= HTTP_CONC) {
    const q = Date.now();
    await new Promise<void>((r) => waiters.push(r));
    const waited = Date.now() - q;
    rec('http.queueWait', waited);
    const ctx = queueCtx.getStore();
    if (ctx) ctx.queued += waited;
  }
  inFlight++;
  try {
    return await fetch(input, init);
  } finally {
    inFlight--;
    waiters.shift()?.();
  }
};

// ── 指标 ──────────────────────────────────────────────────────────────────────
const T0 = Date.now();
const counters: Record<string, number> = {};
const lat: Record<string, number[]> = {};
const errors: { t: number; where: string; msg: string }[] = [];
const inc = (k: string, n = 1) => (counters[k] = (counters[k] ?? 0) + n);
const rec = (k: string, ms: number) => (lat[k] ??= []).push(ms);
function err(where: string, e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
  inc(`err:${where}`);
  if (errors.length < 2000) errors.push({ t: Date.now() - T0, where, msg: msg?.slice(0, 300) });
}
async function timed<T>(k: string, fn: () => PromiseLike<T>): Promise<T> {
  const ctx = { queued: 0 };
  const s = Date.now();
  try {
    // 必须在 run 里 await：supabase 查询是 thenable，then() 时才真正发 fetch
    return await queueCtx.run(ctx, async () => await fn());
  } finally {
    rec(k, Date.now() - s - ctx.queued);
  }
}
function pct(a: number[], p: number) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = ([a, b]: [number, number]) => a + Math.random() * (b - a);

function randomBigFive(): BigFiveScores {
  const r = () => +(Math.random() * 4 + 1).toFixed(2);
  return { O: r(), C: r(), E: r(), A: r(), N: r() };
}

// ── 桌 ────────────────────────────────────────────────────────────────────────
type TableResult = {
  table: number;
  code?: string;
  outcome: 'finished' | 'stalled' | 'setup-failed' | 'timeout';
  detail?: string;
  actions: number;
  rounds?: number;
  startedAt?: number;
  endedAt?: number;
  saved?: boolean;
  sessionId?: string;
  rosterFromBroadcast?: number;
};

class Table {
  bots: Bot[] = [];
  room?: Room;
  result: TableResult;
  lastProgress = Date.now();
  done!: Promise<void>;
  private resolveDone!: () => void;
  constructor(public index: number) {
    this.result = { table: index, outcome: 'timeout', actions: 0 };
    this.done = new Promise((r) => (this.resolveDone = r));
  }
  finish(outcome: TableResult['outcome'], detail?: string) {
    if (this.result.endedAt) return;
    this.result.outcome = outcome;
    this.result.detail = detail;
    this.result.endedAt = Date.now() - T0;
    inc(`table:${outcome}`);
    this.resolveDone();
  }
  get finished() {
    return !!this.result.endedAt;
  }
}

// ── 机器人 ────────────────────────────────────────────────────────────────────
class Bot {
  sb: SupabaseClient;
  id: string;
  bigFive = randomBigFive();
  avatar = ['🦊', '🐼', '🐯', '🐸', '🐙', '🦉'][Math.floor(Math.random() * 6)];
  deviceToken = crypto.randomUUID();
  userId?: string;
  channel?: RealtimeChannel;
  statusChannel?: RealtimeChannel;
  isHost = false;
  roster: RoomPlayer[] = [];
  raw: GameState | null = null; // 房主持有
  view: SerializedGameState | null = null;
  lastActedKey = '';
  decideTimer: ReturnType<typeof setTimeout> | null = null;
  claimTimer: ReturnType<typeof setTimeout> | null = null;
  heartbeat: ReturnType<typeof setInterval> | null = null;
  pendingSendAt: number | null = null;
  pendingLogLen = 0;
  gotGameOver = false;
  subscribed = false;
  statusClosing = false; // 主动退订 rooms 频道时置起，CLOSED 回调不算故障

  closeStatusChannel() {
    this.statusClosing = true;
    void this.statusChannel?.unsubscribe();
  }

  constructor(public index: number, public table: Table) {
    this.id = studentIdOf(index);
    this.sb = createClient(URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
      global: { fetch: limitedFetch },
    });
  }

  // ── 账号 ──
  async login(): Promise<boolean> {
    if (!USE_AUTH || this.userId) return true;
    const email = `${this.id.toLowerCase()}@${EMAIL_DOMAIN}`;
    const firstTry = Date.now();
    for (let attempt = 1; ; attempt++) {
      const { data, error } = await timed('auth.signIn', () =>
        this.sb.auth.signInWithPassword({ email, password: PASSWORD })
      );
      if (!error && data.session) {
        this.userId = data.session.user.id;
        rec('auth.timeToLoggedIn', Date.now() - firstTry);
        rec('auth.attemptsNeeded', attempt);
        break;
      }
      err('auth.signIn', `${error?.status ?? ''} ${error?.message ?? 'no session'}`);
      if (attempt >= LOGIN_RETRIES) {
        inc('auth:gaveUp');
        return false;
      }
      await sleep(rand(LOGIN_BACKOFF));
    }
    // 同 claimSession：占会话
    const { error: e2 } = await timed('db.profiles.claim', () =>
      this.sb
        .from('profiles')
        .update({ active_device: this.deviceToken, active_at: new Date().toISOString() })
        .eq('id', this.userId!)
    );
    if (e2) err('db.profiles.claim', e2);
    // 同 heartbeatSession：60s 一次 select + update
    this.heartbeat = setInterval(async () => {
      const r1 = await timed('db.profiles.hbSelect', () =>
        this.sb.from('profiles').select('active_device').eq('id', this.userId!).maybeSingle()
      );
      if (r1.error) err('db.profiles.hbSelect', r1.error);
      else if (r1.data?.active_device && r1.data.active_device !== this.deviceToken) inc('session:takenOver');
      const r2 = await timed('db.profiles.hbUpdate', () =>
        this.sb
          .from('profiles')
          .update({ active_device: this.deviceToken, active_at: new Date().toISOString() })
          .eq('id', this.userId!)
      );
      if (r2.error) err('db.profiles.hbUpdate', r2.error);
    }, HEARTBEAT_MS);
    return true;
  }

  // ── 同 room-api.upsertPlayer ──
  async upsertPlayer() {
    const { error } = await timed('db.players.insert', () =>
      this.sb.from('players').insert({ id: this.id, student_id: this.id, big_five: this.bigFive })
    );
    if (!error) return;
    if (error.code === '23505') {
      const { error: e2 } = await timed('db.players.update', () =>
        this.sb.from('players').update({ student_id: this.id, big_five: this.bigFive }).eq('id', this.id)
      );
      if (e2) throw e2;
      return;
    }
    throw error;
  }

  async leaveAllRooms() {
    const { error } = await timed('db.room_players.leaveAll', () =>
      this.sb.from('room_players').delete().eq('player_id', this.id)
    );
    if (error) err('db.room_players.leaveAll', error);
  }

  // 大厅 collisionCheck（getPlayerActiveRoom 同款查询）
  async activeRoomCheck() {
    const cutoff = new Date(Date.now() - 6 * 3600_000).toISOString();
    const { error } = await timed('db.activeRoom', () =>
      this.sb
        .from('room_players')
        .select('room_id, rooms!inner(code, status, created_at)')
        .eq('player_id', this.id)
        .in('rooms.status', ['waiting', 'playing'])
        .gte('rooms.created_at', cutoff)
        .limit(1)
        .maybeSingle()
    );
    if (error) err('db.activeRoom', error);
  }

  // ── 同 room-api.createRoom ──
  async createRoom(settings: RoomSettings): Promise<Room> {
    for (let i = 0; i < 8; i++) {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const { data, error } = await timed('db.rooms.insert', () =>
        this.sb.from('rooms').insert({ code, host_id: this.id, status: 'waiting', settings }).select().single()
      );
      if (error?.code === '23505') {
        inc('room:codeCollision');
        continue;
      }
      if (error) throw error;
      const { error: e2 } = await timed('db.room_players.insert', () =>
        this.sb.from('room_players').insert({ room_id: data.id, player_id: this.id, seat_index: 0, avatar: this.avatar })
      );
      if (e2) throw e2;
      return data as Room;
    }
    throw new Error('Failed to generate unique room code');
  }

  // ── 同 room-api.joinRoom ──
  async joinRoom(code: string): Promise<{ room: Room; seatIndex: number }> {
    const { data: room, error: roomError } = await timed('db.rooms.selectByCode', () =>
      this.sb.from('rooms').select('*').eq('code', code).eq('status', 'waiting').single()
    );
    if (roomError || !room) throw new Error(`房間不存在或已開始遊戲 (${roomError?.message ?? ''})`);
    const maxPlayers = (room.settings as RoomSettings)?.maxPlayers ?? 4;
    for (let attempt = 0; attempt <= maxPlayers; attempt++) {
      const { data: players, error: cErr } = await timed('db.room_players.select', () =>
        this.sb.from('room_players').select('seat_index, player_id').eq('room_id', room.id)
      );
      if (cErr) throw cErr;
      const mine = players?.find((p) => p.player_id === this.id);
      if (mine) return { room: room as Room, seatIndex: mine.seat_index };
      if ((players?.length ?? 0) >= maxPlayers) throw new Error('房間已滿');
      const taken = new Set(players?.map((p) => p.seat_index) ?? []);
      let seatIndex = 0;
      while (taken.has(seatIndex)) seatIndex++;
      const { error: jErr } = await timed('db.room_players.insert', () =>
        this.sb.from('room_players').insert({ room_id: room.id, player_id: this.id, seat_index: seatIndex, avatar: this.avatar })
      );
      if (!jErr) return { room: room as Room, seatIndex };
      if (jErr.code === '23505') {
        inc('room:seatRace');
        continue;
      }
      throw jErr;
    }
    throw new Error('房間已滿');
  }

  // room 页加载：rooms by code + getRoomPlayers（join players）
  async loadRoomPage(code: string): Promise<Room> {
    const { data, error } = await timed('db.rooms.load', () => this.sb.from('rooms').select('*').eq('code', code).single());
    if (error || !data) throw new Error(`load room failed: ${error?.message}`);
    const { data: rp, error: e2 } = await timed('db.room_players.withPlayers', () =>
      this.sb
        .from('room_players')
        .select('room_id, player_id, seat_index, avatar, players (student_id, big_five)')
        .eq('room_id', data.id)
        .order('seat_index')
    );
    if (e2) err('db.room_players.withPlayers', e2);
    this.roster = (rp ?? []).map((r: any) => ({
      room_id: r.room_id,
      player_id: r.player_id,
      seat_index: r.seat_index,
      avatar: r.avatar ?? undefined,
      student_id: r.player_id === this.id ? this.id : r.players?.student_id,
      big_five: r.player_id === this.id ? this.bigFive : r.players?.big_five ?? null,
    }));
    return data as Room;
  }

  send(msg: RealtimeMessage) {
    if (!this.channel) return;
    inc('rt.send');
    const s = Date.now();
    this.channel
      .send({ type: 'broadcast', event: 'msg', payload: msg })
      .then((r) => {
        rec('rt.sendAck', Date.now() - s);
        if (r !== 'ok') err('rt.send', `send result=${r} type=${msg.type}`);
      })
      .catch((e) => err('rt.send', e));
  }

  // ── 频道订阅（同 usePvpStore.subscribeRoom 的消息面）──
  subscribe(code: string, room: Room): Promise<void> {
    return new Promise((resolve) => {
      const started = Date.now();
      let resolved = false;
      const ch = this.sb.channel(`pvp-${code}`, { config: { broadcast: { self: false } } });
      this.channel = ch;
      ch.on('broadcast', { event: 'msg' }, ({ payload }: { payload: RealtimeMessage }) => {
        try {
          this.onMessage(payload, room);
        } catch (e) {
          err('bot.onMessage', e);
        }
      })
        .on('presence', { event: 'sync' }, () => inc('rt.presenceSync'))
        .on('presence', { event: 'join' }, () => inc('rt.presenceJoin'))
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          if (!this.table.finished) inc('rt.presenceLeaveMidGame', leftPresences.length);
        })
        .subscribe(async (status, e) => {
          if (status === 'SUBSCRIBED') {
            if (!this.subscribed) rec('rt.subscribe', Date.now() - started);
            else inc('rt.resubscribe');
            this.subscribed = true;
            try {
              const r = await ch.track({ player_id: this.id, t: Date.now() });
              if (r !== 'ok') err('rt.track', `track=${r}`);
            } catch (te) {
              err('rt.track', te);
            }
            // 非房主：重连后要状态（同 store）
            if (!this.isHost && this.view) this.send({ type: 'state-request', fromPlayerId: this.id });
            if (!resolved) {
              resolved = true;
              resolve();
            }
          } else {
            // 收尾 removeAllChannels 也会回调 CLOSED，那不是故障
            if (status === 'CLOSED' && this.table.finished) return;
            err(`rt.status.${status}`, e?.message ?? status);
            if (!resolved && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
              resolved = true;
              resolve();
            }
          }
        });
      // room 页的 rooms postgres_changes 订阅
      this.statusChannel = this.sb
        .channel(`room-status-${room.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, () =>
          inc('rt.pgChange')
        )
        .subscribe((status, e) => {
          // 开局后主动退订 / 收尾也会回调 CLOSED，那不是故障
          if (status === 'SUBSCRIBED' || (status === 'CLOSED' && (this.table.finished || this.statusClosing))) return;
          err(`rt.pg.${status}`, e?.message ?? status);
        });
    });
  }

  onMessage(payload: RealtimeMessage, room: Room) {
    inc('rt.recv');
    switch (payload.type) {
      case 'player-joined': {
        const idx = this.roster.findIndex((p) => p.player_id === payload.player.id);
        if (idx >= 0) {
          const ex = this.roster[idx];
          this.roster[idx] = {
            ...ex,
            student_id: ex.student_id ?? payload.player.studentId,
            big_five: ex.big_five ?? payload.player.bigFive,
            avatar: ex.avatar ?? payload.player.avatar,
          };
        } else {
          this.roster.push({
            room_id: room.id,
            player_id: payload.player.id,
            seat_index: payload.seatIndex,
            student_id: payload.player.studentId,
            big_five: payload.player.bigFive,
            avatar: payload.player.avatar,
          });
        }
        if (this.isHost) {
          for (const p of this.roster.filter((p) => p.player_id !== payload.player.id)) {
            this.send({
              type: 'player-joined',
              player: { id: p.player_id, studentId: p.student_id ?? p.player_id, bigFive: p.big_five ?? null, avatar: p.avatar },
              seatIndex: p.seat_index,
            });
          }
        }
        break;
      }
      case 'game-start':
      case 'game-state-update': {
        if (payload.toPlayerId && payload.toPlayerId !== this.id) break;
        if (this.pendingSendAt) {
          // 只在「自己这一步已生效」的那条状态到达时记往返，别人的动作不算
          const gs = payload.gameState;
          const mine =
            gs.claimResponses.includes(this.id) ||
            gs.actionLog.slice(this.pendingLogLen).some((a) => (a.playerId as string) === this.id);
          if (mine) {
            rec('rt.actionRoundTrip', Date.now() - this.pendingSendAt);
            this.pendingSendAt = null;
          }
        }
        if (payload.type === 'game-start') {
          inc('game:startReceived');
          this.closeStatusChannel(); // 真实 app 离开 room 页即退订
        }
        this.view = payload.gameState;
        this.table.lastProgress = Date.now();
        this.scheduleDecide();
        break;
      }
      case 'action-request':
        if (this.isHost) this.handlePlayerAction(payload.fromPlayerId, payload.action);
        break;
      case 'state-request':
        if (this.isHost && this.raw) {
          inc('rt.stateRequestServed');
          this.channel?.send({
            type: 'broadcast',
            event: 'msg',
            payload: { type: 'game-state-update', gameState: serializeGameState(this.raw, payload.fromPlayerId), toPlayerId: payload.fromPlayerId },
          });
        }
        break;
      case 'game-over':
        this.gotGameOver = true;
        break;
    }
  }

  // ── 房主：开局（同 store.startGame）──
  async startGame(room: Room) {
    const bigFiveMap = Object.fromEntries(
      this.roster.map((p) => [p.player_id, p.big_five ?? null]).filter(([, v]) => v !== null)
    ) as Record<string, BigFiveScores>;
    const ordered = [...this.roster].sort((a, b) => a.seat_index - b.seat_index).slice(0, room.settings.maxPlayers ?? 4);
    const missingBf = ordered.filter((p) => !bigFiveMap[p.player_id]).length;
    if (missingBf) inc('game:startedWithMissingBigFive', missingBf);
    const rawState = initializePvpGame(ordered, bigFiveMap, room.settings);
    (rawState as GameState & { gameStartedAt?: number }).gameStartedAt = Date.now();
    this.raw = rawState;
    void this.updateRoomStatus(room.id, 'playing'); // 真实 store 不 await
    for (const op of ordered) {
      this.send({ type: 'game-start', gameState: serializeGameState(rawState, op.player_id), toPlayerId: op.player_id });
    }
    this.closeStatusChannel();
    this.view = serializeGameState(rawState, this.id);
    this.table.result.startedAt = Date.now() - T0;
    this.table.lastProgress = Date.now();
    inc('game:started');
    this.scheduleDecide();
  }

  async updateRoomStatus(roomId: string, status: string) {
    const { error } = await timed('db.rooms.updateStatus', () => this.sb.from('rooms').update({ status }).eq('id', roomId));
    if (error) {
      err('db.rooms.updateStatus', error);
      const { error: e2 } = await this.sb.from('rooms').update({ status }).eq('id', roomId);
      if (e2) err('db.rooms.updateStatus.retry', e2);
    }
  }

  // ── 房主：处理动作（同 store.handlePlayerAction）──
  handlePlayerAction(from: string, action: PvpAction) {
    const raw = this.raw;
    if (!raw) return;
    const wasWinner = !!raw.winner;
    const currentId = raw.players[raw.currentPlayerIndex]?.id as unknown as string;
    if (action.type !== 'leave' && from !== currentId && action.type !== 'pong' && action.type !== 'skip-pong' && action.type !== 'hu') {
      inc('host:rejectedNotCurrent');
      return;
    }
    const s = Date.now();
    const next = applyPvpAction(raw, from, action);
    rec('host.applyAction', Date.now() - s);
    if (next === raw) inc(`host:noop:${action.type}`);
    this.raw = next;
    this.table.result.actions++;
    inc(`action:${action.type}`);

    const ordered = [...this.roster].sort((a, b) => a.seat_index - b.seat_index);
    // 与真实 store 一致：连房主自己那份也发（self:false 收不到，但计入 Realtime 流量）
    for (const op of ordered) {
      this.send({ type: 'game-state-update', gameState: serializeGameState(next, op.player_id), toPlayerId: op.player_id });
    }
    this.view = serializeGameState(next, this.id);
    this.table.lastProgress = Date.now();

    if (next.phase === 'claim-window') {
      if (raw.phase !== 'claim-window') this.armClaimTimer();
    } else if (this.claimTimer) {
      clearTimeout(this.claimTimer);
      this.claimTimer = null;
    }

    if (next.winner && !wasWinner) {
      this.send({ type: 'game-over', winnerId: next.winner as unknown as string });
      void this.saveGame(next);
    }
    this.scheduleDecide();
  }

  armClaimTimer() {
    if (this.claimTimer) clearTimeout(this.claimTimer);
    this.claimTimer = setTimeout(() => {
      this.claimTimer = null;
      const s = this.raw;
      if (!s || s.phase !== 'claim-window') return;
      const responded = new Set(s.claimResponses as string[]);
      const pending = s.players.filter((p, i) => i !== s.discardedByIndex && !p.hasLeft && !responded.has(p.id as unknown as string));
      inc('host:claimTimeoutFired');
      for (const p of pending) this.handlePlayerAction(p.id as unknown as string, { type: 'skip-pong' });
    }, CLAIM_WINDOW_MS);
  }

  // ── 房主：存档（同 game-record.saveInner）──
  async saveGame(finalState: GameState) {
    const room = this.table.room!;
    const sessionId = crypto.randomUUID();
    const started = Date.now();
    // 真实 store：存档 fire-and-forget，同时就把房间置 finished
    const statusDone = this.updateRoomStatus(room.id, 'finished');
    try {
      const winnerId = finalState.winner;
      const ranked: Player[] = [
        ...getRankings(finalState.players.filter((p) => !p.hasLeft)),
        ...getRankings(finalState.players.filter((p) => p.hasLeft)),
      ];
      const totalRounds = finalState.settings.totalRounds;
      const roundsPlayed = totalRounds > 0 ? Math.min(finalState.currentRound, totalRounds) : finalState.currentRound;
      this.table.result.rounds = roundsPlayed;
      const startedAt = (finalState as GameState & { gameStartedAt?: number }).gameStartedAt ?? Date.now();
      const { error: sErr } = await timed('db.game_sessions.insert', () =>
        this.sb.from('game_sessions').insert({
          id: sessionId,
          mode: 'pvp',
          room_id: room.id,
          room_code: room.code,
          started_at: new Date(startedAt).toISOString(),
          ended_at: new Date().toISOString(),
          total_rounds: totalRounds,
          rounds_played: roundsPlayed,
          winner_player_id: winnerId ? (winnerId as unknown as string) : null,
        })
      );
      if (sErr) throw sErr;
      const snap = new Map<string, string>();
      for (const p of finalState.players) {
        const id = crypto.randomUUID();
        const { error } = await timed('db.snapshots.insert', () =>
          this.sb.from('big_five_snapshots').insert({
            id,
            player_id: p.id as unknown as string,
            student_id: p.id as unknown as string,
            scores: p.bigFiveScores,
            source: 'game-start',
          })
        );
        if (error) err('db.snapshots.insert', error);
        else snap.set(p.id as unknown as string, id);
      }
      const counts: Record<string, { huS: number; huF: number; pS: number; pF: number }> = {};
      for (const a of finalState.actionLog) {
        const pid = a.playerId as string;
        counts[pid] ??= { huS: 0, huF: 0, pS: 0, pF: 0 };
        if (a.type === 'hu-success') counts[pid].huS++;
        else if (a.type === 'hu-fail') counts[pid].huF++;
        else if (a.type === 'pong-success') counts[pid].pS++;
        else if (a.type === 'pong-fail') counts[pid].pF++;
      }
      const rows = finalState.players.map((p, idx) => {
        const pid = p.id as unknown as string;
        const c = counts[pid] ?? { huS: 0, huF: 0, pS: 0, pF: 0 };
        const rank = ranked.findIndex((r) => r.id === p.id) + 1;
        return {
          session_id: sessionId,
          player_id: pid,
          student_id: pid,
          seat_index: idx,
          is_ai: false,
          big_five_snapshot_id: snap.get(pid) ?? null,
          declared_count: p.declaredSets.length,
          remaining_cards: p.hand.length,
          final_score: getPlayerScore(p),
          rank: rank > 0 ? rank : idx + 1,
          is_winner: p.id === winnerId,
          hu_success_count: c.huS,
          hu_fail_count: c.huF,
          pong_success_count: c.pS,
          pong_fail_count: c.pF,
        };
      });
      const { error: pErr } = await timed('db.participants.insert', () => this.sb.from('game_participants').insert(rows));
      if (pErr) throw pErr;
      rec('save.total', Date.now() - started);
      // 真实 saveGameSession 5s 超时即判失败、落 localStorage 等下次启动补传
      if (Date.now() - started > 5000) inc('save:over5s(realAppWouldBuffer)');
      this.table.result.saved = true;
      this.table.result.sessionId = sessionId;
      inc('game:saved');
    } catch (e) {
      err('save', e);
      this.table.result.saved = false;
    }
    await statusDone;
    this.table.finish('finished');
  }

  // ── 决策 ──
  scheduleDecide() {
    const v = this.view;
    if (!v || v.phase === 'game-over') return;
    const meIdx = v.players.findIndex((p) => p.id === this.id);
    if (meIdx < 0) return;
    const me = v.players[meIdx];
    const key = `${v.phase}|${v.currentPlayerIndex}|${v.actionLog.length}|${v.claimResponses.length}|${v.discardPile.length}`;
    if (key === this.lastActedKey) return;

    const myTurn = v.currentPlayerIndex === meIdx;
    const inClaim =
      v.phase === 'claim-window' &&
      v.discardedByIndex !== meIdx &&
      !v.claimResponses.includes(this.id) &&
      !me.hasLeft;
    if (!(myTurn && (v.phase === 'drawing' || v.phase === 'discarding')) && !inClaim) return;

    if (this.decideTimer) clearTimeout(this.decideTimer);
    const wait = inClaim ? rand(CLAIM_THINK) : rand(THINK);
    this.decideTimer = setTimeout(() => {
      this.decideTimer = null;
      // 思考期间状态可能已变 → 用最新视图重新判断
      const v2 = this.view;
      if (!v2) return;
      const key2 = `${v2.phase}|${v2.currentPlayerIndex}|${v2.actionLog.length}|${v2.claimResponses.length}|${v2.discardPile.length}`;
      if (key2 !== key) return this.scheduleDecide();
      try {
        const action = this.decide(v2, meIdx);
        if (!action) return;
        this.lastActedKey = key;
        this.dispatch(action);
      } catch (e) {
        err('bot.decide', e);
      }
    }, wait);
  }

  toPlayer(sp: SerializedPlayer): Player {
    return {
      id: sp.id as unknown as PlayerId,
      name: sp.name,
      avatar: sp.avatar,
      hand: sp.hand ?? [],
      isHuman: true,
      bigFiveScores: sp.bigFiveScores,
      declaredSets: sp.declaredSets ?? [],
      skipNextTurn: sp.skipNextTurn,
      revealedHand: sp.revealedHand,
    } as Player;
  }

  pickDiscard(player: Player, drawn: GameCard | null, v: SerializedGameState): number {
    const ctx = { discardPile: v.discardPile, actionLog: v.actionLog, currentRound: v.currentRound, totalRounds: v.totalRounds };
    if (drawn) return makeAIDecision(player, drawn, 'medium', ctx).cardToDiscard.id;
    // 碰后/罚弃：没有 drawnCard → 把最后一张手牌当 "drawn" 传入，AI 在全手牌里挑
    const hand = player.hand;
    return makeAIDecision({ ...player, hand: hand.slice(0, -1) }, hand[hand.length - 1], 'medium', ctx).cardToDiscard.id;
  }

  decide(v: SerializedGameState, meIdx: number): PvpAction | null {
    const sp = v.players[meIdx];
    const me = this.toPlayer(sp);
    const myTurn = v.currentPlayerIndex === meIdx;

    if (v.phase === 'claim-window') {
      const frozen = sp.skipNextTurn || sp.frozenUntilOwnDiscard;
      if (frozen || !v.pendingDiscard) return { type: 'skip-pong' };
      if (makeAIHuDecision(me, 'medium', v.pendingDiscard).shouldHu) return { type: 'hu' };
      const pd = makeAIPongDecision(me, v.pendingDiscard, 'medium');
      if (pd.shouldPong && pd.dimension && pd.handCardIds) return { type: 'pong', dimension: pd.dimension, handCardIds: pd.handCardIds };
      return { type: 'skip-pong' };
    }
    if (!myTurn) return null;
    if (v.phase === 'drawing') return { type: 'draw' };
    if (v.phase === 'discarding') {
      const drawn = v.drawnCard;
      if (sp.owesPenaltyDiscard || !drawn) return { type: 'discard', cardId: this.pickDiscard(me, drawn, v) };
      if (!sp.selfPongUsedThisTurn) {
        if (makeAIHuDecision(me, 'medium', drawn).shouldHu) return { type: 'hu' };
        // 学生会乱点：2% 概率故意胡错，走罚停路径
        if (Math.random() < 0.02) {
          inc('bot:bogusHu');
          return { type: 'hu' };
        }
        const spd = makeAISelfPongDecision(me, drawn, 'medium');
        if (spd.shouldPong && spd.dimension && spd.cardIds) return { type: 'self-pong', dimension: spd.dimension, cardIds: spd.cardIds };
      }
      return { type: 'discard', cardId: this.pickDiscard(me, drawn, v) };
    }
    return null;
  }

  dispatch(action: PvpAction) {
    inc('bot:dispatch');
    if (this.isHost) this.handlePlayerAction(this.id, action);
    else {
      this.pendingSendAt = Date.now();
      this.pendingLogLen = this.view?.actionLog.length ?? 0;
      this.send({ type: 'action-request', fromPlayerId: this.id, action });
    }
  }

  async teardown() {
    if (this.decideTimer) clearTimeout(this.decideTimer);
    if (this.claimTimer) clearTimeout(this.claimTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    try {
      await this.sb.removeAllChannels();
    } catch {}
    try {
      if (USE_AUTH) await this.sb.auth.signOut({ scope: 'local' });
    } catch {}
  }
}

// ── 一桌的完整流程 ────────────────────────────────────────────────────────────
async function runTable(table: Table) {
  const [host, ...guests] = table.bots;
  const settings: RoomSettings = { maxPlayers: 4, totalRounds: ROUNDS, deck: 'big-five', difficulty: 'open' };
  try {
    // 全桌同时登录（课堂：大家一起开电脑）
    const logins = await Promise.all(table.bots.map((b) => b.login()));
    if (logins.some((ok) => !ok)) throw new Error(`login failed x${logins.filter((x) => !x).length}`);

    host.isHost = true;
    await host.activeRoomCheck();
    await host.upsertPlayer();
    await host.leaveAllRooms();
    const room = await timed('flow.createRoom', () => host.createRoom(settings));
    table.room = room;
    table.result.code = room.code;
    await host.loadRoomPage(room.code);
    await host.subscribe(room.code, room);

    // 组员陆续输入房号加入（0.5~3s 错开）
    await Promise.all(
      guests.map(async (g) => {
        await sleep(500 + Math.random() * 2500);
        await g.activeRoomCheck();
        await g.upsertPlayer();
        await g.leaveAllRooms();
        const { seatIndex } = await timed('flow.joinRoom', () => g.joinRoom(room.code));
        await g.loadRoomPage(room.code);
        await g.subscribe(room.code, room);
        await sleep(300); // room 页 setTimeout(300) 后广播 player-joined
        g.send({ type: 'player-joined', player: { id: g.id, studentId: g.id, bigFive: g.bigFive, avatar: g.avatar }, seatIndex });
      })
    );

    // 房主等花名册收齐（只靠广播，和真实页面一致）
    const t = Date.now();
    while (host.roster.length < table.bots.length && Date.now() - t < 30_000) await sleep(200);
    table.result.rosterFromBroadcast = host.roster.length;
    rec('flow.rosterComplete', Date.now() - t);
    if (host.roster.length < table.bots.length) {
      inc('room:rosterIncomplete');
      // 真实页面房主会看到少人；这里记为问题，但用 DB 花名册补齐继续压测
      const before = host.roster.length;
      await host.loadRoomPage(room.code);
      for (const g of guests) {
        const r = host.roster.find((p) => p.player_id === g.id);
        if (r && !r.big_five) r.big_five = g.bigFive; // players 表 SELECT 被 RLS 锁，DB 补不到分数
      }
      err('room.rosterIncomplete', `room ${room.code}: broadcast roster ${before}/${table.bots.length}`);
    }
    await sleep(800 + Math.random() * 1500); // 房主看一眼再点开始
    await host.startGame(room);
  } catch (e) {
    err('table.setup', e);
    // PostgrestError 是普通对象（不是 Error），String(e) 只会得到 [object Object]
    const msg =
      e instanceof Error ? e.message : (e as { message?: string })?.message ?? JSON.stringify(e);
    table.finish('setup-failed', msg);
  }
}

let loginPhase: { ok: number; gaveUp: number; allDoneSec: number; errorSample?: string[] } | null = null;

function summarize(tables: Table[], bots: Bot[]) {
  const latSummary = Object.fromEntries(
    Object.entries(lat)
      .sort()
      .map(([k, a]) => [k, { n: a.length, p50: pct(a, 50), p95: pct(a, 95), p99: pct(a, 99), max: Math.max(...a) }])
  );
  const results = tables.map((t) => t.result);
  const durations = results.filter((r) => r.startedAt && r.endedAt).map((r) => (r.endedAt! - r.startedAt!) / 1000);
  const errByWhere: Record<string, number> = {};
  for (const e of errors) errByWhere[e.where] = (errByWhere[e.where] ?? 0) + 1;
  const sampleErrors: Record<string, string[]> = {};
  for (const e of errors) {
    const arr = (sampleErrors[e.where] ??= []);
    if (arr.length < 5 && !arr.includes(e.msg)) arr.push(e.msg);
  }
  return {
    config: { N_BOTS, PREFIX, USE_AUTH, THINK, CLAIM_THINK, TABLE_RATE, ROUNDS, tables: tables.length, LOGIN_FIRST, LOGIN_WINDOW_S, LOGIN_RETRIES },
    loginPhase,
    wallClockSec: Math.round((Date.now() - T0) / 1000),
    outcomes: results.reduce<Record<string, number>>((m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m), {}),
    saved: results.filter((r) => r.saved).length,
    gameDurationSec: { p50: pct(durations, 50), p95: pct(durations, 95), max: Math.max(0, ...durations) },
    actionsPerGame: { p50: pct(results.map((r) => r.actions), 50), max: Math.max(0, ...results.map((r) => r.actions)) },
    botsGotGameOver: bots.filter((b) => b.gotGameOver).length,
    counters,
    latencyMs: latSummary,
    errorsByWhere: errByWhere,
    sampleErrors,
    problemTables: results.filter((r) => r.outcome !== 'finished' || !r.saved),
    tables: results,
  };
}

async function run() {
  if (!URL || !ANON) throw new Error('缺 .env.local 的 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY');
  console.log(`[smoke] ${N_BOTS} bots, prefix ${PREFIX}, auth=${USE_AUTH}, think=${THINK}, tables @${TABLE_RATE}/s`);
  const tables: Table[] = [];
  const bots: Bot[] = [];
  for (let i = 0; i < N_BOTS; i++) {
    const ti = Math.floor(i / 4);
    tables[ti] ??= new Table(ti);
    const b = new Bot(i + 1, tables[ti]);
    tables[ti].bots.push(b);
    bots.push(b);
  }
  // 最后一桌不足 2 人就并入前一桌不了（上限 4），直接丢掉
  if (tables.length && tables[tables.length - 1].bots.length < 2) {
    const dropped = tables.pop()!;
    bots.splice(bots.length - dropped.bots.length);
  }

  // 第 1 阶段：全员登录（课堂上大家在 LOGIN_WINDOW_S 秒内陆续点登录），登完再开局
  if (USE_AUTH && LOGIN_FIRST) {
    console.log(`[smoke] phase 1: ${bots.length} logins spread over ${LOGIN_WINDOW_S}s, retries ≤${LOGIN_RETRIES}`);
    const t = Date.now();
    const loginTicker = setInterval(() => {
      const n = bots.filter((b) => b.userId).length;
      console.log(`[login ${Math.round((Date.now() - t) / 1000)}s] logged in ${n}/${bots.length} | 429s ${errors.filter((e) => e.where === 'auth.signIn').length}`);
    }, 10_000);
    const ok = await Promise.all(
      bots.map(async (b) => {
        await sleep(Math.random() * LOGIN_WINDOW_S * 1000);
        return b.login();
      })
    );
    clearInterval(loginTicker);
    const okN = ok.filter(Boolean).length;
    loginPhase = { ok: okN, gaveUp: bots.length - okN, allDoneSec: Math.round((Date.now() - t) / 1000) };
    // 登录阶段的 429 会把 errors 明细（上限 2000）占满，开局阶段的错误就看不见了。
    // 计数（counters 里的 err:*）保留，明细只留一小段样本后清空。
    if (!LOGIN_ONLY) {
      loginPhase = { ...loginPhase, errorSample: errors.slice(0, 5).map((e) => e.msg) } as typeof loginPhase;
      errors.length = 0;
    }
    console.log(`[smoke] phase 1 done: ${okN}/${bots.length} logged in after ${loginPhase.allDoneSec}s`);
    if (LOGIN_ONLY) {
      const report = summarize([], bots);
      await Promise.all(bots.map((b) => b.teardown()));
      mkdirSync(OUT_DIR, { recursive: true });
      const file = `${OUT_DIR}/login-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      writeFileSync(file, JSON.stringify({ ...report, errors }, null, 2));
      console.log(JSON.stringify({ loginPhase, latencyMs: Object.fromEntries(Object.entries(report.latencyMs).filter(([k]) => k.startsWith('auth') || k.startsWith('db.profiles'))), errorsByWhere: report.errorsByWhere, sampleErrors: report.sampleErrors }, null, 2));
      console.log(`[smoke] full report → ${file}`);
      process.exit(0);
    }
  }

  // 实时进度 + 卡死检测
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const t of tables) {
      if (!t.finished && t.result.startedAt && now - t.lastProgress > STALL_MS) {
        const v = t.bots[0].raw;
        t.finish('stalled', v ? `phase=${v.phase} cur=${v.currentPlayerIndex} round=${v.currentRound} claims=${v.claimResponses.length}` : 'no raw state');
      }
    }
    const fin = tables.filter((t) => t.finished).length;
    const playing = tables.filter((t) => t.result.startedAt && !t.finished).length;
    const errN = errors.length;
    console.log(
      `[${Math.round((now - T0) / 1000)}s] tables finished ${fin}/${tables.length} playing ${playing} | actions ${counters['bot:dispatch'] ?? 0} | rt send ${counters['rt.send'] ?? 0} recv ${counters['rt.recv'] ?? 0} | errors ${errN}`
    );
  }, 10_000);

  // 按速率放桌
  for (const t of tables) {
    void runTable(t);
    await sleep(1000 / TABLE_RATE);
  }
  await Promise.race([Promise.all(tables.map((t) => t.done)), sleep(TIMEOUT_MS)]);
  clearInterval(ticker);
  for (const t of tables) if (!t.finished) t.finish('timeout');
  await sleep(3000); // 等最后的存档 / 状态更新落地
  const report = summarize(tables, bots);
  await Promise.all(bots.map((b) => b.teardown()));

  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${OUT_DIR}/report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify({ ...report, errors }, null, 2));
  const { tables: _omit, ...brief } = report;
  console.log(JSON.stringify(brief, null, 2));
  console.log(`[smoke] full report → ${file}`);
  process.exit(0);
}

if (MODE === 'run') run().catch((e) => {
  console.error(e);
  process.exit(1);
});
