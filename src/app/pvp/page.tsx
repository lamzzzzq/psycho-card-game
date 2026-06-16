'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { usePvpStore } from '@/stores/usePvpStore';
import { upsertPlayer, createRoom, joinRoom, leaveRoom, leaveAllRooms, getPlayerActiveRoom, STALE_ROOM_MS } from '@/lib/room-api';
import { retryPendingSaves } from '@/lib/game-record';
import { supabase } from '@/lib/supabase';
import { PlayerInfo, DeckId } from '@/types/pvp';
import { BigFiveScores, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { QUESTIONS } from '@/data/questions';
import { DEFAULT_AVATAR } from '@/data/avatars';
import { AvatarPicker } from '@/components/pvp/AvatarPicker';
import { useLocaleStore, STRINGS } from '@/lib/i18n';

// name 为 null 时用 t[nameKey]；subtitle 走 t[subKey]（locale 翻译）。
const DECK_OPTIONS: { id: DeckId; name: string | null; nameKey?: 'deckCpaiName'; subKey: 'deckBigFiveSub' | 'deckHexacoSub' | 'deckCpaiSub'; locked: boolean }[] = [
  { id: 'big-five', name: 'Big Five', subKey: 'deckBigFiveSub', locked: false },
  { id: 'hexaco', name: 'HEXACO', subKey: 'deckHexacoSub', locked: true },
  { id: 'cpai', name: null, nameKey: 'deckCpaiName', subKey: 'deckCpaiSub', locked: true },
];

type Tab = 'create' | 'join';

export default function PvpLobbyPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].pvpLobby;
  const { player, setPlayer } = usePlayerStore();
  const { bigFiveScores, setManualScores } = useAssessmentStore();

  const [tab, setTab] = useState<Tab>('create');
  const [studentId, setStudentId] = useState(player?.studentId ?? '');
  const [studentIdConfirm, setStudentIdConfirm] = useState('');
  const [avatar, setAvatar] = useState(player?.avatar ?? DEFAULT_AVATAR);
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [totalRounds, setTotalRounds] = useState(5);
  const [deck, setDeck] = useState<DeckId>('big-five');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScoresInput, setManualScoresInput] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });
  const [activeRoom, setActiveRoom] = useState<{ code: string; status: string; roomId: string } | null>(null);

  // 補傳上局未成功保存的對局數據（host 崩潰 / 網絡斷 / Supabase 超時遺留）
  useEffect(() => {
    void retryPendingSaves();
  }, []);

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
        usePvpStore.getState().reset();
        return;
      }
      if (active.status === 'waiting') {
        router.replace(`/pvp/room/${active.code}`);
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
    router.replace(activeRoom.status === 'playing' ? `/pvp/game/${activeRoom.code}` : `/pvp/room/${activeRoom.code}`);
  }

  async function leaveActiveRoom() {
    if (!activeRoom || !player) return;
    try {
      await leaveRoom(activeRoom.roomId, player.id);
    } catch {
      // ignore; still clear local state so the user isn't trapped
    }
    usePvpStore.getState().reset();
    setActiveRoom(null);
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  async function ensurePlayer() {
    const sid = studentId.trim();
    const info: PlayerInfo = { id: sid, studentId: sid, bigFive: bigFiveScores, avatar };
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
    if (!studentId.trim()) { setError(t.enterStudentId); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError(t.idMismatch); return; }
    setLoading(true);
    setError('');
    try {
      const sid = studentId.trim();
      const conflict = await collisionCheck(sid);
      if (conflict) { setError(conflict); setLoading(false); return; }
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      usePvpStore.getState().reset();
      const room = await createRoom(info.id, { maxPlayers, totalRounds, deck }, info.avatar);
      router.push(`/pvp/room/${room.code}`);
    } catch (e: any) {
      setError(e.message ?? t.createFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!studentId.trim()) { setError(t.enterStudentId); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError(t.idMismatch); return; }
    if (joinCode.length !== 4) { setError(t.enter4Code); return; }
    setLoading(true);
    setError('');
    try {
      const sid = studentId.trim();
      const conflict = await collisionCheck(sid);
      if (conflict) { setError(conflict); setLoading(false); return; }
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      usePvpStore.getState().reset();
      await joinRoom(joinCode, info.id, info.avatar);
      router.push(`/pvp/room/${joinCode}`);
    } catch (e: any) {
      setError(e.message ?? t.joinFailed);
    } finally {
      setLoading(false);
    }
  }

  const idMismatch = studentIdConfirm.length > 0 && studentIdConfirm !== studentId;

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
          <p className="psy-eyebrow">DUEL CHAMBER</p>
          <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">{t.title}</h1>
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
          <p className="psy-eyebrow text-[10px]">{t.playerInfo}</p>
          <div className="space-y-3">
            <input
              className="psy-input"
              placeholder={t.studentIdPlaceholder}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={20}
            />
            <input
              className={`psy-input ${idMismatch ? 'is-error' : ''}`}
              placeholder={t.studentIdConfirmPlaceholder}
              value={studentIdConfirm}
              onChange={(e) => setStudentIdConfirm(e.target.value)}
              maxLength={20}
            />
            {idMismatch && (
              <p className="text-xs text-[var(--psy-danger)]">{t.idMismatch}</p>
            )}
          </div>

          <AvatarPicker value={avatar} onChange={setAvatar} />

          {bigFiveScores ? (
            <div className="psy-chip">
              <span className="text-[var(--psy-success)]">✓</span>
              <span>{t.assessDone}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="psy-chip" style={{ borderColor: 'rgba(220,106,79,0.32)', background: 'var(--psy-danger-soft)', color: 'var(--psy-ink)' }}>
                {t.assessUndone}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push('/assessment')} className="psy-btn psy-btn-accent px-3 py-2 text-xs">
                  {t.fullAssessPrefix}{QUESTIONS.length}{t.fullAssessSuffix}
                </button>
                <button onClick={() => setShowManualInput(!showManualInput)} className="psy-btn psy-btn-ghost px-3 py-2 text-xs">
                  {t.manualInput}
                </button>
              </div>
              {showManualInput && (
                <div className="space-y-3 rounded-[1.2rem] border border-[rgba(200,155,93,0.16)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="psy-eyebrow text-[10px]">{t.bigFiveRange}</p>
                  <div className="space-y-2">
                    {DIMENSIONS.map((d) => {
                      const meta = DIMENSION_META[d];
                      return (
                        <div key={d} className="flex items-center gap-3">
                          <span className="psy-serif w-20 shrink-0 truncate text-xs" style={{ color: meta.colorHex }}>{locale === 'en' ? meta.nameEn : meta.name}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            lang="en"
                            value={rawInputs[d]}
                            onChange={(e) => {
                              // 只留数字 + 一个小数点（type=number 会吞掉「3.」中间态导致无法输入小数）
                              const raw = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setRawInputs((prev) => ({ ...prev, [d]: raw }));
                              const val = parseFloat(raw);
                              if (!isNaN(val)) setManualScoresInput((prev) => ({ ...prev, [d]: val }));
                            }}
                            onBlur={() => {
                              const val = parseFloat(rawInputs[d]);
                              const clamped = isNaN(val) ? 3 : Math.min(5, Math.max(1, val));
                              setManualScoresInput((prev) => ({ ...prev, [d]: clamped }));
                              setRawInputs((prev) => ({ ...prev, [d]: String(clamped) }));
                            }}
                            className="psy-input w-16 px-2 py-1 text-center text-xs tabular-nums"
                          />
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${((manualScoresInput[d] - 1) / 4) * 100}%`, backgroundColor: meta.colorHex }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setManualScores(manualScoresInput);
                      setShowManualInput(false);
                    }}
                    className="psy-btn psy-btn-accent w-full py-2 text-xs font-medium"
                  >
                    {t.confirmScores}
                  </button>
                </div>
              )}
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
                    ? 'bg-[linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))] text-[var(--psy-ink)] shadow-[0_10px_24px_rgba(72,49,18,0.24)]'
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
            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.deckHeader}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {DECK_OPTIONS.map((opt) => {
                  const active = deck === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !opt.locked && setDeck(opt.id)}
                      disabled={opt.locked}
                      className={`psy-tile flex flex-col items-start gap-1 px-3 py-3 text-left transition ${active ? 'is-active' : ''} ${opt.locked ? 'opacity-55 cursor-not-allowed' : ''}`}
                      title={opt.locked ? t.comingSoon : ''}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="psy-serif text-sm text-[var(--psy-ink)]">{opt.name ?? t[opt.nameKey!]}</span>
                        {opt.locked && (
                          <span className="text-[9px] text-[var(--psy-muted)]">🔒 {t.comingSoon}</span>
                        )}
                      </div>
                      <span className="text-[10px] leading-snug text-[var(--psy-muted)]">{t[opt.subKey]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">{t.maxPlayers}</p>
              <div className="grid grid-cols-2 gap-2">
                {[3, 4].map((n) => (
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
                {[0, 3, 5, 10].map((n) => (
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
