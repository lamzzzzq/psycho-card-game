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
} from '@/components/game/FeedbackLayer';
import { FlyingCard } from '@/components/game/FlyingCard';
import { supabase } from '@/lib/supabase';
import { leaveRoom, updateRoomStatus } from '@/lib/room-api';

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
import { Card } from '@/components/game/Card';
import { MobileGameSheet } from '@/components/game/MobileGameSheet';
import { ArrowOverlay } from '@/components/game/ArrowOverlay';
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
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

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
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
  const [arrowTo, setArrowTo] = useState<{ x: number; y: number } | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const [slowLoad, setSlowLoad] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [pongIntent, setPongIntent] = useState<{
    type: 'self' | 'other';
    dimension: Dimension;
  } | null>(null);
  const [idleReminderVisible, setIdleReminderVisible] = useState(false);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Re-subscribe if store lost channel (e.g. hard refresh)
  useEffect(() => {
    if (!player) { router.replace('/pvp'); return; }
    const { channel } = usePvpStore.getState();
    if (!channel) subscribeRoom(code, player.id);
  }, [code, player]);

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
      if (error || !data || data.status !== 'playing') {
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
    if (isHost && gameInProgress) {
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

  // Reset "view cards" state whenever the active turn changes (own or other).
  useEffect(() => {
    setViewMode(false);
    setPickedViewIds([]);
    setViewedCardIds([]);
    setViewUsedThisTurn(false);
  }, [gameState?.currentPlayerIndex, gameState?.currentRound]);

  // Reset pong-intent on phase / turn changes — keeps the modal honest.
  useEffect(() => {
    setPongIntent(null);
    setSelectedCardIds([]);
  }, [gameState?.currentPlayerIndex, gameState?.phase]);


  const { shakeControls, flashControls, pops } = useGameFeedback(
    (gameState?.actionLog ?? []) as GameAction[],
    gameState?.players ?? []
  );

  // Your-turn banner: fires when the turn becomes the viewer's turn.
  const myIsCurrent =
    !!gameState &&
    gameState.players[gameState.currentPlayerIndex]?.id === (myPlayerId ?? player?.id) &&
    (gameState.phase === 'drawing' || gameState.phase === 'discarding');
  const yourTurnKey = useYourTurnNotifier(gameState?.currentPlayerIndex, myIsCurrent);

  // Recurring 30-second idle reminder. Deps narrowed to ONLY myIsCurrent —
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
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setIdleReminderVisible(false), 3000);
    }, 30_000);
    return () => {
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
      setIdleReminderVisible(false);
    };
  }, [myIsCurrent]);

  const showBanner = useCallback((success: boolean, message: string) => {
    setResultBanner({ success, message });
    setTimeout(() => setResultBanner(null), 3000);
  }, []);

  if (!gameState) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          {slowLoad ? (
            <>
              <div className="text-amber-300 text-sm">房主似乎不在线，无法恢复游戏</div>
              <button
                onClick={handleAbandonRoom}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition-colors"
              >
                离开此房间并返回大厅
              </button>
              <div>
                <button
                  onClick={() => {
                    usePvpStore.getState().reset();
                    router.replace('/pvp');
                  }}
                  className="text-xs text-[var(--psy-muted)] underline transition-colors hover:text-[var(--psy-ink-soft)]"
                >
                  仅返回大厅
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="psy-serif animate-pulse text-[var(--psy-ink-soft)]">等待游戏开始…</div>
              <button
                onClick={() => {
                  usePvpStore.getState().reset();
                  router.replace('/pvp');
                }}
                className="text-xs text-[var(--psy-muted)] underline transition-colors hover:text-[var(--psy-ink-soft)]"
              >
                返回大厅
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const myId = myPlayerId ?? player?.id;
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
  // Penalty freeze: skipNextTurn (one own-turn auto-skip) +
  // frozenUntilOwnDiscard (locked out of every claim window until
  // own next clean discard). Either suppresses the claim panel.
  const meFrozen =
    meSerialized?.skipNextTurn ||
    !!meSerialized?.frozenUntilOwnDiscard;
  const canPong = canClaim && !meFrozen;
  const canHu = (isMyTurn && gameState.phase !== 'claim-window' && !meFrozen)
    || (canClaim && !meFrozen);
  const canDraw = isMyTurn && gameState.phase === 'drawing';
  const isDiscarding = isMyTurn && gameState.phase === 'discarding';

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

  const removeFlyingCard = useCallback((id: number) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  function handleHu() {
    dispatchAction({ type: 'hu' });
  }

  function handlePong() {
    if (!gameState?.pendingDiscard || !('dimension' in gameState.pendingDiscard)) return;
    const dim = (gameState.pendingDiscard as any).dimension as Dimension;
    dispatchAction({ type: 'pong', dimension: dim, handCardIds: selectedCardIds });
  }

  function handleSkipPong() {
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
        : prev.length >= 2 ? prev : [...prev, cardId]
    );
  }

  function handleConfirmView() {
    if (pickedViewIds.length === 0) return;
    setViewedCardIds(pickedViewIds);
    setViewMode(false);
    setPickedViewIds([]);
    setViewUsedThisTurn(true);
  }

  function handleCancelView() {
    setViewMode(false);
    setPickedViewIds([]);
  }

  const canStartView = isMyTurn && gameState.phase === 'discarding' && !viewUsedThisTurn && !viewMode;

  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current || !handAreaRef.current) return;
    if (hovering && canDraw) {
      const fromRect = drawPileRef.current.getBoundingClientRect();
      const toRect = handAreaRef.current.getBoundingClientRect();
      setArrowFrom({ x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 });
      setArrowTo({ x: toRect.left + toRect.width / 2, y: toRect.top + Math.min(40, toRect.height * 0.35) });
    } else {
      setArrowFrom(null);
      setArrowTo(null);
    }
  }, [canDraw]);

  const handleCardHover = useCallback((el: HTMLElement | null) => {
    if (!el || !discardPileRef.current) { setArrowFrom(null); setArrowTo(null); return; }
    const rect = el.getBoundingClientRect();
    const discardRect = discardPileRef.current.getBoundingClientRect();
    setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top });
    setArrowTo({ x: discardRect.left + discardRect.width / 2, y: discardRect.top + discardRect.height / 2 });
  }, []);

  // Game over screen
  if (gameState.winner) {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">{gameState.winner === myId ? '🏆' : '😔'}</div>
          <h1 className="psy-serif text-3xl text-[var(--psy-ink)]">
            {gameState.winner === myId ? '你赢了！' : `${winner?.name ?? '对手'} 赢了`}
          </h1>
          <div className="space-y-2">
            {gameState.players.map((p, i) => (
              <div key={p.id} className="flex items-center justify-center gap-3 text-sm">
                <span className="text-[var(--psy-muted)]">#{i + 1}</span>
                <span className={p.id === gameState.winner ? 'psy-serif font-medium text-[var(--psy-accent)]' : 'text-[var(--psy-ink-soft)]'}>
                  {p.name}
                </span>
                <span className="text-[var(--psy-muted)]">申报 {p.declaredSets.length} 组 · 剩余 {p.handCount} 张</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.replace(`/pvp/room/${code}`)}
              className="psy-btn psy-btn-accent px-6 py-2.5 font-medium"
            >
              再来一局
            </button>
            <button
              onClick={() => router.replace('/')}
              className="psy-btn psy-btn-ghost px-6 py-2.5 text-sm"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
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
      if (declaredDims.has(d)) continue;
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
    if (declaredDims.has(d)) return null;
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
      <YourTurnBanner bannerKey={yourTurnKey} />
      <ArrowOverlay from={arrowFrom} to={arrowTo} color="#c89b5d" />
      {flyingCards.map((f) => (
        <FlyingCard key={f.id} from={f.from} to={f.to} text={f.text} onComplete={() => removeFlyingCard(f.id)} />
      ))}

      {/* Top bar: exit button */}
      <div className="mb-1 flex shrink-0 items-center justify-between sm:mb-2">
        <button
          onClick={() => setExitConfirmOpen(true)}
          className="rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] text-[var(--psy-muted)] transition hover:border-[rgba(220,80,80,0.4)] hover:text-[var(--psy-danger)] sm:text-[11px]"
        >
          ← 退出对局
        </button>
        <span className="psy-serif text-[10px] uppercase tracking-[0.32em] text-[var(--psy-muted)] sm:text-[11px]">
          人格麻将 · 联机房 {code}
        </span>
      </div>

      {/* Exit confirmation modal */}
      <PsyOverlayPanel
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        title="确认退出本局？"
        variant="centered"
      >
        <div className="space-y-5 px-1 py-2">
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
            退出后本局进度将丢失，且无法恢复。
            <br />
            桌上其他玩家会继续对局，少一人继续打到分出胜负。
            <br />
            若只剩 1 人，对局立即结束、剩下的玩家获胜。
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setExitConfirmOpen(false)}
              className="psy-btn psy-btn-ghost px-5 py-2 text-sm"
            >
              取消
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
              确认退出
            </button>
          </div>
        </div>
      </PsyOverlayPanel>

      {/* Result banner */}
      {resultBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-bold shadow-2xl animate-bounce ${
          resultBanner.success
            ? 'bg-emerald-500/90 text-white border border-emerald-400'
            : 'bg-red-500/90 text-white border border-red-400'
        }`}>
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
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] rounded-xl border border-amber-400/60 bg-amber-500/95 px-5 py-2.5 text-xs font-bold text-white shadow-2xl sm:text-sm"
        >
          ⚠ 房主短暂离线 — 操作已暂停，3 分钟内未回则房间解散
        </motion.div>
      )}

      {/* 30s idle reminder — fires once if my turn idles past 30s */}
      {idleReminderVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] rounded-xl border border-amber-400/60 bg-amber-500/90 px-5 py-2.5 text-xs font-bold text-white shadow-2xl sm:top-20 sm:px-6 sm:py-3 sm:text-sm"
        >
          ⏰ 请注意：现在是你的回合
        </motion.div>
      )}

      {/* Opponents */}
      <div className="mb-1 grid shrink-0 grid-cols-3 gap-2 sm:mb-4 sm:h-[6.5rem] sm:gap-3">
        {opponentPlayers.map(opp => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={currentPlayer?.id === opp.id}
            isTentativeOffline={offlinePlayerIds.includes(opp.id)}
          />
        ))}
      </div>

      {/* Center: Draw + Discard + Log */}
      <div className="my-1 flex shrink-0 items-center justify-center gap-3 sm:my-4 sm:grid sm:h-[11rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <div className="flex items-center gap-3 sm:col-start-2 sm:gap-6">
          <div
            ref={drawPileRef}
            onMouseEnter={() => handleDrawPileHover(true)}
            onMouseLeave={() => handleDrawPileHover(false)}
          >
            <DrawPile count={gameState.drawPileCount} canDraw={canDraw} onDraw={handleDraw} />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile
              topCard={gameState.discardPile.length > 0 ? gameState.discardPile[gameState.discardPile.length - 1] : null}
              count={gameState.discardPile.length}
              discardPile={gameState.discardPile}
              actions={gameState.actionLog as any}
              players={gameState.players}
            />
          </div>
        </div>
        <div className="hidden md:block md:col-start-3 md:justify-self-end w-52">
          <GameLog actions={gameState.actionLog as any} players={allPlayers} />
        </div>
      </div>

      {/* My player area */}
      {mePlayer && (
        <div className="flex flex-1 flex-col space-y-2 sm:space-y-3">
          {/* Penalty banner — visible & loud */}
          {meFrozen && (
            <div className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(220,106,79,0.45)] bg-[rgba(220,106,79,0.12)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-danger)] sm:text-sm">
              <span>⛔</span>
              <span className="hidden sm:inline">你被罚停一轮 — 下个本应出牌的回合会被自动跳过，期间无法参与碰/食胡</span>
              <span className="sm:hidden">罚停一轮 · 下回合跳过 · 期间不可碰/胡</span>
            </div>
          )}
          {/* Big Five scores */}
          <div className="hidden items-center justify-center gap-1.5 flex-wrap sm:flex">
            {DIMENSIONS.map(d => {
              const meta = DIMENSION_META[d];
              const score = mePlayer.bigFiveScores[d];
              return (
                <div key={d} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: meta.colorHex + '12', border: `1px solid ${meta.colorHex}22` }}>
                  <span className="text-[9px]" style={{ color: meta.colorHex }}>{meta.name}</span>
                  <span className="text-[10px] font-bold" style={{ color: meta.colorHex }}>{score.toFixed(1)}</span>
                </div>
              );
            })}
          </div>

          {/* Targets */}
          {targets && (
            <div className="hidden items-center justify-center gap-1.5 flex-wrap sm:flex">
              {DIMENSIONS.map(d => {
                const meta = DIMENSION_META[d];
                const isDone = declaredDims.has(d);
                return (
                  <div
                    key={d}
                    className="flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: isDone ? meta.colorHex + '25' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isDone ? meta.colorHex + '40' : 'rgba(200,155,93,0.14)'}`,
                    }}
                  >
                    <span className="text-[9px]" style={{ color: isDone ? meta.colorHex : 'var(--psy-muted)' }}>
                      {meta.name}
                    </span>
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: isDone ? meta.colorHex : 'var(--psy-ink-soft)' }}
                    >
                      {isDone ? '✓' : `${targets[d]}张`}
                    </span>
                  </div>
                );
              })}
              <div className="rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5">
                <span className="text-[9px] text-[var(--psy-muted)]">完成 </span>
                <span className="text-[10px] font-medium text-[var(--psy-success)]">{mePlayer.declaredSets.length}/5</span>
              </div>
            </div>
          )}

          <div className="flex shrink-0 flex-col gap-1.5 sm:hidden">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] text-[var(--psy-ink-soft)]">
              <span className="psy-serif text-[var(--psy-accent)]">第 {gameState.currentRound}{gameState.totalRounds > 0 ? `/${gameState.totalRounds}` : ''} 轮</span>
              <span className="truncate">{isMyTurn ? '轮到你' : `${currentPlayer?.name}中`}</span>
              <span>归档 {mePlayer.declaredSets.length}/5</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => setMobileSheet('persona')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">人格</button>
              <button onClick={() => setMobileSheet('declared')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">归档</button>
              <button onClick={() => setMobileSheet('log')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">记录</button>
            </div>
          </div>

          {/* Claim window — opponent discarded. First-come-first-served:
              any non-discarder may pong / pass / hu. Whoever clicks
              first wins the race. */}
          {canClaim && gameState.pendingDiscard && (
            <div className="psy-panel space-y-3 rounded-[1.35rem] border p-4">
              <div className="flex items-center justify-between">
                <h3 className="psy-serif text-sm font-medium text-[var(--psy-accent)]">
                  {gameState.players[gameState.discardedByIndex]?.name} 弃了一张牌 — 选择行动
                </h3>
                <span className="text-[10px] text-[var(--psy-muted)]">先点先得</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--psy-muted)]">被弃的牌</span>
                  <div className="rounded-xl ring-1 ring-[rgba(200,155,93,0.35)]">
                    <Card card={gameState.pendingDiscard} />
                  </div>
                </div>
                <div className="text-xs text-[var(--psy-ink-soft)]">
                  <ul className="list-disc pl-4 space-y-1 marker:text-orange-400">
                    <li>选出与弃牌同一人格的手牌后点「碰」</li>
                    <li>总张数要达到该维度要求</li>
                    <li>混入其他人格牌会受罚</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkipPong}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs font-medium"
                >
                  过
                </button>
                {canPong && (
                  <button
                    onClick={handlePong}
                    className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
                  >
                    碰！{selectedCardIds.length > 0 ? `（已选 ${selectedCardIds.length} 张）` : ''}
                  </button>
                )}
                {!meFrozen && (
                  <button
                    onClick={handleHu}
                    className="psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold"
                  >
                    食胡
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons (my turn only) */}
          {isMyTurn && gameState.phase !== 'game-over' && gameState.phase !== 'claim-window' && !viewMode && !pongIntent && (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:gap-3">
              {canDraw && (
                <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">点击牌堆抽一张牌</p>
              )}
              {isDiscarding && !gameState.drawnCard && (
                <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">
                  碰牌成功 — 请直接出一张手牌
                </p>
              )}
              {canStartView && (
                <button
                  onClick={handleStartView}
                  className="psy-btn psy-btn-ghost px-4 py-2 text-sm font-medium"
                  title="本回合可查看 2 张自己的手牌的人格"
                >
                  🔍 查看 2 张牌（{viewUsedThisTurn ? '0' : '1'}/1）
                </button>
              )}
              {viewUsedThisTurn && !viewMode && (
                <span className="text-xs text-[var(--psy-muted)]">本回合查看已用</span>
              )}
              {!meFrozen && (
                <button
                  onClick={handleHu}
                  className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
                >
                  食胡
                </button>
              )}
              {/* Self-pong button — visible only on own turn. Stays
                  enabled regardless of whether the player actually has
                  matching cards; toggling on/off would leak "you have
                  enough N-dim cards". Player decides, engine judges. */}
              <button
                onClick={() => {
                  if (meFrozen || meAlreadySelfPonged) return;
                  if (selfPongCandidates.length === 0) return;
                  setPongIntent({ type: 'self', dimension: selfPongCandidates[0] });
                  setSelectedCardIds([]);
                }}
                disabled={
                  meFrozen ||
                  meAlreadySelfPonged ||
                  selfPongCandidates.length === 0
                }
                className="psy-btn psy-btn-accent px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35"
                title={
                  meFrozen
                    ? '罚停中，本轮无法自摸碰'
                    : meAlreadySelfPonged
                    ? '本回合自摸碰已用，下回合再来'
                    : '自摸碰 · 你自己判断维度和张数'
                }
              >
                自摸碰
              </button>
            </div>
          )}

          {/* Pong-intent panel — card selection prompt */}
          {pongIntent && targets && (
            <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
              <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
                {pongIntent.type === 'self' ? '🎯 自摸碰' : '🎯 碰对方弃牌'} ·{' '}
                <span style={{ color: DIMENSION_META[pongIntent.dimension].colorHex }}>
                  {DIMENSION_META[pongIntent.dimension].name}
                </span>{' '}
                · 请精确选择{' '}
                <span className="text-white font-bold">{pongIntentRequiredSelectCount}</span> 张
                {pongIntent.type === 'self' ? '同维度牌（含刚抽到的）' : '同维度手牌（连同弃牌共凑 ' + pongIntentTarget + ' 张）'}
                （已选 <span className="text-white font-bold">{selectedCardIds.length}</span>）
              </p>
              {pongIntent.type === 'self' && selfPongCandidates.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selfPongCandidates.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setPongIntent({ type: 'self', dimension: d });
                        setSelectedCardIds([]);
                      }}
                      className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition"
                      style={{
                        borderColor: pongIntent.dimension === d
                          ? DIMENSION_META[d].colorHex
                          : 'rgba(200,155,93,0.18)',
                        backgroundColor: pongIntent.dimension === d
                          ? DIMENSION_META[d].colorHex + '20'
                          : 'rgba(255,255,255,0.02)',
                        color: pongIntent.dimension === d
                          ? DIMENSION_META[d].colorHex
                          : 'var(--psy-ink-soft)',
                      }}
                    >
                      {DIMENSION_META[d].name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setPongIntent(null); setSelectedCardIds([]); }}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
                >
                  取消
                </button>
                <button
                  onClick={handleCommitPongIntent}
                  disabled={selectedCardIds.length !== pongIntentRequiredSelectCount}
                  className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  {pongIntent.type === 'self' ? '自摸归档' : '归档判定'}
                </button>
              </div>
            </div>
          )}

          {/* View-cards mode: pick up to 2 cards from your own hand */}
          {viewMode && (
            <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
              <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
                🔍 选 2 张你想要查看的手牌（{pickedViewIds.length}/2）
              </p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleCancelView}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmView}
                  disabled={pickedViewIds.length === 0}
                  className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  查看
                </button>
              </div>
            </div>
          )}

          {/* Hand + Declared */}
          <div className="flex flex-1 items-start justify-center gap-3 sm:gap-4">
            <div className="hidden flex-shrink-0 sm:block">
              <DeclaredArea declaredSets={mePlayer.declaredSets} />
            </div>
            <div ref={handAreaRef} className="flex-1 min-w-0 overflow-visible">
              <PlayerHand
                cards={mePlayer.hand}
                drawnCard={isMyTurn ? (gameState.drawnCard ?? null) : null}
                isDiscarding={isDiscarding && !viewMode && !pongIntent}
                isDeclaring={canPong || pongIntent !== null}
                isMyTurn={isMyTurn}
                mobileCompact={true}
                selectedCardIds={selectedCardIds}
                viewedCardIds={viewedCardIds}
                viewMode={viewMode}
                pickedViewIds={pickedViewIds}
                onTogglePickView={handleTogglePickView}
                onDiscardCard={handleDiscard}
                onToggleSelect={handleToggleSelect}
                onCardHover={handleCardHover}
              />
            </div>
          </div>

          {/* Round info */}
          <div className="hidden text-center text-xs text-[var(--psy-muted)] sm:block">
            第 {gameState.currentRound}{gameState.totalRounds > 0 ? ` / ${gameState.totalRounds}` : ''} 轮
            {!isMyTurn && (
              <span className="ml-2 text-[var(--psy-muted)]">— {currentPlayer?.name} 的回合</span>
            )}
            {isMyTurn && (
              <span className="ml-2 font-medium text-[var(--psy-accent)] animate-pulse">— 轮到你了</span>
            )}
          </div>
        </div>
      )}
      {mePlayer && targets && (
        <>
          <MobileGameSheet
            title="人格刻度"
            open={mobileSheet === 'persona'}
            onClose={() => setMobileSheet(null)}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {DIMENSIONS.map((d) => {
                  const meta = DIMENSION_META[d];
                  const score = mePlayer.bigFiveScores[d];
                  const isDone = declaredDims.has(d);
                  return (
                    <div key={d} className="rounded-xl border px-3 py-2" style={{ borderColor: meta.colorHex + '33', backgroundColor: meta.colorHex + '12' }}>
                      <div className="psy-serif text-sm" style={{ color: meta.colorHex }}>{meta.name}</div>
                      <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">分数 {score.toFixed(1)} · {isDone ? '已完成' : `目标 ${targets[d]} 张`}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </MobileGameSheet>
          <MobileGameSheet
            title="已归档人格"
            open={mobileSheet === 'declared'}
            onClose={() => setMobileSheet(null)}
          >
            {mePlayer.declaredSets.length > 0 ? <DeclaredArea declaredSets={mePlayer.declaredSets} /> : <p className="text-sm text-[var(--psy-muted)]">暂时还没有完成归档的维度。</p>}
          </MobileGameSheet>
          <MobileGameSheet
            title="行动记录"
            open={mobileSheet === 'log'}
            onClose={() => setMobileSheet(null)}
          >
            <GameLog actions={gameState.actionLog as any} players={allPlayers} />
          </MobileGameSheet>
        </>
      )}
    </motion.div>
  );
}
