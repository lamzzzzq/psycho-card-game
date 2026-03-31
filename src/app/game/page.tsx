'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/useGameStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS, Dimension } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions, getRankings } from '@/lib/game-logic';
import { PlayerHand } from '@/components/game/PlayerHand';
import { OpponentHand } from '@/components/game/OpponentHand';
import { DrawPile } from '@/components/game/DrawPile';
import { DiscardPile } from '@/components/game/DiscardPile';
import { GameLog } from '@/components/game/GameLog';
import { GameOverModal } from '@/components/game-results/GameOverModal';
import { ArrowOverlay } from '@/components/game/ArrowOverlay';
import { FlyingCard } from '@/components/game/FlyingCard';
import { DeclarePanel } from '@/components/game/DeclarePanel';
import { DeclaredArea } from '@/components/game/DeclaredArea';

interface FlyingAnim {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  text: string;
}

export default function GamePage() {
  const router = useRouter();
  const {
    game,
    playerDraw,
    playerDiscard,
    playerDeclare,
    playerSkipDeclare,
    executeAITurn,
    initGame,
    resetGame,
  } = useGameStore();
  const { bigFiveScores } = useAssessmentStore();
  const aiRunningRef = useRef(false);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DECLARE selection state
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);

  // DECLARE result feedback
  const [declareResult, setDeclareResult] = useState<{ success: boolean; message: string } | null>(null);

  // Arrow state
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
  const [arrowColor, setArrowColor] = useState('#a855f7');

  // Flying card animations
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Timer for human turn (drawing + discarding phases)
  const isHumanActive = game?.currentPlayerIndex === 0 && (game?.phase === 'drawing' || game?.phase === 'discarding');

  // Clear selection when phase changes
  useEffect(() => {
    if (game?.phase !== 'declaring') {
      setSelectedCardIds([]);
    }
  }, [game?.phase]);

  // Auto-skip human turn when skipNextTurn is true
  useEffect(() => {
    if (!game || game.phase !== 'declaring') return;
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.isHuman && currentPlayer.skipNextTurn) {
      // Auto-advance: clear skip flag and move to next player
      const skipAction = {
        round: game.currentRound,
        playerId: currentPlayer.id,
        type: 'skip' as const,
        timestamp: Date.now(),
      };
      const newPlayers = game.players.map((p, i) =>
        i === game.currentPlayerIndex ? { ...p, skipNextTurn: false } : p
      );
      const nextPlayerIndex = (game.currentPlayerIndex + 1) % 4;
      const isRoundEnd = nextPlayerIndex === 0;
      const nextRound = isRoundEnd ? game.currentRound + 1 : game.currentRound;
      const isGameOver = isRoundEnd && nextRound > game.settings.totalRounds;

      setTimeout(() => {
        useGameStore.setState({
          game: {
            ...game,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            currentRound: nextRound,
            phase: isGameOver ? 'game-over' : 'declaring',
            actionLog: [...game.actionLog, skipAction],
            winner: isGameOver ? getRankings(newPlayers)[0].id : null,
          },
        });
      }, 500);
    }
  }, [game?.phase, game?.currentPlayerIndex, game]);

  useEffect(() => {
    if (isHumanActive) {
      setTimer(30);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            const g = useGameStore.getState().game;
            if (!g) return 0;
            if (g.phase === 'drawing') {
              useGameStore.getState().playerDraw();
            } else if (g.phase === 'discarding' && g.drawnCard) {
              const human = g.players[0];
              const allCards = [...human.hand, g.drawnCard];
              const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
              useGameStore.getState().playerDiscard(randomCard.id);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setArrowFrom(null);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHumanActive, game?.phase, game?.currentRound]);

  // Redirect if no game
  useEffect(() => {
    if (!game) {
      router.push(bigFiveScores ? '/lobby' : '/');
    }
  }, [game, bigFiveScores, router]);

  // Manual AI turn — one at a time, triggered by button
  const runOneAITurn = useCallback(async () => {
    if (aiRunningRef.current) return;
    aiRunningRef.current = true;
    await executeAITurn();
    aiRunningRef.current = false;
  }, [executeAITurn]);

  // Draw pile hover
  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current) return;
    if (hovering && game?.phase === 'drawing' && game.currentPlayerIndex === 0) {
      const rect = drawPileRef.current.getBoundingClientRect();
      setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setArrowColor('#a855f7');
    } else {
      setArrowFrom(null);
    }
  }, [game?.phase, game?.currentPlayerIndex]);

  // Card hover during discard
  const handleCardHover = useCallback((cardEl: HTMLElement | null) => {
    if (!cardEl) {
      setArrowFrom(null);
      return;
    }
    const rect = cardEl.getBoundingClientRect();
    setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top });
    setArrowColor('#ef4444');
  }, []);

  // Discard card with flying animation
  const handleDiscardCard = useCallback((cardId: number) => {
    const g = useGameStore.getState().game;
    if (!g) return;
    const allCards = [...g.players[0].hand, ...(g.drawnCard ? [g.drawnCard] : [])];
    const card = allCards.find((c) => c.id === cardId);

    if (discardPileRef.current && card) {
      const cardEls = handAreaRef.current?.querySelectorAll('[data-card-id]');
      let fromRect: DOMRect | null = null;
      cardEls?.forEach((el) => {
        if (el.getAttribute('data-card-id') === String(cardId)) {
          fromRect = el.getBoundingClientRect();
        }
      });
      const toRect = discardPileRef.current.getBoundingClientRect();

      if (fromRect) {
        const fr = fromRect as DOMRect;
        const id = flyIdRef.current++;
        setFlyingCards((prev) => [...prev, {
          id,
          from: { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 },
          to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
          text: card.text,
        }]);
      }
    }

    playerDiscard(cardId);
    setArrowFrom(null);
  }, [playerDiscard]);

  const removeFlyingCard = useCallback((id: number) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Toggle card selection for DECLARE
  const handleToggleSelect = useCallback((cardId: number) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }, []);

  // Handle DECLARE with feedback
  const handleDeclare = useCallback((dimension: Dimension, cardIds: number[]) => {
    const beforeGame = useGameStore.getState().game;
    playerDeclare(dimension, cardIds);
    const afterGame = useGameStore.getState().game;
    setSelectedCardIds([]);

    if (beforeGame && afterGame) {
      const lastAction = afterGame.actionLog[afterGame.actionLog.length - 1];
      if (lastAction?.type === 'declare-success') {
        setDeclareResult({
          success: true,
          message: `DECLARE ${DIMENSION_META[dimension].name} 成功！${cardIds.length} 张牌已摆出`,
        });
      } else if (lastAction?.type === 'declare-fail') {
        setDeclareResult({
          success: false,
          message: `DECLARE 失败！${cardIds.length} 张牌被弃掉，下轮跳过`,
        });
      }
      setTimeout(() => setDeclareResult(null), 3000);
    }
  }, [playerDeclare]);

  // Handle skip declare
  const handleSkipDeclare = useCallback(() => {
    playerSkipDeclare();
    setSelectedCardIds([]);
  }, [playerSkipDeclare]);

  if (!game) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  const humanPlayer = game.players[0];
  const opponents = game.players.slice(1);
  const isHumanTurn = game.currentPlayerIndex === 0;
  const canDraw = isHumanTurn && game.phase === 'drawing';
  const isDiscarding = isHumanTurn && game.phase === 'discarding';
  const isDeclaring = isHumanTurn && game.phase === 'declaring' && !humanPlayer.skipNextTurn;
  const topDiscard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
  const targets = getTargetCounts(humanPlayer.bigFiveScores);
  const declaredDims = getDeclaredDimensions(humanPlayer);

  return (
    <div className="flex flex-1 flex-col px-4 py-4 max-w-6xl mx-auto w-full">
      {/* Arrow overlay */}
      <ArrowOverlay from={arrowFrom} color={arrowColor} />

      {/* DECLARE result banner */}
      {declareResult && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-bold shadow-2xl animate-bounce ${
          declareResult.success
            ? 'bg-emerald-500/90 text-white border border-emerald-400'
            : 'bg-red-500/90 text-white border border-red-400'
        }`}>
          {declareResult.success ? '✅' : '❌'} {declareResult.message}
        </div>
      )}

      {/* Flying card animations */}
      {flyingCards.map((f) => (
        <FlyingCard key={f.id} from={f.from} to={f.to} text={f.text} onComplete={() => removeFlyingCard(f.id)} />
      ))}

      {/* Opponents */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {opponents.map((opp) => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={game.players[game.currentPlayerIndex].id === opp.id}
            infoMode={game.settings.infoMode}
          />
        ))}
      </div>

      {/* Center: Draw pile + Discard pile + Game log */}
      <div className="flex-1 flex items-center justify-center gap-6 my-4">
        <div className="flex items-center gap-6">
          <div
            ref={drawPileRef}
            onMouseEnter={() => handleDrawPileHover(true)}
            onMouseLeave={() => handleDrawPileHover(false)}
          >
            <DrawPile
              count={game.drawPile.length}
              canDraw={canDraw}
              onDraw={playerDraw}
            />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile topCard={topDiscard} count={game.discardPile.length} />
          </div>
        </div>

        <div className="hidden md:block w-48">
          <GameLog actions={game.actionLog} players={game.players} />
        </div>
      </div>

      {/* Human player hand + personality panel */}
      <div className="space-y-3">
        {/* Row 1: My personality scores */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600 mr-1">我的人格:</span>
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const score = humanPlayer.bigFiveScores[d];
            return (
              <div
                key={d}
                className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{ backgroundColor: meta.colorHex + '15' }}
              >
                <span className="text-[10px]" style={{ color: meta.colorHex }}>{meta.name}</span>
                <span className="text-xs font-bold" style={{ color: meta.colorHex }}>{score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Row 2: DECLARE targets */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600 mr-1">DECLARE 目标:</span>
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const target = targets[d];
            const isDone = declaredDims.has(d);
            return (
              <div
                key={d}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 ${
                  isDone ? 'ring-1' : ''
                }`}
                style={{
                  backgroundColor: isDone ? meta.colorHex + '25' : 'rgba(75,75,75,0.3)',
                  // @ts-expect-error -- Tailwind ring-color via CSS custom property
                  '--tw-ring-color': isDone ? meta.colorHex : undefined,
                }}
              >
                <span className="text-[10px]" style={{ color: isDone ? meta.colorHex : '#9ca3af' }}>
                  {meta.name}
                </span>
                <span className={`text-xs font-bold ${isDone ? '' : 'text-gray-400'}`} style={isDone ? { color: meta.colorHex } : undefined}>
                  {isDone ? '✓' : `${target}张`}
                </span>
              </div>
            );
          })}
          <div className="rounded-lg bg-gray-800 px-2 py-1">
            <span className="text-[10px] text-gray-500">已完成 </span>
            <span className="text-xs font-bold text-emerald-400">{humanPlayer.declaredSets.length}/5</span>
          </div>
        </div>

        {/* Declared sets display */}
        {humanPlayer.declaredSets.length > 0 && (
          <div className="flex justify-center">
            <DeclaredArea declaredSets={humanPlayer.declaredSets} />
          </div>
        )}

        {/* DECLARE panel (when it's declaring phase) */}
        {isDeclaring && (
          <DeclarePanel
            player={humanPlayer}
            selectedCardIds={selectedCardIds}
            onDeclare={handleDeclare}
            onSkip={handleSkipDeclare}
          />
        )}

        <div ref={handAreaRef}>
          <PlayerHand
            cards={humanPlayer.hand}
            drawnCard={isHumanTurn ? game.drawnCard : null}
            isDiscarding={isDiscarding}
            isDeclaring={isDeclaring}
            selectedCardIds={selectedCardIds}
            onDiscardCard={handleDiscardCard}
            onToggleSelect={handleToggleSelect}
            onCardHover={handleCardHover}
          />
        </div>

        {/* AI turn button */}
        {!isHumanTurn && game.phase !== 'game-over' && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={runOneAITurn}
              disabled={aiRunningRef.current}
              className="px-6 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {game.players[game.currentPlayerIndex].avatar}{' '}
              {game.players[game.currentPlayerIndex].name} 的回合 — 点击执行
            </button>
          </div>
        )}
        {isHumanActive && (
          <div className="flex items-center justify-center gap-2">
            {canDraw && (
              <p className="text-sm text-purple-400 animate-pulse">
                点击牌堆抽一张牌
              </p>
            )}
            <span className={`text-sm font-mono font-bold ${timer <= 5 ? 'text-red-400 animate-pulse' : timer <= 10 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {timer}s
            </span>
          </div>
        )}

        {/* Round info */}
        <div className="text-center text-xs text-gray-600">
          第 {game.currentRound} / {game.settings.totalRounds} 轮
        </div>
      </div>

      {/* Game Over Modal */}
      {game.phase === 'game-over' && (
        <GameOverModal
          players={game.players}
          onPlayAgain={() => {
            if (bigFiveScores) {
              initGame(bigFiveScores, game.settings);
            }
          }}
          onBackToLobby={() => {
            resetGame();
            router.push('/lobby');
          }}
        />
      )}
    </div>
  );
}
