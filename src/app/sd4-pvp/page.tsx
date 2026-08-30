'use client';

// SD4 聯機大廳（src/app/hexaco-pvp/page.tsx 的四維物理隔離副本）。差異：
//   分數源 = SD4 測評（useSd4Store）；建房 settings.deck 固定 'sd4'；
//   不提供大五那套「手動填分」（沿 HEXACO 先例，先只給去測評入口；
//   未測評照樣可玩——引擎用隨機四維分兜底，同大五規則）。
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSd4PlayerStore } from '@/stores/useSd4PlayerStore';
import { useSd4Store } from '@/stores/useSd4Store';
import { useHydrated } from '@/stores/useHydration';
import { useSd4PvpStore } from '@/stores/useSd4PvpStore';
import { upsertPlayer, createRoom, joinRoom, leaveRoom, leaveAllRooms, getPlayerActiveRoom, STALE_ROOM_MS } from '@/lib/sd4-game/room-api';
import { retryPendingSaves } from '@/lib/sd4-game/game-record';
import { retryPendingSd4Saves } from '@/lib/sd4-record';
import { AUTH_T } from '@/lib/i18n/auth';
import { signOutUser } from '@/lib/auth';
import { normalizeStudentId } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { PlayerInfo } from '@/types/sd4-pvp';
import { RevealDifficulty } from '@/types/sd4-game';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { DEFAULT_AVATAR } from '@/data/avatars';
import { AvatarPicker } from '@/components/pvp/AvatarPicker';
import { useProfileAvatar } from '@/stores/useProfileAvatar';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { renderCjk } from '@/lib/renderCjk';
import { useAuthSession } from '@/lib/useAuthSession';

type Tab = 'create' | 'join';

