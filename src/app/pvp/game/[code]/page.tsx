'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePvpStore } from '@/stores/usePvpStore';
import { SerializedPlayer, PvpAction } from '@/types/pvp';
import { GameCard, GameAction, Player, PlayerId, DeclaredSet, Dimension, DIMENSIONS, isPersonalityCard } from '@/types';
import {
  useGameFeedback,
  FeedbackOverlays,
  useYourTurnNotifier,
  YourTurnBanner,
  TurnNoticeToast,
  turnNudge,
} from '@/components/game/FeedbackLayer';
import { FlyingCard } from '@/components/game/FlyingCard';
import { supabase } from '@/lib/supabase';
import { leaveRoom, leaveAllRooms, updateRoomStatus } from '@/lib/room-api';
import { retryPendingSaves, removePendingInterrupted } from '@/lib/game-record';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { useWakeLock } from '@/stores/useWakeLock';

interface FlyingAnim { id: number; from: { x: number; y: number }; to: { x: number; y: number }; text: string; }
import { DIMENSION_META } from '@/data/dimensions';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';
import { PlayerHand } from '@/components/game/PlayerHand';
import { OpponentHand } from '@/components/game/OpponentHand';
import { DrawPile } from '@/components/game/DrawPile';
import { DiscardPile } from '@/components/game/DiscardPile';
import { GameLog } from '@/components/game/GameLog';
import { DeclaredArea } from '@/components/game/DeclaredArea';
import { GameOverModal } from '@/components/game-results/GameOverModal';
import { TarotCard } from '@/components/game/TarotCard';
import { MobileGameSheet } from '@/components/game/MobileGameSheet';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

// Convert SerializedPlayer → Player (for reusing single-player components)
function toPlayer(sp: SerializedPlayer, overrideHand?: GameCard[]): Player {
  const hand: GameCard[] = overrideHand
    ?? (sp.revealedHand && sp.revealedCards
      ? sp.revealedCards
      : Array.from({ length: sp.handCount }, (_, i) => ({
          id: -(sp.id.charCodeAt(0) * 1000 + i + 1),
          text: '',
          isDummy: true as const,
        })));
  return {
    id: sp.id as PlayerId,
    name: sp.name,
    avatar: sp.avatar,
    hand,
    isHuman: true,
    bigFiveScores: sp.bigFiveScores,
    declaredSets: sp.declaredSets as DeclaredSet[],
    skipNextTurn: sp.skipNextTurn,
    revealedHand: sp.revealedHand,
    revealedSelectedCards: sp.revealedSelectedCards,
    frozenUntilDiscarderIndex: sp.frozenUntilDiscarderIndex,
    frozenUntilOwnDiscard: sp.frozenUntilOwnDiscard,
    hasLeft: sp.hasLeft,
    selfPongUsedThisTurn: sp.selfPongUsedThisTurn,
  };
}

