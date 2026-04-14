'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/useGameStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS, Dimension } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';
import { PlayerHand } from '@/components/game/PlayerHand';
import { OpponentHand } from '@/components/game/OpponentHand';
import { DrawPile } from '@/components/game/DrawPile';
import { DiscardPile } from '@/components/game/DiscardPile';
import { GameLog } from '@/components/game/GameLog';
import { GameOverModal } from '@/components/game-results/GameOverModal';
import { ArrowOverlay } from '@/components/game/ArrowOverlay';
import { FlyingCard } from '@/components/game/FlyingCard';
import { PongPanel } from '@/components/game/PongPanel';
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
    playerHu,
    playerPong,
    playerSkipPong,
    resolvePongWindow,
    executeAITurn,
    initGame,
    resetGame,
  } = useGameStore();
  const { bigFiveScores } = useAssessmentStore();
  const [aiRunning, setAiRunning] = useState(false);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Card selection state (for pong)
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);

  // Result feedback banner
  const [resultBanner, setResultBanner] = useState<{ success: boolean; message: string } | null>(null);

  // Arrow state
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
  const [arrowColor, setArrowColor] = useState('#a855f7');

  // Flying card animations
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Timer for human turn
  const isHumanActive = game?.currentPlayerIndex === 0 && (game?.phase === 'drawing' || game?.phase === 'discarding');

  // Clear selection when phase changes
  useEffect(() => {
    if (game?.phase !== 'claim-window') {
      setSelectedCardIds([]);
    }
  }, [game?.phase]);

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

  // Manual AI turn
  const runOneAITurn = useCallback(async () => {
    if (aiRunning) return;
    setAiRunning(true);
    try {
      await executeAITurn();
    } finally {
      setAiRunning(false);
    }
  }, [executeAITurn, aiRunning]);

  const showBanner = (success: boolean, message: string) => {
    setResultBanner({ success, message });
    setTimeout(() => setResultBanner(null), 3000);
  };

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

  const handleCardHover = useCallback((cardEl: HTMLElement | null) => {
    if (!cardEl) { setArrowFrom(null); return; }
    const rect = cardEl.getBoundingClientRect();
    setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top });
    setArrowColor('#ef4444');
  }, []);

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

  const handleToggleSelect = useCallback((cardId: number) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }, []);

  // Hu (胡) handler
  const handleHu = useCallback(() => {
    const beforeGame = useGameStore.getState().game;
    playerHu();
    const afterGame = useGameStore.getState().game;
    if (beforeGame && afterGame) {
      const lastAction = afterGame.actionLog[afterGame.actionLog.length - 1];
      if (lastAction?.type === 'hu-success') {
        showBanner(true, '胡了！🀄 你赢了！');
      } else if (lastAction?.type === 'hu-fail') {
        showBanner(false, '胡失败！手牌公开，跳过下轮');
      }
    }
  }, [playerHu]);

  // Pong (碰) handler
  const handlePong = useCallback((dimension: Dimension, handCardIds: number[]) => {
    const beforeGame = useGameStore.getState().game;
    playerPong(dimension, handCardIds);
    const afterGame = useGameStore.getState().game;
    setSelectedCardIds([]);
    if (beforeGame && afterGame) {
      const lastAction = afterGame.actionLog[afterGame.actionLog.length - 1];
      if (lastAction?.type === 'pong-success') {
        showBanner(true, `碰！${DIMENSION_META[dimension].name} 完成！`);
      } else if (lastAction?.type === 'pong-fail') {
        showBanner(false, '碰失败！手牌公开，跳过下轮');
      }
    }
  }, [playerPong]);

  const handleSkipPong = useCallback(async () => {
    setSelectedCardIds([]);
    setAiRunning(true);
    try { await resolvePongWindow(); } finally { setAiRunning(false); }
  }, [resolvePongWindow]);

  const handleResolvePongAI = useCallback(async () => {
    setSelectedCardIds([]);
    setAiRunning(true);
    try { await resolvePongWindow(); } finally { setAiRunning(false); }
  }, [resolvePongWindow]);

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
  const isPongWindow = game.phase === 'claim-window' && game.pendingDiscard !== null && game.discardedByIndex !== 0;
  const topDiscard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
  const targets = getTargetCounts(humanPlayer.bigFiveScores);
  const declaredDims = getDeclaredDimensions(humanPlayer);

  return (
    <div className="flex flex-1 flex-col px-4 py-4 max-w-6xl mx-auto w-full">
      <ArrowOverlay from={arrowFrom} color={arrowColor} />

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
            <DrawPile count={game.drawPile.length} canDraw={canDraw} onDraw={playerDraw} />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile topCard={topDiscard} count={game.discardPile.length} />
          </div>
        </div>
        <div className="hidden md:block w-48">
          <GameLog actions={game.actionLog} players={game.players} />
        </div>
      </div>

      {/* Human player area */}
      <div className="space-y-3">
        {/* Row 1: My personality scores */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600 mr-1">我的人格:</span>
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const score = humanPlayer.bigFiveScores[d];
            return (
              <div key={d} className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ backgroundColor: meta.colorHex + '15' }}>
                <span className="text-[10px]" style={{ color: meta.colorHex }}>{meta.name}</span>
                <span className="text-xs font-bold" style={{ color: meta.colorHex }}>{score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Row 2: Targets */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-xs text-gray-600 mr-1">目标:</span>
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const target = targets[d];
            const isDone = declaredDims.has(d);
            return (
              <div key={d} className="flex items-center gap-1 rounded-lg px-2 py-1"
                style={{ backgroundColor: isDone ? meta.colorHex + '25' : 'rgba(75,75,75,0.3)' }}
              >
                <span className="text-[10px]" style={{ color: isDone ? meta.colorHex : '#9ca3af' }}>{meta.name}</span>
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

        {/* Pong panel */}
        {isPongWindow && game.pendingDiscard && (
          <PongPanel
            pendingCard={game.pendingDiscard}
            player={humanPlayer}
            discardedByName={game.players[game.discardedByIndex]?.name ?? ''}
            selectedCardIds={selectedCardIds}
            onClaim={handlePong}
            onSkip={handleSkipPong}
            onResolveAI={handleResolvePongAI}
          />
        )}

        {/* Hand + Declared cards */}
        <div className="flex items-start justify-center gap-4">
          {humanPlayer.declaredSets.length > 0 && (
            <div className="flex-shrink-0">
              <DeclaredArea declaredSets={humanPlayer.declaredSets} />
            </div>
          )}
          <div ref={handAreaRef} className="flex-1 min-w-0">
            <PlayerHand
              cards={humanPlayer.hand}
              drawnCard={isHumanTurn ? game.drawnCard : null}
              isDiscarding={isDiscarding}
              isDeclaring={isPongWindow}
              isMyTurn={isHumanTurn}
              selectedCardIds={selectedCardIds}
              onDiscardCard={handleDiscardCard}
              onToggleSelect={handleToggleSelect}
              onCardHover={handleCardHover}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          {/* Hu button — always visible on human turn */}
          {isHumanTurn && game.phase !== 'game-over' && game.phase !== 'claim-window' && !humanPlayer.skipNextTurn && (
            <button
              onClick={handleHu}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition shadow-lg"
            >
              🀄 胡！
            </button>
          )}

          {/* AI turn button */}
          {!isHumanTurn && game.phase !== 'game-over' && game.phase !== 'claim-window' && (
            <button
              onClick={runOneAITurn}
              disabled={aiRunning}
              className="px-6 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {game.players[game.currentPlayerIndex].avatar}{' '}
              {game.players[game.currentPlayerIndex].name} 的回合 — 点击执行
            </button>
          )}
        </div>

        {isHumanActive && (
          <div className="flex items-center justify-center gap-2">
            {canDraw && (
              <p className="text-sm text-purple-400 animate-pulse">点击牌堆抽一张牌</p>
            )}
            <span className={`text-sm font-mono font-bold ${timer <= 5 ? 'text-red-400 animate-pulse' : timer <= 10 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {timer}s
            </span>
          </div>
        )}

        {/* Round info */}
        <div className="text-center text-xs text-gray-600">
          第 {game.currentRound}{game.settings.totalRounds > 0 ? ` / ${game.settings.totalRounds}` : ''} 轮
        </div>
      </div>

      {/* Game Over */}
      {game.phase === 'game-over' && (
        <GameOverModal
          players={game.players}
          onPlayAgain={() => {
            if (bigFiveScores) initGame(bigFiveScores, game.settings);
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
