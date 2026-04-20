'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/useGameStore';
import {
  useGameFeedback,
  FeedbackOverlays,
  useYourTurnNotifier,
  YourTurnBanner,
} from '@/components/game/FeedbackLayer';
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
import { MobileGameSheet } from '@/components/game/MobileGameSheet';

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
  const [mobileSheet, setMobileSheet] = useState<'log' | 'declared' | 'persona' | null>(null);

  // Result feedback banner
  const [resultBanner, setResultBanner] = useState<{ success: boolean; message: string } | null>(null);

  // Arrow state
  const [arrowFrom, setArrowFrom] = useState<{ x: number; y: number } | null>(null);
  const [arrowTo, setArrowTo] = useState<{ x: number; y: number } | null>(null);
  const [arrowColor, setArrowColor] = useState('#a855f7');

  // Flying card animations
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Timer for human turn
  const isHumanActive = game?.currentPlayerIndex === 0 && (game?.phase === 'drawing' || game?.phase === 'discarding');

  const { shakeControls, flashControls, pops } = useGameFeedback(
    game?.actionLog ?? [],
    game?.players ?? []
  );

  // Your-turn banner: fires each time the turn becomes the human's (index 0)
  const yourTurnKey = useYourTurnNotifier(
    game?.currentPlayerIndex,
    game?.currentPlayerIndex === 0 && (game?.phase === 'drawing' || game?.phase === 'discarding')
  );

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
            } else if (g.phase === 'discarding') {
              // Normal discard (with drawnCard) OR post-pong forced discard
              // (drawnCard=null, pick from hand only — bug #7).
              const human = g.players[0];
              const allCards = g.drawnCard
                ? [...human.hand, g.drawnCard]
                : [...human.hand];
              if (allCards.length > 0) {
                const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
                useGameStore.getState().playerDiscard(randomCard.id);
              }
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setArrowFrom(null);
      setArrowTo(null);
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

  useEffect(() => {
    if (!game) return;
    if (aiRunning) return;
    if (game.phase === 'game-over' || game.phase === 'claim-window') return;
    if (game.currentPlayerIndex === 0) return;

    const timer = window.setTimeout(() => {
      void runOneAITurn();
    }, 280);

    return () => window.clearTimeout(timer);
  }, [game?.currentPlayerIndex, game?.phase, game?.actionLog.length, aiRunning, runOneAITurn, game]);

  useEffect(() => {
    if (!game) return;
    if (aiRunning) return;
    if (game.phase !== 'claim-window') return;
    if (game.discardedByIndex !== 0) return;

    const timer = window.setTimeout(async () => {
      setAiRunning(true);
      try {
        await resolvePongWindow();
      } finally {
        setAiRunning(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [game?.phase, game?.discardedByIndex, game?.pendingDiscard?.id, aiRunning, resolvePongWindow, game]);

  const showBanner = (success: boolean, message: string) => {
    setResultBanner({ success, message });
    setTimeout(() => setResultBanner(null), 3000);
  };

  // Draw pile hover
  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current || !handAreaRef.current) return;
    if (hovering && game?.phase === 'drawing' && game.currentPlayerIndex === 0) {
      const fromRect = drawPileRef.current.getBoundingClientRect();
      const toRect = handAreaRef.current.getBoundingClientRect();
      setArrowFrom({ x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 });
      setArrowTo({ x: toRect.left + toRect.width / 2, y: toRect.top + Math.min(40, toRect.height * 0.35) });
      setArrowColor('#c89b5d');
    } else {
      setArrowFrom(null);
      setArrowTo(null);
    }
  }, [game?.phase, game?.currentPlayerIndex]);

  const handleCardHover = useCallback((cardEl: HTMLElement | null) => {
    if (!cardEl || !discardPileRef.current) { setArrowFrom(null); setArrowTo(null); return; }
    const rect = cardEl.getBoundingClientRect();
    const discardRect = discardPileRef.current.getBoundingClientRect();
    setArrowFrom({ x: rect.left + rect.width / 2, y: rect.top });
    setArrowTo({ x: discardRect.left + discardRect.width / 2, y: discardRect.top + discardRect.height / 2 });
    setArrowColor('#c89b5d');
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
    setArrowTo(null);
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
        showBanner(true, '食胡！你赢了！');
      } else if (lastAction?.type === 'hu-fail') {
        showBanner(false, '食胡失败！手牌公开，罚停一轮');
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
    // Register the human's pass first so allClaimersResponded can fire,
    // then drive the AI responses.
    const g = useGameStore.getState().game;
    if (g && g.phase === 'claim-window') {
      const humanId = g.players[0]?.id;
      if (humanId && !g.claimResponses.includes(humanId) && g.discardedByIndex !== 0) {
        playerSkipPong();
      }
    }
    setAiRunning(true);
    try { await resolvePongWindow(); } finally { setAiRunning(false); }
  }, [resolvePongWindow, playerSkipPong]);

  const handleResolvePongAI = useCallback(async () => {
    setSelectedCardIds([]);
    // Auto-countdown expired — also register human's implicit pass.
    const g = useGameStore.getState().game;
    if (g && g.phase === 'claim-window') {
      const humanId = g.players[0]?.id;
      if (humanId && !g.claimResponses.includes(humanId) && g.discardedByIndex !== 0) {
        playerSkipPong();
      }
    }
    setAiRunning(true);
    try { await resolvePongWindow(); } finally { setAiRunning(false); }
  }, [resolvePongWindow, playerSkipPong]);

  if (!game) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">加载中…</p>
      </div>
    );
  }

  const humanPlayer = game.players[0];
  const opponents = game.players.slice(1);
  const isHumanTurn = game.currentPlayerIndex === 0;
  const canDraw = isHumanTurn && game.phase === 'drawing';
  const isDiscarding = isHumanTurn && game.phase === 'discarding';
  const isPongWindow = game.phase === 'claim-window' && game.pendingDiscard !== null && game.discardedByIndex !== 0;
  // Bug #5: pong is only offered to the downstream player. Human is index 0.
  const isDownstream =
    game.phase === 'claim-window' &&
    (game.discardedByIndex + 1) % game.players.length === 0;
  const canHu =
    game.phase !== 'game-over' &&
    !humanPlayer.skipNextTurn &&
    (
      (isHumanTurn && game.phase !== 'claim-window') ||
      (game.phase === 'claim-window' &&
        game.discardedByIndex !== 0 &&
        !game.claimResponses.includes(humanPlayer.id))
    );
  const topDiscard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
  const targets = getTargetCounts(humanPlayer.bigFiveScores);
  const declaredDims = getDeclaredDimensions(humanPlayer);

  return (
    <motion.div animate={shakeControls} className="mx-auto flex h-[100dvh] max-w-6xl w-full flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
      <YourTurnBanner bannerKey={yourTurnKey} />
      <ArrowOverlay from={arrowFrom} to={arrowTo} color={arrowColor} />

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
      <div className="mb-1 grid h-[13dvh] shrink-0 grid-cols-3 gap-2 overflow-hidden sm:mb-4 sm:h-[6.5rem] sm:gap-3">
        {opponents.map((opp) => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={game.players[game.currentPlayerIndex].id === opp.id}
          />
        ))}
      </div>

      {/* Center: Draw pile + Discard pile + Game log */}
      <div className="my-1 flex h-[16dvh] shrink-0 items-center justify-center gap-3 sm:my-4 sm:grid sm:h-[11rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <div className="flex items-center gap-3 sm:col-start-2 sm:gap-6">
          <div
            ref={drawPileRef}
            onMouseEnter={() => handleDrawPileHover(true)}
            onMouseLeave={() => handleDrawPileHover(false)}
          >
            <DrawPile count={game.drawPile.length} canDraw={canDraw} onDraw={playerDraw} />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile
              topCard={topDiscard}
              count={game.discardPile.length}
              discardPile={game.discardPile}
              actions={game.actionLog}
              players={game.players}
            />
          </div>
        </div>
        <div className="hidden md:block md:col-start-3 md:justify-self-end w-52">
          <GameLog actions={game.actionLog} players={game.players} />
        </div>
      </div>

      {/* Human player area */}
      <div className="flex min-h-0 flex-1 flex-col space-y-2 sm:space-y-3">
        {/* Row 1: My personality scores */}
        <div className="hidden shrink-0 items-center justify-center gap-1.5 flex-wrap sm:flex">
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const score = humanPlayer.bigFiveScores[d];
            return (
              <div key={d} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: meta.colorHex + '12', border: `1px solid ${meta.colorHex}22` }}>
                <span className="text-[9px]" style={{ color: meta.colorHex }}>{meta.name}</span>
                <span className="text-[10px] font-bold" style={{ color: meta.colorHex }}>{score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Row 2: Targets */}
        <div className="hidden shrink-0 items-center justify-center gap-1.5 flex-wrap sm:flex">
          {DIMENSIONS.map((d) => {
            const meta = DIMENSION_META[d];
            const target = targets[d];
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
                  {isDone ? '✓' : `${target}张`}
                </span>
              </div>
            );
          })}
          <div className="rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5">
            <span className="text-[9px] text-[var(--psy-muted)]">完成 </span>
            <span className="text-[10px] font-medium text-[var(--psy-success)]">{humanPlayer.declaredSets.length}/5</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:hidden">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] text-[var(--psy-ink-soft)]">
            <span className="psy-serif text-[var(--psy-accent)]">第 {game.currentRound}{game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''} 轮</span>
            <span className="truncate">已完成 {humanPlayer.declaredSets.length}/5</span>
            <span className={`font-mono tabular-nums ${timer <= 5 ? 'text-[var(--psy-danger)]' : 'text-[var(--psy-accent)]'}`}>{timer}s</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setMobileSheet('persona')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">人格</button>
            <button onClick={() => setMobileSheet('declared')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">归档</button>
            <button onClick={() => setMobileSheet('log')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">记录</button>
          </div>
        </div>

        {/* Pong panel — only shown to the downstream player (bug #5) */}
        {isPongWindow && isDownstream && game.pendingDiscard && (
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
        {/* Non-downstream claim hint (hu-only path) */}
        {isPongWindow && !isDownstream && game.pendingDiscard &&
          !game.claimResponses.includes(humanPlayer.id) && (
            <div className="psy-panel flex shrink-0 items-center justify-center gap-3 rounded-[1.35rem] border p-3 flex-wrap">
              <p className="max-w-3xl text-xs text-[var(--psy-accent)]">
                {game.players[game.discardedByIndex]?.name} 弃了一张牌 —
                你不是下家，不能碰。如要食胡请在下方点「食胡」。
              </p>
              <button
                onClick={handleSkipPong}
                className="psy-btn psy-btn-ghost shrink-0 px-3 py-1.5 text-xs"
              >
                过
              </button>
            </div>
          )}

        {/* Action buttons */}
        <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-3">
          {/* Hu button — visible on own turn, or during an opponent's
              claim-window ("跳着胡"). Hidden when the human has already
              responded to this claim window. */}
          {canHu && (
            <button
              onClick={handleHu}
              className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
            >
              食胡
            </button>
          )}

          {/* AI turn button */}
          {!isHumanTurn && game.phase !== 'game-over' && game.phase !== 'claim-window' && (
            <button
              onClick={runOneAITurn}
              disabled={aiRunning}
              className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
            >
              {game.players[game.currentPlayerIndex].avatar}{' '}
              {game.players[game.currentPlayerIndex].name} 的回合 — 点击执行
            </button>
          )}
        </div>

        {/* Hand + Declared cards */}
        <div className="flex min-h-0 flex-1 items-start justify-center gap-3 sm:h-[30dvh] sm:flex-none sm:gap-4">
          <div className="hidden flex-shrink-0 sm:block">
            <DeclaredArea declaredSets={humanPlayer.declaredSets} />
          </div>
          <div ref={handAreaRef} className="min-h-0 flex-1 min-w-0 overflow-visible">
            <PlayerHand
              cards={humanPlayer.hand}
              drawnCard={isHumanTurn ? game.drawnCard : null}
              isDiscarding={isDiscarding}
              isDeclaring={isPongWindow && isDownstream}
              isMyTurn={isHumanTurn}
              mobileCompact
              selectedCardIds={selectedCardIds}
              onDiscardCard={handleDiscardCard}
              onToggleSelect={handleToggleSelect}
              onCardHover={handleCardHover}
            />
          </div>
        </div>

        {isHumanActive && (
          <div className="hidden items-center justify-center gap-2 sm:flex">
            {canDraw && (
              <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">点击牌堆抽一张牌</p>
            )}
            {isDiscarding && !game.drawnCard && (
              <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">
                碰牌成功 — 请直接出一张手牌
              </p>
            )}
            <span className={`text-sm font-mono font-bold ${timer <= 5 ? 'text-red-300 animate-pulse' : timer <= 10 ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-muted)]'}`}>
              {timer}s
            </span>
          </div>
        )}

        {/* Round info */}
        <div className="hidden text-center text-xs text-[var(--psy-muted)] sm:block">
          第 {game.currentRound}{game.settings.totalRounds > 0 ? ` / ${game.settings.totalRounds}` : ''} 轮
        </div>
      </div>

      <MobileGameSheet
        title="人格刻度"
        open={mobileSheet === 'persona'}
        onClose={() => setMobileSheet(null)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => {
              const meta = DIMENSION_META[d];
              const score = humanPlayer.bigFiveScores[d];
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
        {humanPlayer.declaredSets.length > 0 ? <DeclaredArea declaredSets={humanPlayer.declaredSets} /> : <p className="text-sm text-[var(--psy-muted)]">暂时还没有完成归档的维度。</p>}
      </MobileGameSheet>
      <MobileGameSheet
        title="行动记录"
        open={mobileSheet === 'log'}
        onClose={() => setMobileSheet(null)}
      >
        <GameLog actions={game.actionLog} players={game.players} />
      </MobileGameSheet>

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
    </motion.div>
  );
}