export default function PvpLobbyPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].pvpLobby;
  const { player, setPlayer } = useSd4PlayerStore();
  const sd4Scores = useSd4Store((st) => st.scores);
  // 身份改由登录态提供：学号来自 session（profiles），不再手输。
  const { loading: authLoading, userId, studentId: sessionStudentId } = useAuthSession();

  const [tab, setTab] = useState<Tab>('create');

  // 需登录：登录态就绪后仍未登录 → 跳到登录页。
  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login');
  }, [authLoading, userId, router]);

  // 头像走共享 store（与 /account 互通：改一处各页立即同步）
  const { avatar: sharedAvatar, load: loadAvatar, setAvatar: saveSharedAvatar } = useProfileAvatar();
  useEffect(() => {
    if (userId) void loadAvatar(userId);
  }, [userId, loadAvatar]);
  const avatar = sharedAvatar ?? DEFAULT_AVATAR;
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(10);
  const [difficulty, setDifficulty] = useState<RevealDifficulty>('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeRoom, setActiveRoom] = useState<{ code: string; status: string; roomId: string } | null>(null);

  // 補傳上局未成功保存的對局數據（host 崩潰 / 網絡斷 / Supabase 超時遺留）
  useEffect(() => {
    void retryPendingSaves();
  }, []);

  // 補傳上次沒寫進去的 SD4 測評行（落在 localStorage 的緩衝；需登錄態）
  useEffect(() => {
    if (!authLoading && userId) void retryPendingSd4Saves();
  }, [authLoading, userId]);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('room_players')
        .select('room_id, rooms!inner(id, code, status, created_at)')
        .eq('player_id', player.id);
      if (cancelled || error) return;
      const rows = (data ?? []) as unknown as Array<{
        rooms: { id: string; code: string; status: string; created_at: string } | { id: string; code: string; status: string; created_at: string }[] | null;
      }>;
      const pickRoom = (r: typeof rows[number]) => (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms);
      const cutoff = Date.now() - STALE_ROOM_MS;
      // 只認 6 小時內創建的 waiting/playing 房爲活躍；更老的當殭屍房。
      const active = rows
        .map(pickRoom)
        .find((room) => room && (room.status === 'waiting' || room.status === 'playing')
          && new Date(room.created_at).getTime() >= cutoff);
      if (!active) {
        // 沒有活躍房：若名下還掛着（過期的）room_players 記錄，自動清掉，
        // 免得「已在房間內」幽靈提示一直跟着這個學號。
        if (rows.length > 0) {
          try { await leaveAllRooms(player.id); } catch {}
        }
        useSd4PvpStore.getState().reset();
        return;
      }
      if (active.status === 'waiting') {
        router.replace(`/sd4-pvp/room/${active.code}`);
        return;
      }
      setActiveRoom({ code: active.code, status: active.status, roomId: active.id });
    })();
    return () => {
      cancelled = true;
    };
  }, [player, router]);

  function resumeActiveRoom() {
    if (!activeRoom) return;
    router.replace(activeRoom.status === 'playing' ? `/sd4-pvp/game/${activeRoom.code}` : `/sd4-pvp/room/${activeRoom.code}`);
  }

  async function leaveActiveRoom() {
    if (!activeRoom || !player) return;
    try {
      await leaveRoom(activeRoom.roomId, player.id);
    } catch {
      // ignore; still clear local state so the user isn't trapped
    }
    useSd4PvpStore.getState().reset();
    setActiveRoom(null);
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  // 登录了但 profiles 行缺失（孤儿账号/后台删行）→ sessionStudentId 恒为 null，
  // 不能无限 loading，给「重新登入」出口。
  if (!authLoading && userId && !sessionStudentId) {
    const ta = AUTH_T[locale];
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="psy-panel psy-etched w-full max-w-md space-y-4 rounded-[1.7rem] p-8 text-center">
          <p className="text-sm leading-6 text-[var(--psy-danger)]">{ta.profileMissing}</p>
          <button
            onClick={async () => { await signOutUser(); router.replace('/login'); }}
            className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold"
          >
            {ta.reloginBtn}
          </button>
        </div>
      </div>
    );
  }

  // 需登录：加载中 / 未登录（正跳转 /login）→ 居中加载态。
  if (authLoading || !userId || !sessionStudentId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  // 学号固定来自登录态（session/profiles），不再手输。
  const effectiveStudentId = normalizeStudentId(sessionStudentId || '');

  async function ensurePlayer() {
    const sid = effectiveStudentId;
    // ② 身份变了（换/重输学号）→ 先解绑旧身份名下的所有房间，避免旧座位变僵尸把人卡在
    //    「房主似乎不在线」死局屏。必须在创建/加入新房之前清掉。
    const prevId = useSd4PlayerStore.getState().player?.id;
    if (prevId && prevId !== sid) {
      try { await leaveAllRooms(prevId); } catch {}
      useSd4PvpStore.getState().reset();
    }
    const info: PlayerInfo = { id: sid, studentId: sid, sd4: sd4Scores, avatar };
    await upsertPlayer(info);
    setPlayer(info);
    return info;
  }

  // Detect student-ID collision: if the ID is already seated in some
  // other active room (waiting/playing), refuse the operation. The
  // local persisted `player` object lets us distinguish "this same
  // device is resuming" (allowed — drop their old seat) from "someone
  // else is using the same ID elsewhere" (refuse).
  async function collisionCheck(id: string): Promise<string | null> {
    const active = await getPlayerActiveRoom(id);
    if (!active) return null;
    // If the locally-persisted player matches and the active room is
    // the one we already know about → it's the same device, allowed.
    const localId = player?.id;
    if (localId === id && activeRoom?.code === active.code) return null;
    return `${t.alreadyInRoomA}${id}${t.alreadyInRoomB}${active.code}${t.alreadyInRoomC}${active.status === 'playing' ? t.playingWord : t.waitingWord}${t.alreadyInRoomD}`;
  }

  async function handleCreate() {
    if (!effectiveStudentId) { setError(t.enterStudentId); return; }
    setLoading(true);
    setError('');
    try {
      const sid = effectiveStudentId;
      const conflict = await collisionCheck(sid);
      if (conflict) { setError(conflict); setLoading(false); return; }
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      useSd4PvpStore.getState().reset();
      const room = await createRoom(info.id, { maxPlayers, totalRounds, deck: 'sd4', difficulty }, info.avatar);
      router.push(`/sd4-pvp/room/${room.code}`);
    } catch (e: any) {
      setError(e.message ?? t.createFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!effectiveStudentId) { setError(t.enterStudentId); return; }
    if (joinCode.length !== 4) { setError(t.enter4Code); return; }
    setLoading(true);
    setError('');
    try {
      const sid = effectiveStudentId;
      const conflict = await collisionCheck(sid);
      if (conflict) { setError(conflict); setLoading(false); return; }
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      useSd4PvpStore.getState().reset();
      await joinRoom(joinCode, info.id, info.avatar);
      router.push(`/sd4-pvp/room/${joinCode}`);
    } catch (e: any) {
      setError(e.message ?? t.joinFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            {t.backHome}
          </button>
          <h1 className="psy-serif whitespace-nowrap text-[1.55rem] leading-tight text-[var(--psy-ink)] sm:whitespace-normal sm:text-6xl sm:leading-none">
            {t.title}
            <span className="ml-2 align-baseline text-base font-semibold text-[var(--psy-accent)] sm:ml-3 sm:text-3xl">· Dark Tetrad</span>
          </h1>
          <p className="text-base leading-7 text-[var(--psy-ink-soft)]">
            {t.intro}
          </p>
        </div>

        {activeRoom && (
          <div
            className="rounded-[1.4rem] border p-5 space-y-3"
            style={{ borderColor: 'var(--psy-border-strong)', background: 'var(--psy-accent-soft)' }}
          >
            <div className="flex items-center gap-2 text-sm text-[var(--psy-ink)]">
              <span className="psy-eyebrow text-[10px] text-[var(--psy-accent)]">RESUME</span>
              <span>
                {t.stillInRoomPrefix}
                <span className="psy-serif font-medium text-[var(--psy-accent)]">{activeRoom.code}</span>{t.stillInRoomMid}
                {activeRoom.status === 'playing' ? t.roomPlaying : t.roomWaiting}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={resumeActiveRoom} className="psy-btn psy-btn-accent flex-1 px-4 py-2 text-sm font-medium">
                {t.returnRoom}
              </button>
              <button onClick={leaveActiveRoom} className="psy-btn psy-btn-ghost flex-1 px-4 py-2 text-sm">
                {t.leaveRoom}
              </button>
            </div>
          </div>
        )}

        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          {/* 学号来自登录态：纯文本展示，不可输入 */}
          <p className="text-sm text-[var(--psy-ink-soft)]">
            {t.studentLabel}：<span className="psy-serif tracking-[0.06em] text-[var(--psy-ink)]">{effectiveStudentId}</span>
          </p>
          <AvatarPicker value={avatar} onChange={(next) => { if (userId) void saveSharedAvatar(userId, next); }} />

          {sd4Scores ? (
            <div className="psy-chip">
              <span className="text-[var(--psy-success)]">✓</span>
              <span>{t.assessDone}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="psy-chip" style={{ borderColor: 'rgba(220,106,79,0.32)', background: 'var(--psy-danger-soft)', color: 'var(--psy-ink)' }}>
                {t.assessUndone}
              </div>
              {/* SD4 不做大五那套手動填分（沿 HEXACO 先例），只給去測評入口。
                  未測評也能開/進房——引擎用隨機四維分兜底（同大五規則）。 */}
              <button onClick={() => router.push('/sd4/assess')} className="psy-btn psy-btn-accent px-3 py-2 text-xs">
                {t.fullAssessPrefix}{SD4_QUESTIONS.length}{t.fullAssessSuffix}
              </button>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-1">
          {(['create', 'join'] as Tab[]).map((tabId) => {
            const active = tab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className={`psy-serif rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? 'bg-[linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))] text-[#fff9f0] shadow-[0_10px_24px_rgba(72,49,18,0.24)]'
                    : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
                }`}
              >
                {tabId === 'create' ? t.tabCreate : t.tabJoin}
              </button>
            );
          })}
        </div>

        {tab === 'create' ? (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            {/* 人格模型选择已前置到进游戏前的弹窗(DeckSelectModal),此处不再重复选择 */}

            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.maxPlayers}</p>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`psy-tile psy-serif text-sm ${maxPlayers === n ? 'is-active' : ''}`}
                  >
                    {n}{t.playerUnit}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.rounds}</p>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 0].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`psy-tile psy-serif text-sm ${totalRounds === n ? 'is-active' : ''}`}
                  >
                    {n === 0 ? '∞' : n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.revealLabel}</p>
              {/* 移动端单列(整行,标签不再被挤到两行);sm+ 三列 */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { id: 'open', name: t.revealOpenName, sub: t.revealOpenSub },
                  { id: 'half', name: t.revealHalfName, sub: t.revealHalfSub },
                  { id: 'hidden', name: t.revealHiddenName, sub: t.revealHiddenSub },
                ] as const).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`psy-tile flex flex-col items-start gap-0.5 px-3 py-2.5 text-left ${difficulty === d.id ? 'is-active' : ''}`}
                  >
                    <span className="psy-serif text-sm text-[var(--psy-ink)]">{d.name}</span>
                    <span className="text-[10px] leading-4 text-[var(--psy-muted)]">{renderCjk(d.sub, locale)}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="psy-btn psy-btn-accent psy-serif w-full py-3 text-base font-semibold"
            >
              {loading ? t.creating : t.tabCreate}
            </button>
          </section>
        ) : (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.code4}</p>
              <input
                className="psy-input psy-serif text-center text-3xl font-medium tabular-nums tracking-[0.4em]"
                placeholder="0000"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="psy-btn psy-btn-accent psy-serif w-full py-3 text-base font-semibold"
            >
              {loading ? t.joining : t.tabJoin}
            </button>
          </section>
        )}

        {error && <p className="text-center text-sm text-[var(--psy-danger)]">{error}</p>}
      </motion.div>
    </div>
  );
}
