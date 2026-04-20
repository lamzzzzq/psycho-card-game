'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePvpStore } from '@/stores/usePvpStore';
import { SerializedPlayer, PvpAction } from '@/types/pvp';
import { GameCard, GameAction, Player, PlayerId, DeclaredSet, Dimension, DIMENSIONS } from '@/types';
import {
  useGameFeedback,
  FeedbackOverlays,
  useYourTurnNotifier,
  YourTurnBanner,
} from '@/components/game/FeedbackLayer';
import { FlyingCard } from '@/components/game/FlyingCard';
import { supabase } from '@/lib/supabase';
import { leaveRoom } from '@/lib/room-api';

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
  };
}

export default function PvpGamePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const { player } = usePlayerStore();
  const { gameState, myPlayerId, isHost, sendMessage, subscribeRoom } = usePvpStore();

  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [resultBanner, setResultBanner] = useState<{ success: boolean; message: string } | null>(null);
  const [mobileSheet, setMobileSheet] = useState<'log' | 'declared' | 'persona' | null>(null);
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
  const [arrowTo, setArrowTo] = useState<{ x: number; y: number } | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const [slowLoad, setSlowLoad] = useState(false);
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
    const roomId = usePvpStore.getState().room?.id;
    if (roomId && player) {
      try { await leaveRoom(roomId, player.id); } catch {}
    } else if (player) {
      // Room object might not be hydrated yet; look it up by code.
      const { data } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle();
      if (data?.id) { try { await leaveRoom(data.id, player.id); } catch {} }
    }
    usePvpStore.getState().reset();
    router.replace('/pvp');
  }

  // Clear card selection on phase change
  useEffect(() => {
    if (gameState?.phase !== 'claim-window') setSelectedCardIds([]);
  }, [gameState?.phase]);

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
  // Bug #5: pong is only available to the downstream (next) player.
  const playerCount = gameState.players.length;
  const isDownstream = isClaimWindow &&
    (gameState.discardedByIndex + 1) % playerCount === myIndex;
  const canPong = canClaim && isDownstream && !meSerialized?.skipNextTurn;
  const canHu = (isMyTurn && gameState.phase !== 'claim-window' && !meSerialized?.skipNextTurn)
    || (canClaim && !meSerialized?.skipNextTurn);
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
    const need = Math.max(0, (targets?.[dim] ?? 2) - 1);
    if (selectedCardIds.length < need) {
      showBanner(false, '先选出你判断为同类人格描述的候选牌');
      return;
    }
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

  return (
    <motion.div animate={shakeControls} className="mx-auto flex h-[100dvh] max-w-6xl w-full flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
      <YourTurnBanner bannerKey={yourTurnKey} />
      <ArrowOverlay from={arrowFrom} to={arrowTo} color="#c89b5d" />
      {flyingCards.map((f) => (
        <FlyingCard key={f.id} from={f.from} to={f.to} text={f.text} onComplete={() => removeFlyingCard(f.id)} />
      ))}

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

      {/* Opponents */}
      <div className="mb-1 grid h-[13dvh] shrink-0 grid-cols-3 gap-2 overflow-hidden sm:mb-4 sm:h-[6.5rem] sm:gap-3">
        {opponentPlayers.map(opp => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={currentPlayer?.id === opp.id}
          />
        ))}
      </div>

      {/* Center: Draw + Discard + Log */}
      <div className="my-1 flex h-[16dvh] shrink-0 items-center justify-center gap-3 sm:my-4 sm:grid sm:h-[11rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
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
        <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
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

          {/* Claim window — opponent discarded. Pong only available to
              the downstream player (bug #5). Hu available to anyone
              non-discarder ("跳着胡"). */}
          {canClaim && gameState.pendingDiscard && (
            <div className="psy-panel space-y-3 rounded-[1.35rem] border p-4">
              <div className="flex items-center justify-between">
                <h3 className="psy-serif text-sm font-medium text-[var(--psy-accent)]">
                  {gameState.players[gameState.discardedByIndex]?.name} 弃了一张牌 — 选择行动
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[var(--psy-muted)]">被弃的牌</span>
                  <div className="rounded-xl ring-1 ring-[rgba(200,155,93,0.35)]">
                    <Card card={gameState.pendingDiscard} />
                  </div>
                </div>
                <div className="text-xs text-[var(--psy-ink-soft)]">
                  {canPong ? (() => {
                    return (
                      <ul className="list-disc pl-4 space-y-1 marker:text-orange-400">
                        <li>只选你判断为同一人格描述的手牌</li>
                        <li>总张数要达到该维度要求</li>
                        <li>混入其他人格牌会受罚</li>
                      </ul>
                    );
                  })() : '你不是下家，仅可选择 过 或 食胡'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkipPong}
                  className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs font-medium"
                >
                  过
                </button>
                {canPong && (() => {
                  const dim = 'dimension' in gameState.pendingDiscard!
                    ? (gameState.pendingDiscard as any).dimension as Dimension
                    : null;
                  const need = dim ? Math.max(0, (targets?.[dim] ?? 2) - 1) : 2;
                  return (
                    <button
                      onClick={handlePong}
                      disabled={selectedCardIds.length < need}
                      className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
                    >
                      碰！{need > 0 && selectedCardIds.length > 0 ? `(已选${selectedCardIds.length}/${need})` : ''}
                    </button>
                  );
                })()}
                {!meSerialized?.skipNextTurn && (
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
          {isMyTurn && gameState.phase !== 'game-over' && gameState.phase !== 'claim-window' && (
            <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-3">
              {canDraw && (
                <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">点击牌堆抽一张牌</p>
              )}
              {isDiscarding && !gameState.drawnCard && (
                <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">
                  碰牌成功 — 请直接出一张手牌
                </p>
              )}
              {!meSerialized?.skipNextTurn && (
                <button
                  onClick={handleHu}
                  className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
                >
                  食胡
                </button>
              )}
            </div>
          )}

          {/* Hand + Declared */}
          <div className="flex min-h-0 flex-1 items-start justify-center gap-3 sm:h-[30dvh] sm:flex-none sm:gap-4">
            <div className="hidden flex-shrink-0 sm:block">
              <DeclaredArea declaredSets={mePlayer.declaredSets} />
            </div>
            <div ref={handAreaRef} className="min-h-0 flex-1 min-w-0 overflow-visible">
              <PlayerHand
                cards={mePlayer.hand}
                drawnCard={isMyTurn ? (gameState.drawnCard ?? null) : null}
                isDiscarding={isDiscarding}
                isDeclaring={canPong}
                isMyTurn={isMyTurn}
                mobileCompact={true}
                selectedCardIds={selectedCardIds}
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