export default function PvpGamePage() {
  useWakeLock(); // 屏幕常亮：牌桌上别自动锁屏掉线(房主掉线全员暂停)
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].game;
  const dimName = (d: Dimension) => (locale === 'en' ? DIMENSION_META[d].nameEn : DIMENSION_META[d].name);

  const { player } = usePlayerStore();
  const { gameState, myPlayerId, isHost, sendMessage, subscribeRoom, offlinePlayerIds, room } = usePvpStore();
  const hostOffline = !isHost && !!room?.host_id && offlinePlayerIds.includes(room.host_id);

  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [resultBanner, setResultBanner] = useState<{ success: boolean; message: string } | null>(null);
  const [mobileSheet, setMobileSheet] = useState<'log' | 'declared' | 'persona' | null>(null);
  // "View 2 cards" feature: 1 use per own turn. State resets when the
  // active player or round changes.
  const [viewMode, setViewMode] = useState(false);
  const [pickedViewIds, setPickedViewIds] = useState<number[]>([]);
  const [viewedCardIds, setViewedCardIds] = useState<number[]>([]);
  const [viewUsedThisTurn, setViewUsedThisTurn] = useState(false);
  // Arrow state — 存「取点函数」，ArrowOverlay 每帧重算 → 移动端滚动时跟随卡牌。
  type Pt = { x: number; y: number };
  const [arrowFrom, setArrowFrom] = useState<(() => Pt | null) | null>(null);
  const [arrowTo, setArrowTo] = useState<(() => Pt | null) | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [pongIntent, setPongIntent] = useState<{
    type: 'self' | 'other';
    dimension: Dimension;
  } | null>(null);
  const [idleReminderVisible, setIdleReminderVisible] = useState(false);
  // 搶牌窗口提交鎖 + 「本輪已被搶」提示
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [stolenToast, setStolenToast] = useState(false);
  const pongAttemptRef = useRef(false);   // 我本輪是否點過「碰」
  const prevPhaseRef = useRef<string | null>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Re-subscribe if store lost channel (e.g. hard refresh)
  useEffect(() => {
    if (!player) { router.replace('/pvp'); return; }
    const { channel } = usePvpStore.getState();
    if (!channel) subscribeRoom(code, player.id);
  }, [code, player]);

  // Host 硬崩潰保護：頁面卸載 / 切後台的瞬間，把中斷快照同步寫進
  // localStorage 重傳緩衝（此時 async 網絡存檔活不到返回）。頁面若其實
  // 沒死（bfcache 回來 / 切回前台），host 重訂閱或回前台時會撤掉快照，
  // 不會誤傳；真崩了則下次啓動由 retryPendingSaves 補傳成中斷局。
  useEffect(() => {
    const buffer = () => {
      try { usePvpStore.getState().bufferInterruptedSnapshot(); } catch {}
    };
    window.addEventListener('pagehide', buffer);
    window.addEventListener('beforeunload', buffer);
    return () => {
      window.removeEventListener('pagehide', buffer);
      window.removeEventListener('beforeunload', buffer);
    };
  }, []);

  // 切後台/回前台的斷線兜底。手機瀏覽器（微信 webview 尤甚）掛起頁面時
  // 常把 socket 掐死；回前台後 Supabase 的自動重連不保證還在跑。
  useEffect(() => {
    const onVis = () => {
      const st = usePvpStore.getState();
      if (document.visibilityState === 'hidden') {
        // 切後台 = 隨時可能被系統殺掉且不觸發 pagehide（iOS 常態）→ 先落快照保險。
        try { st.bufferInterruptedSnapshot(); } catch {}
        return;
      }
      if (document.visibilityState !== 'visible' || !player || !st.room) return;
      const ch = st.channel;
      if (!ch || (ch.state !== 'joined' && ch.state !== 'joining')) {
        // socket 已死且自動重連放棄了 → 整個重訂閱（成功路徑裏會重新
        // track presence、host 重廣播狀態 / 非 host 補發 state-request）。
        st.subscribeRoom(code, player.id);
        return;
      }
      if (st.isHost) {
        // channel 還活着，切後台時落的保險快照作廢。
        const raw = st.rawGameState;
        if (raw && raw.phase !== 'game-over') {
          const startedAt: number | undefined =
            raw.gameStartedAt ?? raw.actionLog?.[0]?.timestamp;
          if (startedAt != null) removePendingInterrupted(startedAt);
        }
      } else if (st.myPlayerId) {
        // 非 host 補發一次 state-request，追平掛起期間可能漏掉的廣播。
        st.sendMessage({ type: 'state-request', fromPlayerId: st.myPlayerId });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [code, player]);

  // 崩潰遺留數據補傳。retryPendingSaves 內部會先撤「活局」的中斷快照
  // （直接讀持久化 localStorage 判斷，不依賴 store rehydrate 時序）再補傳，
  // host 帶着可復活的局回來不會被誤傳成中斷局。
  useEffect(() => {
    void retryPendingSaves();
  }, []);

  // On mount, verify against the DB that this room is actually still in
  // play. If the room is missing, ended, or just in "waiting" state, the
  // persisted game state is a zombie — reset + bounce back to the lobby.
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('status')
        .eq('code', code)
        .maybeSingle();
      if (cancelled) return;
      // 查失败 ≠ 僵尸房：网络抖动就 reset 会把 host 的 rawGameState 清掉、全桌不可恢复。
      if (error) return;
      if (!data || data.status !== 'playing') {
        // 开局竞态：host 的 updateRoomStatus('playing') 不 await，非 host 靠 game-start
        // 广播秒级跳转，可能先于 DB 提交读到 'waiting' —— 延迟重查一次再判死刑。
        if (data?.status === 'waiting') {
          await new Promise((r) => setTimeout(r, 1500));
          if (cancelled) return;
          const { data: again, error: err2 } = await supabase
            .from('rooms')
            .select('status')
            .eq('code', code)
            .maybeSingle();
          if (cancelled || err2) return;
          if (again?.status === 'playing') return;
        }
        usePvpStore.getState().reset();
        router.replace('/pvp');
      }
    })();
    return () => { cancelled = true; };
  }, [code, player, router]);

  // Progressive loading message: after 4s without gameState, assume the
  // host is offline and show a more actionable UI (leave the room
  // instead of just "return to lobby" which would loop back via banner).
  useEffect(() => {
    if (gameState) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 4000);
    return () => clearTimeout(t);
  }, [gameState]);

  async function handleAbandonRoom() {
    const { isHost, gameState: gs, room, sendMessage: send } = usePvpStore.getState();
    // Host quitting mid-game: current architecture has no host migration
    // (rawGameState lives only on host). Broadcast 'room-dissolved' so all
    // clients exit cleanly instead of staring at a frozen table forever.
    const gameInProgress = gs && gs.phase !== 'game-over';
    if (isHost) {
      // host 退出一律解散（無論局是否已結束）：架構無 host 遷移；且終局路徑會把
      // 房間置回 'waiting' 供「再來一局」—— host 走人後留着，對手點「再來一局」
      // 會進 host_id 指向已離場者的房，永遠「等待房主開始」。
      if (gameInProgress) {
        // 中途退出：先把當前對局存成「中斷局」(winner=null)，再解散。
        // 只有 host 有 rawGameState，所以這是唯一能保住中斷數據的時機。
        try { usePvpStore.getState().persistInterruptedGame(); } catch {}
      }
      try { send({ type: 'room-dissolved' }); } catch {}
      const rId = room?.id;
      if (rId) {
        try { await updateRoomStatus(rId, 'ended'); } catch {}
      }
    }
    const roomId = room?.id;
    if (roomId && player) {
      try { await leaveRoom(roomId, player.id); } catch {}
    } else if (player) {
      // Room object might not be hydrated yet; look it up by code.
      const { data } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle();
      if (data?.id) { try { await leaveRoom(data.id, player.id); } catch {} }
    }
    usePvpStore.getState().reset();
    router.replace('/');
  }

  // Clear card selection on phase change
  useEffect(() => {
    if (gameState?.phase !== 'claim-window') setSelectedCardIds([]);
  }, [gameState?.phase]);

  // 搶牌窗口的提交鎖 + 「本輪已被搶」提示。
  // - 離開 claim-window：解鎖，準備下一個窗口。
  // - claim-window → discarding（有人碰成功、輪到他出牌）且贏家不是我、而我點過「碰」
  //   → 閃一句「本輪已被搶」，讓落敗者明白不是按鍵失靈。
  useEffect(() => {
    const phase = gameState?.phase;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase ?? null;
    if (phase !== 'claim-window') {
      setClaimSubmitted(false);
      if (
        prev === 'claim-window' &&
        phase === 'discarding' &&
        pongAttemptRef.current &&
        gameState?.players[gameState.currentPlayerIndex]?.id !== myPlayerId
      ) {
        setStolenToast(true);
        const t = setTimeout(() => setStolenToast(false), 2200);
        pongAttemptRef.current = false;
        return () => clearTimeout(t);
      }
      pongAttemptRef.current = false;
    }
  }, [gameState?.phase, gameState?.currentPlayerIndex, myPlayerId]);

  // Reset "view cards" state whenever the active turn changes (own or other).
  // 半公開(half)難度：看過的牌永久顯示（不清 viewedCardIds）；隱藏/明牌每回合清空。
  useEffect(() => {
    setViewMode(false);
    setPickedViewIds([]);
    setViewUsedThisTurn(false);
    if ((gameState?.revealDifficulty ?? 'hidden') !== 'half') setViewedCardIds([]);
  }, [gameState?.currentPlayerIndex, gameState?.currentRound, gameState?.revealDifficulty]);

  // Reset pong-intent on phase / turn changes — keeps the modal honest.
  useEffect(() => {
    setPongIntent(null);
    setSelectedCardIds([]);
  }, [gameState?.currentPlayerIndex, gameState?.phase]);


  const { shakeControls, flashControls, pops } = useGameFeedback(
    (gameState?.actionLog ?? []) as GameAction[],
    gameState?.players ?? [],
    locale
  );

  // Your-turn banner: fires when the turn becomes the viewer's turn.
  const myIsCurrent =
    !!gameState &&
    gameState.players[gameState.currentPlayerIndex]?.id === (myPlayerId ?? player?.id) &&
    (gameState.phase === 'drawing' || gameState.phase === 'discarding');
  const yourTurnKey = useYourTurnNotifier(gameState?.currentPlayerIndex, myIsCurrent);

  // Recurring 60-second idle reminder. Deps narrowed to ONLY myIsCurrent —
  // any other dep (phase / actionLog / gameState) gets bumped by realtime
  // state pushes and would prematurely reset the 30s clock. The interval
  // tears down naturally when myIsCurrent flips false (turn ends).
  useEffect(() => {
    if (!myIsCurrent) {
      setIdleReminderVisible(false);
      return;
    }
    let hideTimer: number | null = null;
    const interval = window.setInterval(() => {
      setIdleReminderVisible(true);
      turnNudge(shakeControls); // 屏幕震动 + 设备震动，提醒该你了
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setIdleReminderVisible(false), 3000);
    }, 60_000);
    return () => {
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
      setIdleReminderVisible(false);
    };
    // shakeControls 是 useAnimationControls 的稳定引用，不会重置 30s 时钟。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myIsCurrent]);

  const showBanner = useCallback((success: boolean, message: string) => {
    setResultBanner({ success, message });
    setTimeout(() => setResultBanner(null), 3000);
  }, []);

  // ⚠️ 所有 hooks 必須在 early return 之前調用，否則 zustand persist 觸發
  // 的 rehydration race 會讓 hook 數量在前後 render 不一致 → React #310 crash。
  // 之前的 removeFlyingCard / handleDrawPileHover / handleCardHover useCallback
  // 在 line 352/405/418，挪到 early return 前才能避免「房主刷新掛掉」的 bug。

  const removeFlyingCard = useCallback((id: number) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // handleDrawPileHover 依賴 canDraw（在 early return 後才能算）— 用 ref 讀取
  // 避免把 canDraw 寫進 deps 又要在 early return 前定義 canDraw。
  const canDrawRef = useRef(false);
  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current || !handAreaRef.current) return;
    if (hovering && canDrawRef.current) {
      setArrowFrom(() => () => {
        const r = drawPileRef.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      });
      setArrowTo(() => () => {
        const r = handAreaRef.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + Math.min(40, r.height * 0.35) } : null;
      });
    } else {
      setArrowFrom(null);
      setArrowTo(null);
    }
  }, []);

  const handleCardHover = useCallback((el: HTMLElement | null) => {
    if (!el || !discardPileRef.current) { setArrowFrom(null); setArrowTo(null); return; }
    setArrowFrom(() => () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    });
    setArrowTo(() => () => {
      const r = discardPileRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    });
  }, []);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          {slowLoad ? (
            <>
              <div className="text-sm text-[var(--psy-accent-strong)]">{t.hostOfflineNoResume}</div>
              <button
                onClick={handleAbandonRoom}
                className="psy-btn psy-btn-danger px-5 py-2.5 text-sm font-bold"
              >
                {t.leaveRoomReturnLobby}
              </button>
              <div>
                <button
                  onClick={async () => {
                    // 彻底解绑：清掉本人名下所有房间座位，避免回大厅又被「僵尸房」横幅弹回来卡死。
                    if (player) { try { await leaveAllRooms(player.id); } catch {} }
                    usePvpStore.getState().reset();
                    router.replace('/pvp');
                  }}
                  className="text-xs text-[var(--psy-muted)] underline transition-colors hover:text-[var(--psy-ink-soft)]"
                >
                  {t.justReturnLobby}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="psy-serif animate-pulse text-[var(--psy-ink-soft)]">{t.waitingToStart}</div>
              <button
                onClick={() => {
                  usePvpStore.getState().reset();
                  router.replace('/pvp');
                }}
                className="text-xs text-[var(--psy-muted)] underline transition-colors hover:text-[var(--psy-ink-soft)]"
              >
                {t.returnLobby}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const myId = myPlayerId ?? player?.id;
  // 看牌難度：open 明牌 / half 半公開(看4張永久) / hidden 隱藏(看2張一輪)
  const revealDifficulty = gameState.revealDifficulty ?? 'hidden';
  const viewCap = revealDifficulty === 'half' ? 4 : 2;
  const meSerialized = gameState.players.find(p => p.id === myId);
  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const opponents = gameState.players.filter(p => p.id !== myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const isClaimWindow = gameState.phase === 'claim-window' && gameState.pendingDiscard !== null;
  const alreadyResponded = !!myId && (gameState.claimResponses?.includes(myId) ?? false);
  const isDiscarderMe = gameState.discardedByIndex === myIndex;
  const canClaim = isClaimWindow && !isDiscarderMe && !alreadyResponded;
  // First-come-first-served: any non-discarder can pong. The race
  // resolves naturally because pongCard advances the phase out of
  // 'claim-window' before slower clicks land.
  // Penalty freeze 拆兩層：
  //   meFrozen = 任一 flag (skipNextTurn 或 frozenUntilOwnDiscard) → 禁止 pong/hu
  //   meFrozenLockout = 真正"無法操作"的狀態：
  //     - skipNextTurn=true（不該到自己回合，被 skipPenalizedPlayers 跳）
  //     - frozenUntilOwnDiscard=true 且非自己回合（claim window 被鎖）
  //   own-turn frozenUntilOwnDiscard-only：不算 lockout — 必須 draw+discard 解凍。
  const meFrozen =
    meSerialized?.skipNextTurn ||
    !!meSerialized?.frozenUntilOwnDiscard;
  const meFrozenLockout =
    !!meSerialized?.skipNextTurn ||
    (!!meSerialized?.frozenUntilOwnDiscard && !isMyTurn);
  const meAwaitingOwnDischarge =
    !!meSerialized?.frozenUntilOwnDiscard && isMyTurn && !meSerialized?.skipNextTurn;
  const canPong = canClaim && !meFrozen;
  const canHu = (isMyTurn && gameState.phase !== 'claim-window' && !meFrozen)
    || (canClaim && !meFrozen);
  // canDraw/isDiscarding 加 !skipNextTurn 防禦：skipPenalizedPlayers 應已跳過
  // 該玩家，若 race 導致 currentPlayerIndex 停在 skipNextTurn 玩家身上，UI 也不
  // 讓點。frozenUntilOwnDiscard-only 狀態允許 draw/discard（spec 解凍路徑）。
  const canDraw = isMyTurn && gameState.phase === 'drawing' && !meSerialized?.skipNextTurn;
  const isDiscarding = isMyTurn && gameState.phase === 'discarding' && !meSerialized?.skipNextTurn;

  // Convert serialized players to Player objects for components
  const mePlayer = meSerialized ? toPlayer(meSerialized, meSerialized.hand) : null;
  const opponentPlayers = opponents.map(o => toPlayer(o));
  const allPlayers = gameState.players.map(sp =>
    sp.id === myId ? toPlayer(sp, sp.hand) : toPlayer(sp)
  );

  function dispatchAction(action: PvpAction) {
    if (isHost) {
      usePvpStore.getState().handlePlayerAction(myId!, action);
    } else {
      sendMessage({ type: 'action-request', fromPlayerId: myId!, action });
    }
    setSelectedCardIds([]);
  }

  function handleDraw() {
    if (!canDraw) return;
    dispatchAction({ type: 'draw' });
  }

  function handleDiscard(cardId: number) {
    if (!isDiscarding) return;

    // Visual flight: spawn a FlyingCard from the hand card's position to
    // the discard pile. Purely cosmetic — runs in parallel with the
    // game-state update.
    const all: GameCard[] = [
      ...(mePlayer?.hand ?? []),
      ...(gameState?.drawnCard ? [gameState.drawnCard] : []),
    ];
    const card = all.find((c) => c.id === cardId);
    if (card && discardPileRef.current && handAreaRef.current) {
      const cardEl = handAreaRef.current.querySelector(`[data-card-id="${cardId}"]`);
      if (cardEl) {
        const fromRect = cardEl.getBoundingClientRect();
        const toRect = discardPileRef.current.getBoundingClientRect();
        const id = flyIdRef.current++;
        setFlyingCards((prev) => [
          ...prev,
          {
            id,
            from: { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 },
            to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
            text: card.text,
          },
        ]);
      }
    }

    dispatchAction({ type: 'discard', cardId });
    setArrowFrom(null);
    setArrowTo(null);
  }

  function handleHu() {
    if (isClaimWindow) setClaimSubmitted(true); // 搶牌窗口裏的胡也算"已提交"
    dispatchAction({ type: 'hu' });
  }

  function handlePong() {
    if (!gameState?.pendingDiscard || !('dimension' in gameState.pendingDiscard)) return;
    if (claimSubmitted) return; // 已提交，防重複點
    const dim = (gameState.pendingDiscard as any).dimension as Dimension;
    pongAttemptRef.current = true;
    setClaimSubmitted(true);
    dispatchAction({ type: 'pong', dimension: dim, handCardIds: selectedCardIds });
  }

  function handleSkipPong() {
    if (claimSubmitted) return;
    setClaimSubmitted(true);
    dispatchAction({ type: 'skip-pong' });
  }

  function handleToggleSelect(cardId: number) {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  }

  function handleStartView() {
    if (viewUsedThisTurn) return;
    setViewMode(true);
    setPickedViewIds([]);
  }

  function handleTogglePickView(cardId: number) {
    setPickedViewIds(prev =>
      prev.includes(cardId)
        ? prev.filter(id => id !== cardId)
        : prev.length >= viewCap ? prev : [...prev, cardId]
    );
  }

  function handleConfirmView() {
    if (pickedViewIds.length === 0) return;
    // half 難度：累積到已看集合（永久）；hidden 每回合已清空，累積等同替換。
    setViewedCardIds(prev => Array.from(new Set([...prev, ...pickedViewIds])));
    setViewMode(false);
    setPickedViewIds([]);
    setViewUsedThisTurn(true);
  }

  function handleCancelView() {
    setViewMode(false);
    setPickedViewIds([]);
  }

  // open(明牌)無需查看，隱藏按鈕；half/hidden 才顯示。
  const canStartView = isMyTurn && gameState.phase === 'discarding' && !viewUsedThisTurn && !viewMode && revealDifficulty !== 'open';
  // 把最新 canDraw 同步到 ref，給 early-return 前定義的 handleDrawPileHover 用。
  canDrawRef.current = canDraw;

  // Game over screen — 与单机共用 GameOverModal（归档 declaredSets 是公开信息，
  // PVP 序列化已发全桌）。onPlayAgain 走回 room 页开新局；onBackToLobby 回主页。
  if (gameState.winner) {
    return (
      <GameOverModal
        players={gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          declaredSets: (p.declaredSets ?? []) as DeclaredSet[],
          remainingCards: p.handCount,
          isYou: p.id === myId,
        }))}
        winnerId={gameState.winner}
        onPlayAgain={() => router.replace(`/pvp/room/${code}`)}
        onBackToLobby={() => router.replace('/')}
        locale={locale}
      />
    );
  }

  const targets = mePlayer ? getTargetCounts(mePlayer.bigFiveScores) : null;
  const declaredDims = mePlayer ? getDeclaredDimensions(mePlayer) : new Set<Dimension>();

  // ── Pong candidates (mirror of single-player game/page logic) ─────────
  // Self-pong candidate list = ALL undeclared dimensions. Deliberately
  // does NOT pre-filter by pool>=target — that would leak which dims
  // the player has enough cards for and basically give away the puzzle.
  // selfPongCard's strict count + dim check judges correctness on commit.
  // Once-per-turn rule: if already used this turn, no candidates.
  const meAlreadySelfPonged = !!mePlayer?.selfPongUsedThisTurn;
  // 已歸檔維度也加入候選（強 trap 規則）：UI 顯示但視覺降級。
  // 玩家選卡 → 提交 → engine 判 already-declared → fail + 罰停。
  const selfPongCandidates: Dimension[] = [];
  if (
    mePlayer &&
    targets &&
    isMyTurn &&
    !meFrozen &&
    !meAlreadySelfPonged &&
    (gameState.phase === 'drawing' || gameState.phase === 'discarding')
  ) {
    for (const d of DIMENSIONS) {
      selfPongCandidates.push(d);
    }
  }

  const otherPongCandidate: Dimension | null = (() => {
    if (!mePlayer || !targets) return null;
    if (!isClaimWindow || !gameState.pendingDiscard || meFrozen) return null;
    if (alreadyResponded || isDiscarderMe) return null;
    const pc = gameState.pendingDiscard;
    if (!isPersonalityCard(pc)) return null;
    const d = pc.dimension;
    // 已歸檔維度仍允許點（強 trap）：sameInHand 不再 gate 這種情況，
    // 讓玩家有機會主動 commit → fail + 罰停。
    if (declaredDims.has(d)) return d;
    const sameInHand = mePlayer.hand.filter(
      (c) => isPersonalityCard(c) && c.dimension === d
    ).length;
    return sameInHand >= targets[d] - 1 ? d : null;
  })();

  const canPongAnywhere = selfPongCandidates.length > 0 || otherPongCandidate !== null;
  const pongIntentTarget = pongIntent && targets ? targets[pongIntent.dimension] : 0;
  const pongIntentRequiredSelectCount =
    pongIntent?.type === 'self'
      ? pongIntentTarget
      : pongIntent?.type === 'other'
      ? pongIntentTarget - 1
      : 0;

  function handleCommitPongIntent() {
    if (!pongIntent) return;
    if (pongIntent.type === 'self') {
      dispatchAction({ type: 'self-pong', dimension: pongIntent.dimension, cardIds: selectedCardIds });
    } else {
      dispatchAction({ type: 'pong', dimension: pongIntent.dimension, handCardIds: selectedCardIds });
    }
    setPongIntent(null);
    setSelectedCardIds([]);
  }

  return (
    <motion.div animate={shakeControls} className="mx-auto flex min-h-[100dvh] max-w-6xl w-full flex-col px-3 py-3 sm:px-4 sm:py-4">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
      <YourTurnBanner bannerKey={yourTurnKey} locale={locale} />
      {/* 引导箭头线已移除（用户反馈：抽/出/弃牌处的虚线都不要） */}
      {flyingCards.map((f) => (
        <FlyingCard key={f.id} from={f.from} to={f.to} text={f.text} onComplete={() => removeFlyingCard(f.id)} />
      ))}

      {/* Top bar: exit button */}
      <div className="mb-1 flex shrink-0 items-center justify-between sm:mb-2">
        <button
          onClick={() => setExitConfirmOpen(true)}
          className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-1 text-[10px] text-[var(--psy-muted)] shadow-[0_8px_18px_rgba(96,72,38,0.1)] transition hover:border-[rgba(220,80,80,0.4)] hover:text-[var(--psy-danger)] sm:text-[11px]"
        >
          {t.leaveGame}
        </button>
        <span className="psy-serif text-[10px] uppercase tracking-[0.32em] text-[var(--psy-muted)] sm:text-[11px]">
          {t.roomTitlePrefix} {code}
        </span>
      </div>

      {/* Exit confirmation modal */}
      <PsyOverlayPanel
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        title={t.exitConfirmTitle}
        variant="centered"
      >
        <div className="space-y-5 px-1 py-2">
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
            {t.exitConfirmBody1}
            <br />
            {t.exitConfirmBody2}
            <br />
            {t.exitConfirmBody3}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setExitConfirmOpen(false)}
              className="psy-btn psy-btn-ghost px-5 py-2 text-sm"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => {
                setExitConfirmOpen(false);
                // Broadcast the leave so the engine marks the seat
                // hasLeft + skips it for everyone else. Then exit the
                // room cleanly.
                try { dispatchAction({ type: 'leave' }); } catch {}
                handleAbandonRoom();
              }}
              className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
            >
              {t.confirmExit}
            </button>
          </div>
        </div>
      </PsyOverlayPanel>

      {/* Result banner */}
      {resultBanner && (
        <div className="psy-panel fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border px-6 py-3 text-sm font-semibold shadow-[0_16px_36px_rgba(96,72,38,0.24)]"
          style={{
            borderColor: resultBanner.success ? 'rgba(111,143,85,0.5)' : 'rgba(201,96,63,0.5)',
            background: 'var(--psy-card-content)',
            color: resultBanner.success ? 'var(--psy-success)' : 'var(--psy-danger)',
          }}
        >
          {resultBanner.success ? '✅' : '❌'} {resultBanner.message}
        </div>
      )}

      {/* Host offline banner — non-host clients only, visible during the
          3-min host-grace window. All actions effectively pause because
          action-requests have no one to land. */}
      {hostOffline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="psy-panel fixed left-1/2 top-16 z-[70] max-w-[92vw] -translate-x-1/2 rounded-xl border border-[rgba(200,155,93,0.5)] bg-[var(--psy-card-content)] px-5 py-2.5 text-xs font-semibold text-[var(--psy-accent-strong)] shadow-[0_16px_36px_rgba(96,72,38,0.22)] sm:text-sm"
        >
          {t.hostOfflinePaused}
        </motion.div>
      )}

      {/* 30s idle reminder — 与单机一致用 psy 风 TurnNoticeToast（原 amber 与设计系统不统一） */}
      {idleReminderVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed left-1/2 top-28 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 sm:top-32"
        >
          <TurnNoticeToast title={t.idleYourTurn} icon="⏰" />
        </motion.div>
      )}

      {stolenToast && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="psy-panel fixed left-1/2 top-40 z-[65] max-w-[90vw] -translate-x-1/2 rounded-xl border border-[rgba(200,155,93,0.5)] bg-[var(--psy-card-content)] px-5 py-2.5 text-xs font-semibold text-[var(--psy-accent-strong)] shadow-[0_16px_36px_rgba(96,72,38,0.22)] sm:top-44 sm:px-6 sm:py-3 sm:text-sm"
        >
          {t.stolenToast}
        </motion.div>
      )}

      {/* 牌桌面板：对手 + 回合chip + 中央（对齐单机结构） */}
      <div className="shrink-0 rounded-[1.7rem] border border-[rgba(154,116,72,0.16)] bg-[linear-gradient(180deg,rgba(253,248,241,0.76),rgba(234,221,196,0.42))] p-2 shadow-[0_18px_40px_rgba(96,72,38,0.12)] sm:rounded-[2rem] sm:p-3">
        {/* Opponents — 移动端始终占满屏宽按人数均分（1→50%居中 / 2→各50% / 3→各33%），
            不留空以腾出手牌+归档空间；桌面(sm+)才收窄居中避免卡片过大。 */}
        <div className={`grid gap-2 sm:h-[6.5rem] sm:gap-3 sm:mx-auto ${
          opponentPlayers.length === 1
            ? 'mx-auto w-1/2 grid-cols-1 sm:w-auto sm:max-w-[13rem]'
            : opponentPlayers.length === 2
            ? 'w-full grid-cols-2 sm:max-w-[26rem]'
            : 'w-full grid-cols-3'
        }`}>
          {opponentPlayers.map(opp => (
            <OpponentHand
              key={opp.id}
              player={opp}
              isCurrentTurn={currentPlayer?.id === opp.id}
              isTentativeOffline={offlinePlayerIds.includes(opp.id)}
              locale={locale}
            />
          ))}
        </div>

        {/* 回合数（桌面）chip：轮次 + 当前回合归属 */}
        <div className="mt-3 hidden justify-center md:flex">
          <span className="psy-serif rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-4 py-1 text-sm text-[var(--psy-ink-soft)] shadow-[0_8px_18px_rgba(96,72,38,0.08)]">
            {locale === 'en' ? `${t.roundUnit} ${gameState.currentRound}${gameState.totalRounds > 0 ? `/${gameState.totalRounds}` : ''}` : `第 ${gameState.currentRound}${gameState.totalRounds > 0 ? `/${gameState.totalRounds}` : ''} 輪`}
            {isMyTurn
              ? <span className="ml-2 font-medium text-[var(--psy-accent)]">· {t.yourTurnNow}</span>
              : currentPlayer && <span className="ml-2 text-[var(--psy-muted)]">· {currentPlayer.name}{t.turnOf}</span>}
          </span>
        </div>

        {/* Center: 抽牌 + 弃牌 + 行动记录 三张竖卡并排，同尺寸同风格；mobile/desktop 一致（对齐单机） */}
        <div className="mt-3 flex items-start justify-center gap-3 rounded-[1.35rem] border border-[rgba(154,116,72,0.16)] bg-[linear-gradient(180deg,#fdf8f1,#f8f1e4)] p-3 sm:mt-4 sm:gap-6 sm:p-4">
          <div
            ref={drawPileRef}
            onMouseEnter={() => handleDrawPileHover(true)}
            onMouseLeave={() => handleDrawPileHover(false)}
          >
            <DrawPile count={gameState.drawPileCount} canDraw={canDraw} onDraw={handleDraw} locale={locale} />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile
              topCard={gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null}
              count={gameState.discardPile.length}
              discardPile={gameState.discardPile}
              actions={gameState.actionLog as any}
              players={gameState.players}
              highlight={isDiscarding}
              revealTags={revealDifficulty === 'open'}
              locale={locale}
            />
          </div>
          <GameLog actions={gameState.actionLog as any} players={allPlayers} locale={locale} vertical />
        </div>
      </div>

      {/* My player area（面板包裹，对齐单机） */}
      {mePlayer && (
        <div className="mt-2 flex flex-1 flex-col space-y-2 p-1 sm:mt-3 sm:space-y-3 sm:p-1.5">
          {/* 罰停橫幅 / 搶牌窗 / 查看 / 碰意圖面板已全部移入手牌上方的懸浮層
              （見下方 Hand + Declared 前的錨點），不再插進文檔流把手牌往下推。 */}
          {/* Big Five 分数条已移除（桌面端与目标板重复、单机也没有；老板要求）。 */}

          {/* Targets */}
          {targets && (
            <div className="hidden items-center justify-center gap-1.5 flex-wrap sm:flex">
              {DIMENSIONS.map(d => {
                const isDone = declaredDims.has(d);
                return (
                  <div
                    key={d}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isDone ? 'rgba(195,154,82,0.18)' : '#fdf8f1',
                      border: `1px solid ${isDone ? 'rgba(154,116,72,0.45)' : 'rgba(154,116,72,0.16)'}`,
                    }}
                  >
                    <span className="text-[9px]" style={{ color: isDone ? 'var(--psy-accent)' : 'var(--psy-muted)' }}>
                      {dimName(d)}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isDone ? 'var(--psy-accent)' : 'var(--psy-ink-soft)' }}
                    >
                      {isDone ? '✓' : (locale === 'en' ? `${targets[d]} cards` : `${targets[d]}張`)}
                    </span>
                  </div>
                );
              })}
              <div className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-2 py-0.5">
                <span className="text-[9px] text-[var(--psy-muted)]">{t.done} </span>
                <span className="text-[10px] font-medium text-[var(--psy-success)]">{mePlayer.declaredSets.length}/5</span>
              </div>
            </div>
          )}

          <div className="flex shrink-0 flex-col gap-1.5 sm:hidden">
            {/* 回合信息 + 記錄 合并一行（人格/歸檔入口已移除：下方 5 维 pill 本身即人格展示，点击=展开归档）。 */}
            <div className="flex items-center gap-1.5">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(154,116,72,0.2)] bg-[var(--psy-card-content)] px-3 py-1.5 text-xs text-[var(--psy-ink-soft)]">
                <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{locale === 'en' ? `${t.roundUnit} ${gameState.currentRound}${gameState.totalRounds > 0 ? `/${gameState.totalRounds}` : ''}` : `第 ${gameState.currentRound}${gameState.totalRounds > 0 ? `/${gameState.totalRounds}` : ''} 輪`}</span>
                <span className="flex min-w-0 items-center gap-0.5">
                  {isMyTurn ? (
                    <span className="truncate font-medium text-[var(--psy-accent)]">{t.yourTurnShort}</span>
                  ) : (
                    <>
                      <span className="max-w-[10ch] truncate">{currentPlayer?.name}</span>
                      {t.turnSuffix && <span className="shrink-0">{t.turnSuffix}</span>}
                    </>
                  )}
                </span>
                <span className="ml-auto shrink-0 font-medium">{t.doneLabel} {mePlayer.declaredSets.length}/5</span>
              </div>
            </div>
            {/* 5 维人格 pill：点击展开该玩家归档（模态居中）；实底加深、字加大，替代原独立人格/归档入口。 */}
            {targets && (
              <div className="grid grid-cols-5 gap-1.5" aria-label={locale === 'en' ? 'Archive progress' : '歸檔進度'}>
                {DIMENSIONS.map((d) => {
                  const isDone = declaredDims.has(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMobileSheet('declared')}
                      className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1.5 text-center transition active:scale-95 ${isDone ? 'border-[rgba(111,143,85,0.5)] bg-[rgba(111,143,85,0.18)] text-[var(--psy-success)]' : 'border-[rgba(154,116,72,0.3)] bg-[#f0e6d2] text-[var(--psy-ink)]'}`}
                    >
                      <span className="text-[11px] font-bold leading-tight">{locale === 'en' ? d : dimName(d)}</span>
                      <span className="text-[8px] font-medium leading-tight opacity-90">{locale === 'en' ? `${targets[d]} · ${isDone ? 'Done' : 'Open'}` : `目標${targets[d]}張 ${isDone ? '已歸檔' : '未歸檔'}`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 懸浮操作層 ─────────────────────────────────────────────
              罰停橫幅 / 搶牌窗 / 查看 / 碰意圖面板全部懸浮在操作排上方
              （h-0 錨點 + absolute bottom 錨定；錨點必須在操作排之前——
              否則面板會蓋住排裏的截胡/查看/AI回合按鈕），蓋住牌桌中央而不佔文檔流
              —— 手牌位置在任何窗口彈出時都紋絲不動（牌類手游慣例做法）。 */}
          <div className="relative z-30 h-0 overflow-visible">
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
          <div className="pointer-events-auto w-full max-w-xl space-y-2 px-1">

          {/* Penalty banner — 真正 lockout 時顯示"罰停"，own-turn 解凍輪換成提示 */}
          {meFrozenLockout && (
            <div className="psy-panel flex items-center justify-center gap-2 rounded-xl border border-[rgba(220,106,79,0.5)] bg-[var(--psy-card-content)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-danger)] shadow-[0_14px_30px_rgba(96,72,38,0.2)] sm:text-sm">
              <span>⛔</span>
              <span className="hidden sm:inline">{t.penaltyLockoutFull}</span>
              <span className="sm:hidden">{t.penaltyLockoutShort}</span>
            </div>
          )}
          {meAwaitingOwnDischarge && (
            <div className="psy-panel flex items-center justify-center gap-2 rounded-xl border border-[rgba(200,155,93,0.45)] bg-[rgba(200,155,93,0.12)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-accent)] sm:text-sm">
              <span>⏳</span>
              <span className="hidden sm:inline">{t.thawFull}</span>
              <span className="sm:hidden">{t.thawShort}</span>
            </div>
          )}

          {/* Claim window — opponent discarded. First-come-first-served:
              any non-discarder may pong / pass / hu. Whoever clicks
              first wins the race. */}
          {canClaim && gameState.pendingDiscard && (
            <div className="psy-panel space-y-3 rounded-[1.35rem] border p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="psy-serif min-w-0 text-sm font-medium text-[var(--psy-accent)]">
                  <span className="max-w-[8ch] truncate align-bottom inline-block">{gameState.players[gameState.discardedByIndex]?.name}</span> {t.discardedACard}
                </h3>
                <span className="shrink-0 text-[10px] text-[var(--psy-muted)]">{t.firstComeFirst}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--psy-muted)]">{t.discardedCardLabel}</span>
                  <div className="w-24 rounded-xl ring-1 ring-[rgba(200,155,93,0.35)]">
                    <TarotCard
                      text={gameState.pendingDiscard.text}
                      textEn={isPersonalityCard(gameState.pendingDiscard) ? gameState.pendingDiscard.textEn : undefined}
                      dimension={isPersonalityCard(gameState.pendingDiscard) ? gameState.pendingDiscard.dimension : undefined}
                      revealedDimension={revealDifficulty === 'open' && isPersonalityCard(gameState.pendingDiscard) ? gameState.pendingDiscard.dimension : null}
                      isDummy={!isPersonalityCard(gameState.pendingDiscard)}
                      description={isPersonalityCard(gameState.pendingDiscard) ? undefined : gameState.pendingDiscard.definition}
                      imageSrc={isPersonalityCard(gameState.pendingDiscard) ? `/cards/${gameState.pendingDiscard.imageId ?? gameState.pendingDiscard.id}.webp` : undefined}
                      locale={locale}
                      fluid
                    />
                  </div>
                </div>
                {/* 不洩露「已歸檔」資訊（強 trap）：所有維度顯示相同引導，玩家自行
                    判斷。碰了若重複歸檔/混維度，由引擎判失敗 + 罰停（提示「重複碰」）。 */}
                <div className="text-xs text-[var(--psy-ink-soft)]">
                  <ul className="list-disc space-y-1 pl-4 marker:text-[var(--psy-accent)]">
                    <li>{t.claimHint1}</li>
                    <li>{t.claimHint2}</li>
                    <li>{t.claimHint3}</li>
                  </ul>
                </div>
              </div>
              {/* 五维目标行（对齐单机 PongPanel）：目标张数 + 已归档维度划线花掉。 */}
              {targets && (
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {DIMENSIONS.map((d) => {
                    const done = declaredDims.has(d);
                    return (
                      <div
                        key={d}
                        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-md border px-1 py-1 text-center tabular-nums sm:py-1.5 ${done ? 'border-[rgba(154,116,72,0.1)] bg-[rgba(154,116,72,0.04)] text-[var(--psy-muted)] line-through' : 'border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] text-[var(--psy-ink-soft)]'}`}
                      >
                        <span className="text-[9px] font-semibold leading-tight sm:text-[11px]">{locale === 'en' ? d : dimName(d)}</span>
                        <span className="text-[8px] leading-none opacity-90 sm:text-[10px]">{locale === 'en' ? `${targets[d]}` : `目標 ${targets[d]} 張`}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {claimSubmitted ? (
                <div className="psy-serif animate-pulse py-1.5 text-center text-xs text-[var(--psy-muted)]">
                  {t.submittedWaiting}
                </div>
              ) : (
              <>
                {canPong && (
                  <p className="text-center text-[11px] text-[var(--psy-muted)]">
                    {selectedCardIds.length > 0
                      ? `${t.selectedPrefix} ${selectedCardIds.length} ${t.cardsUnit}`
                      : t.selectFirst}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 flex-nowrap">
                  <button
                    onClick={handleSkipPong}
                    className="psy-btn psy-btn-ghost px-2 py-1.5 text-xs font-medium"
                  >
                    {t.pass}
                  </button>
                  {canPong && (
                    <button
                      onClick={handlePong}
                      disabled={selectedCardIds.length === 0}
                      className="psy-btn psy-btn-accent px-2 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35"
                      title={
                        selectedCardIds.length === 0
                          ? t.pongNeedSelect
                          : undefined
                      }
                    >
                      {t.pong}
                    </button>
                  )}
                  {!meFrozen && (
                    <button
                      onClick={handleHu}
                      className="psy-btn psy-btn-danger px-2 py-1.5 text-xs font-bold"
                    >
                      {t.win}
                    </button>
                  )}
                </div>
              </>
              )}
            </div>
          )}

          {/* Pong-intent panel — card selection prompt */}
          {pongIntent && targets && (
            <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
              <p className="psy-serif text-center text-xs text-[var(--psy-accent)] sm:text-sm">
                {pongIntent.type === 'self' ? t.pongIntentSelf : t.pongIntentOther} ·{' '}
                <span className="font-semibold text-[var(--psy-accent)]">
                  {dimName(pongIntent.dimension)}
                </span>{' '}
                · {t.pongSelectPrompt}{' '}
                <span className="font-bold text-[var(--psy-accent-strong)]">{pongIntentRequiredSelectCount}</span> {t.cardsUnit}
                {pongIntent.type === 'self' ? t.pongSelectSelfSuffix : t.pongSelectOtherPrefixA + pongIntentTarget + t.pongSelectOtherPrefixB}
                {locale === 'en' ? ' (' : '（'}{t.selectedPrefix} <span className="font-bold text-[var(--psy-accent-strong)]">{selectedCardIds.length}</span>{locale === 'en' ? ')' : '）'}
              </p>
              {pongIntent.type === 'self' && selfPongCandidates.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selfPongCandidates.map((d) => {
                    const isDeclared = declaredDims.has(d);
                    return (
                    <button
                      key={d}
                      onClick={() => {
                        setPongIntent({ type: 'self', dimension: d });
                        setSelectedCardIds([]);
                      }}
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                      title={isDeclared ? t.declaredWarn : undefined}
                      style={{
                        // 维度不带专属色：选中 = 实心 primary(金)，未选 = 中性。
                        borderColor: pongIntent.dimension === d
                          ? '#c39a52'
                          : isDeclared
                          ? 'rgba(220,106,79,0.35)'
                          : 'rgba(200,155,93,0.18)',
                        backgroundColor: pongIntent.dimension === d
                          ? '#c39a52'
                          : isDeclared
                          ? 'rgba(220,106,79,0.06)'
                          : '#fdf8f1',
                        color: pongIntent.dimension === d
                          ? '#fff7ea'
                          : isDeclared
                          ? 'rgba(220,106,79,0.65)'
                          : 'var(--psy-ink-soft)',
                        textDecoration: isDeclared ? 'line-through' : undefined,
                        opacity: isDeclared && pongIntent.dimension !== d ? 0.6 : 1,
                      }}
                    >
                      {dimName(d)}{isDeclared ? ' ⚠️' : ''}
                    </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setPongIntent(null); setSelectedCardIds([]); }}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleCommitPongIntent}
                  disabled={selectedCardIds.length !== pongIntentRequiredSelectCount}
                  className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  {pongIntent.type === 'self' ? t.selfArchive : t.archiveJudge}
                </button>
              </div>
            </div>
          )}

          {/* View-cards mode: pick up to 2 cards from your own hand */}
          {viewMode && (
            <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
              <p className="psy-serif text-center text-xs text-[var(--psy-accent)] sm:text-sm">
                🔍 {t.viewPickPrompt}（{pickedViewIds.length}/{viewCap}）
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleCancelView}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleConfirmView}
                  disabled={pickedViewIds.length === 0}
                  className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  {t.view}
                </button>
              </div>
            </div>
          )}

          </div>
          </div>
          </div>

          {/* Action buttons (my turn only) — 恆佔一行高度（min-h）：
              按鈕隨回合出現/消失時手牌不再上下跳。 */}
          <div className="flex min-h-[46px] shrink-0 flex-nowrap items-center justify-center gap-2 sm:gap-3">
          {isMyTurn && gameState.phase !== 'game-over' && gameState.phase !== 'claim-window' && !viewMode && !pongIntent && (
          <>
            {canDraw && (
              <p className="psy-serif animate-pulse text-xs text-[var(--psy-accent)] sm:text-sm">{t.clickToDraw}</p>
            )}
            {isDiscarding && !gameState.drawnCard && (
              <p className="psy-serif animate-pulse text-xs text-[var(--psy-accent)] sm:text-sm">
                {t.pongDoneDiscard}
              </p>
            )}
            {canStartView && (
              <button
                onClick={handleStartView}
                className="psy-btn psy-btn-ghost px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm"
                title={t.viewCardsTitle}
              >
                🔍 {locale === 'en' ? `View ${viewCap}` : `查看 ${viewCap} 張`}
              </button>
            )}
            {viewUsedThisTurn && !viewMode && (
              <span className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-2 text-xs text-[var(--psy-muted)]">{t.viewUsed}</span>
            )}
            {!meFrozen && (
              <button
                onClick={handleHu}
                className="psy-btn psy-btn-danger px-3 py-2 text-xs font-bold sm:px-5 sm:text-sm"
              >
                {t.win}
              </button>
            )}
            {/* Self-pong button — 只在 discarding 阶段(已抽牌/已碰牌)显示：drawing 阶段
                自摸会漏抽一次牌导致掉牌(见 selfPongCard 守卫)。与单机一致。
                enabled 不随是否真有牌切换,避免泄露"你有足够X维牌"。玩家决定、引擎判。*/}
            {gameState.phase === 'discarding' && (
            <button
              onClick={() => {
                if (meFrozen || meAlreadySelfPonged) return;
                if (selfPongCandidates.length === 0) return;
                // 默認選第一個未歸檔維度，避免點擊「自摸碰」直接落到 trap 維度
                const defaultDim =
                  selfPongCandidates.find((d) => !declaredDims.has(d)) ??
                  selfPongCandidates[0];
                setPongIntent({ type: 'self', dimension: defaultDim });
                setSelectedCardIds([]);
              }}
              disabled={
                meFrozen ||
                meAlreadySelfPonged ||
                selfPongCandidates.length === 0
              }
              className="psy-btn psy-btn-accent px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 sm:px-5 sm:text-sm"
              title={
                meFrozen
                  ? t.selfPongFrozen
                  : meAlreadySelfPonged
                  ? t.selfPongUsed
                  : t.selfPongHint
              }
            >
              {t.selfPong}
            </button>
            )}
          </>
          )}
          </div>

          {/* Hand + Declared */}
          <div className="flex flex-1 items-start justify-center gap-3 sm:gap-4">
            <div className="hidden flex-shrink-0 sm:block">
              <DeclaredArea declaredSets={mePlayer.declaredSets} locale={locale} />
            </div>
            <div ref={handAreaRef} className="flex-1 min-w-0 overflow-visible">
              <PlayerHand
                cards={mePlayer.hand}
                drawnCard={isMyTurn ? (gameState.drawnCard ?? null) : null}
                isDiscarding={isDiscarding && !viewMode && !pongIntent}
                isDeclaring={canPong || pongIntent !== null}
                isMyTurn={isMyTurn}
                mobileCompact={true}
                locale={locale}
                selectedCardIds={selectedCardIds}
                viewedCardIds={
                  // open(明牌)：自己手牌全部顯示人格；half/hidden：只顯示看過的。
                  revealDifficulty === 'open'
                    ? [...mePlayer.hand, ...(gameState.drawnCard ? [gameState.drawnCard] : [])]
                        .filter((c) => isPersonalityCard(c))
                        .map((c) => c.id)
                    : viewedCardIds
                }
                viewMode={viewMode}
                pickedViewIds={pickedViewIds}
                onTogglePickView={handleTogglePickView}
                onDiscardCard={handleDiscard}
                onToggleSelect={handleToggleSelect}
                onCardHover={handleCardHover}
              />
            </div>
          </div>

          {/* 回合信息已上移到牌桌上方 chip（对齐单机），此处不再重复。 */}
        </div>
      )}
      {mePlayer && targets && (
        <>
          <MobileGameSheet
            title={t.sheetPersonaTitle}
            open={mobileSheet === 'persona'}
            onClose={() => setMobileSheet(null)}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map((d) => {
                  const score = mePlayer.bigFiveScores[d];
                  const isDone = declaredDims.has(d);
                  return (
                    <div key={d} className="rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(200,155,93,0.2)', backgroundColor: 'rgba(200,155,93,0.08)' }}>
                      <div className="psy-serif text-sm text-[var(--psy-ink)]">{dimName(d)}</div>
                      <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">{t.scoreLabel} {score.toFixed(1)} · {isDone ? t.doneLabel : (locale === 'en' ? `${t.targetPrefix} ${targets[d]} cards` : `目標 ${targets[d]} 張`)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </MobileGameSheet>
          <MobileGameSheet
            title={t.sheetDeclaredTitle}
            open={mobileSheet === 'declared'}
            onClose={() => setMobileSheet(null)}
            variant="centered"
          >
            {mePlayer.declaredSets.length > 0 ? <DeclaredArea declaredSets={mePlayer.declaredSets} locale={locale} overlayZIndex={98} expanded /> : <p className="text-sm text-[var(--psy-muted)]">{t.noArchiveYet}</p>}
          </MobileGameSheet>
          <MobileGameSheet
            title={t.sheetLogTitle}
            open={mobileSheet === 'log'}
            onClose={() => setMobileSheet(null)}
          >
            <GameLog actions={gameState.actionLog as any} players={allPlayers} locale={locale} inline />
          </MobileGameSheet>
        </>
      )}
    </motion.div>
  );
}
