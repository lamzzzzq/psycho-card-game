'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePvpStore } from '@/stores/usePvpStore';
import { SerializedPlayer, PvpAction } from '@/types/pvp';
import { GameCard, GameAction, Player, PlayerId, DeclaredSet, Dimension, DIMENSIONS } from '@/types';
import { useGameFeedback, FeedbackOverlays } from '@/components/game/FeedbackLayer';
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
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
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
                  className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
                >
                  仅返回大厅
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-gray-400 animate-pulse">等待游戏开始…</div>
              <button
                onClick={() => {
                  usePvpStore.getState().reset();
                  router.replace('/pvp');
                }}
                className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
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
  const opponents = gameState.players.filter(p => p.id !== myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myId;
  const isClaimWindow = gameState.phase === 'claim-window' && gameState.pendingDiscard !== null;
  const alreadyResponded = !!myId && (gameState.claimResponses?.includes(myId) ?? false);
  const canClaim = isClaimWindow && !isMyTurn && !alreadyResponded;
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
  }

  const removeFlyingCard = useCallback((id: number) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  function handleHu() {
    dispatchAction({ type: 'hu' });
  }

  function handlePong() {
    if (selectedCardIds.length < 2) { showBanner(false, '请先选择 2 张手牌'); return; }
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

  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current) return;
    if (hovering && canDraw) {
      const rect = drawPileRef.current.getBoundingClientRect();
      setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      setArrowFrom(null);
    }
  }, [canDraw]);

  const handleCardHover = useCallback((el: HTMLElement | null) => {
    if (!el) { setArrowFrom(null); return; }
    const rect = el.getBoundingClientRect();
    setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  // Game over screen
  if (gameState.winner) {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl">{gameState.winner === myId ? '🏆' : '😔'}</div>
          <h1 className="text-3xl font-bold text-white">
            {gameState.winner === myId ? '你赢了！' : `${winner?.name ?? '对手'} 赢了`}
          </h1>
          <div className="space-y-2">
            {gameState.players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 justify-center text-sm">
                <span className="text-gray-400">#{i + 1}</span>
                <span className={p.id === gameState.winner ? 'text-yellow-400 font-bold' : 'text-gray-300'}>
                  {p.name}
                </span>
                <span className="text-gray-500">申报 {p.declaredSets.length} 组 · 剩余 {p.handCount} 张</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.replace(`/pvp/room/${code}`)}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
            >
              再来一局
            </button>
            <button
              onClick={() => router.replace('/')}
              className="px-6 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
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
    <motion.div animate={shakeControls} className="flex flex-1 flex-col px-4 py-4 max-w-6xl mx-auto w-full">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        {opponentPlayers.map(opp => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={currentPlayer?.id === opp.id}
          />
        ))}
      </div>

      {/* Center: Draw + Discard + Log */}
      <div className="flex-1 flex items-center justify-center gap-6 my-4">
        <div className="flex items-center gap-6">
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
            />
          </div>
        </div>
        <div className="hidden md:block w-48">
          <GameLog actions={gameState.actionLog as any} players={allPlayers} />
        </div>
      </div>

      {/* My player area */}
      {mePlayer && (
        <div className="space-y-3">
          {/* Big Five scores */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600 mr-1">我的人格:</span>
            {DIMENSIONS.map(d => {
              const meta = DIMENSION_META[d];
              const score = mePlayer.bigFiveScores[d];
              return (
                <div key={d} className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: meta.colorHex + '15' }}>
                  <span className="text-[10px]" style={{ color: meta.colorHex }}>{meta.name}</span>
                  <span className="text-xs font-bold" style={{ color: meta.colorHex }}>{score.toFixed(1)}</span>
                </div>
              );
            })}
          </div>

          {/* Targets */}
          {targets && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-xs text-gray-600 mr-1">目标:</span>
              {DIMENSIONS.map(d => {
                const meta = DIMENSION_META[d];
                const isDone = declaredDims.has(d);
                return (
                  <div key={d} className="flex items-center gap-1 rounded-lg px-2 py-1"
                    style={{ backgroundColor: isDone ? meta.colorHex + '25' : 'rgba(75,75,75,0.3)' }}
                  >
                    <span className="text-[10px]" style={{ color: isDone ? meta.colorHex : '#9ca3af' }}>{meta.name}</span>
                    <span className={`text-xs font-bold ${isDone ? '' : 'text-gray-400'}`} style={isDone ? { color: meta.colorHex } : undefined}>
                      {isDone ? '✓' : `${targets[d]}张`}
                    </span>
                  </div>
                );
              })}
              <div className="rounded-lg bg-gray-800 px-2 py-1">
                <span className="text-[10px] text-gray-500">已完成 </span>
                <span className="text-xs font-bold text-emerald-400">{mePlayer.declaredSets.length}/5</span>
              </div>
            </div>
          )}

          {/* Claim window — opponent discarded, can pong or hu (once per window) */}
          {canClaim && gameState.pendingDiscard && (
            <div className="rounded-xl border border-orange-500/40 bg-orange-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-orange-300">
                  {gameState.players[gameState.discardedByIndex]?.name} 弃了一张牌 — 选择行动
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">被弃的牌</span>
                  <div className="ring-2 ring-orange-400/50 rounded-xl">
                    <Card card={gameState.pendingDiscard} />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  从手牌中选 ≥2 张同维度的牌，再点碰
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSkipPong}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-800 transition"
                >
                  过
                </button>
                <button
                  onClick={handlePong}
                  disabled={selectedCardIds.length < 2}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  碰！{selectedCardIds.length > 0 ? `(已选${selectedCardIds.length}张)` : ''}
                </button>
                <button
                  onClick={handleHu}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-orange-500 text-white hover:opacity-90 transition"
                >
                  🀄 胡！
                </button>
              </div>
            </div>
          )}

          {/* Hand + Declared */}
          <div className="flex items-start justify-center gap-4">
            {mePlayer.declaredSets.length > 0 && (
              <div className="flex-shrink-0">
                <DeclaredArea declaredSets={mePlayer.declaredSets} />
              </div>
            )}
            <div ref={handAreaRef} className="flex-1 min-w-0">
              <PlayerHand
                cards={mePlayer.hand}
                drawnCard={isMyTurn ? (gameState.drawnCard ?? null) : null}
                isDiscarding={isDiscarding}
                isDeclaring={canClaim}
                isMyTurn={isMyTurn}
                selectedCardIds={selectedCardIds}
                onDiscardCard={handleDiscard}
                onToggleSelect={handleToggleSelect}
                onCardHover={handleCardHover}
              />
            </div>
          </div>

          {/* Action buttons (my turn only) */}
          {isMyTurn && gameState.phase !== 'game-over' && gameState.phase !== 'claim-window' && (
            <div className="flex items-center justify-center gap-3">
              {canDraw && (
                <p className="text-sm text-purple-400 animate-pulse">点击牌堆抽一张牌</p>
              )}
              <button
                onClick={handleHu}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition shadow-lg"
              >
                🀄 胡！
              </button>
            </div>
          )}

          {/* Round info */}
          <div className="text-center text-xs text-gray-600">
            第 {gameState.currentRound}{gameState.totalRounds > 0 ? ` / ${gameState.totalRounds}` : ''} 轮
            {!isMyTurn && (
              <span className="ml-2 text-gray-500">— {currentPlayer?.name} 的回合</span>
            )}
            {isMyTurn && (
              <span className="ml-2 text-purple-400 font-medium animate-pulse">— 轮到你了</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
