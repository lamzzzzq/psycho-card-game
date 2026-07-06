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
  turnNudge,
} from '@/components/game/FeedbackLayer';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS, Dimension, isPersonalityCard } from '@/types';
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
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

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
    playerSelfPong,
    playerSkipPong,
    resolvePongWindow,
    executeAITurn,
    initGame,
    resetGame,
  } = useGameStore();
  const { bigFiveScores } = useAssessmentStore();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const tg = STRINGS[locale].game;
  const dimName = (d: Dimension) => (locale === 'en' ? DIMENSION_META[d].nameEn : DIMENSION_META[d].name);
  const [aiRunning, setAiRunning] = useState(false);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Card selection state (for pong)
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [mobileSheet, setMobileSheet] = useState<'log' | 'declared' | 'persona' | null>(null);
  // "View 2 cards" feature: 1 use per own turn. Resets when active player changes.
  const [viewMode, setViewMode] = useState(false);
  const [pickedViewIds, setPickedViewIds] = useState<number[]>([]);
  const [viewedCardIds, setViewedCardIds] = useState<number[]>([]);
  const [viewUsedThisTurn, setViewUsedThisTurn] = useState(false);

  // Result feedback banner
  const [resultBanner, setResultBanner] = useState<{ success: boolean; message: string } | null>(null);
  // Exit-confirmation modal
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  // Pong intent — when user clicks the main-area 「碰」 button, this opens
  // a card-selection flow. type='self' for 自摸碰 (own turn), 'other' for
  // claiming an opponent's discard.
  const [pongIntent, setPongIntent] = useState<{
    type: 'self' | 'other';
    dimension: Dimension;
  } | null>(null);

  // Arrow state — 存「取点函数」而非静态坐标，ArrowOverlay 每帧重算 → 跟随滚动。
  type Pt = { x: number; y: number };
  const [arrowFrom, setArrowFrom] = useState<(() => Pt | null) | null>(null);
  const [arrowTo, setArrowTo] = useState<(() => Pt | null) | null>(null);
  const [arrowColor, setArrowColor] = useState('#a855f7');

  // 单人 idle 提醒：本回合超过一定时间未行动时，弹「輪到你」toast + 屏幕震动。
  const [idleReminderVisible, setIdleReminderVisible] = useState(false);
  const lastNudgeRef = useRef<number | null>(null);

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

  // Clear pong intent when turn/phase context changes — keeps the modal
  // invariant honest.
  useEffect(() => {
    setPongIntent(null);
    setSelectedCardIds([]);
  }, [game?.currentPlayerIndex, game?.phase]);

  // Reset view-cards state on turn change
  useEffect(() => {
    setViewMode(false);
    setPickedViewIds([]);
    setViewedCardIds([]);
    setViewUsedThisTurn(false);
  }, [game?.currentPlayerIndex, game?.currentRound]);

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

  // idle 提醒：本回合还剩 15s / 6s 仍未行动时，震动 + 弹 toast（每个阈值只触发一次）。
  useEffect(() => {
    if (!isHumanActive) {
      lastNudgeRef.current = null;
      setIdleReminderVisible(false);
      return;
    }
    if ((timer === 15 || timer === 6) && lastNudgeRef.current !== timer) {
      lastNudgeRef.current = timer;
      turnNudge(shakeControls);
      setIdleReminderVisible(true);
      const h = window.setTimeout(() => setIdleReminderVisible(false), 2500);
      return () => window.clearTimeout(h);
    }
  }, [timer, isHumanActive, shakeControls]);

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
    // AI 響應窗口的驅動條件：人類已經「表過態」——
    //   a) 人類是棄牌者（本來就不參與響應），或
    //   b) 人類已在 claimResponses 裏（點過按鈕，或被罰停時由
    //      autoSkipPenalizedClaimers 自動補了跳過）。
    // 之前只驅動 (a)：人類被罰停時 AI 棄牌開窗 → 人類被引擎自動跳過、
    // UI 也沒按鈕可點 → 沒有任何路徑去跑 resolvePongWindow → 全桌永久卡死。
    const humanId = game.players[0]?.id;
    const humanDone =
      game.discardedByIndex === 0 ||
      (humanId != null && game.claimResponses.includes(humanId));
    if (!humanDone) return;

    const timer = window.setTimeout(async () => {
      setAiRunning(true);
      try {
        await resolvePongWindow();
      } finally {
        setAiRunning(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [game?.phase, game?.discardedByIndex, game?.pendingDiscard?.id, game?.claimResponses.length, aiRunning, resolvePongWindow, game]);

  const showBanner = (success: boolean, message: string) => {
    setResultBanner({ success, message });
    setTimeout(() => setResultBanner(null), 3000);
  };

  // Draw pile hover — 取点函数读 ref.current，每帧实时算，滚动时箭头跟着动。
  const handleDrawPileHover = useCallback((hovering: boolean) => {
    if (!drawPileRef.current || !handAreaRef.current) return;
    if (hovering && game?.phase === 'drawing' && game.currentPlayerIndex === 0) {
      setArrowFrom(() => () => {
        const r = drawPileRef.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      });
      setArrowTo(() => () => {
        const r = handAreaRef.current?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + Math.min(40, r.height * 0.35) } : null;
      });
      setArrowColor('#c89b5d');
    } else {
      setArrowFrom(null);
      setArrowTo(null);
    }
  }, [game?.phase, game?.currentPlayerIndex]);

  const handleCardHover = useCallback((cardEl: HTMLElement | null) => {
    if (!cardEl || !discardPileRef.current) { setArrowFrom(null); setArrowTo(null); return; }
    setArrowFrom(() => () => {
      const r = cardEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    });
    setArrowTo(() => () => {
      const r = discardPileRef.current?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    });
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
        showBanner(true, tg.toastHuWin);
      } else if (lastAction?.type === 'hu-fail') {
        showBanner(false, tg.toastHuFail);
      }
    }
  }, [playerHu, tg]);

  // Self-pong (自摸碰) commit handler
  const handleSelfPongCommit = useCallback(() => {
    if (!pongIntent || pongIntent.type !== 'self') return;
    const beforeGame = useGameStore.getState().game;
    playerSelfPong(pongIntent.dimension, selectedCardIds);
    const afterGame = useGameStore.getState().game;
    setSelectedCardIds([]);
    setPongIntent(null);
    if (beforeGame && afterGame) {
      const lastAction = afterGame.actionLog[afterGame.actionLog.length - 1];
      if (lastAction?.type === 'pong-success') {
        showBanner(true, `${tg.toastSelfPongPrefix}${dimName(pongIntent.dimension)}${tg.toastDoneSuffix}`);
      } else if (lastAction?.type === 'pong-fail') {
        showBanner(false, tg.toastSelfPongFail);
      }
    }
  }, [playerSelfPong, pongIntent, selectedCardIds, tg, locale]);

  // Pong (碰) handler
  const handlePong = useCallback((dimension: Dimension, handCardIds: number[]) => {
    const beforeGame = useGameStore.getState().game;
    playerPong(dimension, handCardIds);
    const afterGame = useGameStore.getState().game;
    setSelectedCardIds([]);
    if (beforeGame && afterGame) {
      const lastAction = afterGame.actionLog[afterGame.actionLog.length - 1];
      if (lastAction?.type === 'pong-success') {
        showBanner(true, `${tg.toastPongPrefix}${dimName(dimension)}${tg.toastDoneSuffix}`);
      } else if (lastAction?.type === 'pong-fail') {
        showBanner(false, lastAction.failReason === 'already-declared'
          ? tg.toastPongDupe
          : tg.toastPongFail);
      }
    }
  }, [playerPong, tg, locale]);

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
        <p className="psy-serif text-[var(--psy-muted)]">{tg.loadingShort}</p>
      </div>
    );
  }

  const humanPlayer = game.players[0];
  const opponents = game.players.slice(1);
  const isHumanTurn = game.currentPlayerIndex === 0;
  const isPongWindow = game.phase === 'claim-window' && game.pendingDiscard !== null && game.discardedByIndex !== 0;
  const humanFrozen =
    humanPlayer.skipNextTurn || !!humanPlayer.frozenUntilOwnDiscard;
  const humanFrozenLockout =
    humanPlayer.skipNextTurn ||
    (!!humanPlayer.frozenUntilOwnDiscard && !isHumanTurn);
  const humanAwaitingOwnDischarge =
    !!humanPlayer.frozenUntilOwnDiscard && isHumanTurn && !humanPlayer.skipNextTurn;
  // canDraw/isDiscarding 加 !skipNextTurn 防禦 — skipPenalizedPlayers 應已跳過該
  // 玩家；frozenUntilOwnDiscard-only 狀態允許出牌（spec 解凍路徑）。
  const canDraw = isHumanTurn && game.phase === 'drawing' && !humanPlayer.skipNextTurn;
  const isDiscarding = isHumanTurn && game.phase === 'discarding' && !humanPlayer.skipNextTurn;
  const canHu =
    game.phase !== 'game-over' &&
    !humanFrozen &&
    (
      (isHumanTurn && game.phase !== 'claim-window') ||
      (game.phase === 'claim-window' &&
        game.discardedByIndex !== 0 &&
        !game.claimResponses.includes(humanPlayer.id))
    );
  const topDiscard = game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null;
  const targets = getTargetCounts(humanPlayer.bigFiveScores);
  const declaredDims = getDeclaredDimensions(humanPlayer);

  // ── Pong candidate computation ────────────────────────────────────────
  // Self-pong candidate list = ALL undeclared dimensions. Deliberately
  // does NOT pre-filter by pool>=target — that would leak which dims
  // the player has enough cards for, basically giving away the puzzle.
  // The player picks a dim + N cards on their own judgement; the engine
  // judges correctness on commit (selfPongCard's strict count + dim check).
  //
  // Once-per-turn rule: if already used this turn, no candidates.
  // 已歸檔維度也加入候選（強 trap）：UI 顯示，玩家選卡 + 提交 → engine 判 fail + 罰停。
  const selfPongCandidates: Dimension[] = [];
  if (
    isHumanTurn &&
    !humanFrozen &&
    !humanPlayer.selfPongUsedThisTurn &&
    (game.phase === 'drawing' || game.phase === 'discarding')
  ) {
    for (const d of DIMENSIONS) {
      selfPongCandidates.push(d);
    }
  }

  // Other-pong: 已歸檔維度也允許（強 trap），玩家點 → 選卡 → 提交 → fail。
  const otherPongCandidate: Dimension | null = (() => {
    if (!isPongWindow || !game.pendingDiscard || humanFrozen) return null;
    if (game.claimResponses.includes(humanPlayer.id)) return null;
    const pc = game.pendingDiscard;
    if (!isPersonalityCard(pc)) return null;
    const d = pc.dimension;
    if (declaredDims.has(d)) return d;  // 強 trap：允許點
    const sameInHand = humanPlayer.hand.filter(
      (c) => isPersonalityCard(c) && c.dimension === d
    ).length;
    return sameInHand >= targets[d] - 1 ? d : null;
  })();

  const canPongAnywhere = selfPongCandidates.length > 0 || otherPongCandidate !== null;
  const pongIntentTarget = pongIntent ? targets[pongIntent.dimension] : 0;
  const pongIntentRequiredSelectCount =
    pongIntent?.type === 'self'
      ? pongIntentTarget // pick exactly N from pool (hand + drawnCard)
      : pongIntent?.type === 'other'
      ? pongIntentTarget - 1 // pick N-1 from hand; pending card completes it
      : 0;

  return (
    <motion.div animate={shakeControls} className="mx-auto flex min-h-[100dvh] max-w-6xl w-full flex-col px-3 py-3 sm:px-4 sm:py-4">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
      <YourTurnBanner bannerKey={yourTurnKey} />
      <ArrowOverlay from={arrowFrom} to={arrowTo} color={arrowColor} />

      {/* idle 提醒 toast：本回合久未行动时弹出（配合震动） */}
      {idleReminderVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-28 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] rounded-xl border border-amber-400/60 bg-amber-500/90 px-5 py-2.5 text-xs font-bold text-white shadow-2xl sm:top-32 sm:px-6 sm:py-3 sm:text-sm"
        >
          {tg.idleYourTurn}
        </motion.div>
      )}

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

      {/* Top bar: exit button */}
      <div className="mb-1 flex shrink-0 items-center justify-between sm:mb-2">
        <button
          onClick={() => setExitConfirmOpen(true)}
          className="rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] text-[var(--psy-muted)] transition hover:border-[rgba(220,80,80,0.4)] hover:text-[var(--psy-danger)] sm:text-[11px]"
        >
          {tg.leaveGame}
        </button>
        <span className="psy-serif text-[10px] uppercase tracking-[0.32em] text-[var(--psy-muted)] sm:text-[11px]">
          {STRINGS[locale].home.title}
        </span>
      </div>

      {/* Exit confirmation modal */}
      <PsyOverlayPanel
        open={exitConfirmOpen}
        onClose={() => setExitConfirmOpen(false)}
        title={tg.exitConfirmTitle}
        variant="centered"
        closeLabel={tg.close}
      >
        <div className="space-y-5 px-1 py-2">
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
            {tg.exitConfirmBody1}
            <br />
            {tg.exitConfirmBodySingle}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setExitConfirmOpen(false)}
              className="psy-btn psy-btn-ghost px-5 py-2 text-sm"
            >
              {tg.cancel}
            </button>
            <button
              onClick={() => {
                setExitConfirmOpen(false);
                resetGame();
                router.push('/');
              }}
              className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
            >
              {tg.confirmExit}
            </button>
          </div>
        </div>
      </PsyOverlayPanel>

      {/* Opponents */}
      <div className="mb-1 grid shrink-0 grid-cols-3 gap-2 sm:mb-4 sm:h-[6.5rem] sm:gap-3">
        {opponents.map((opp) => (
          <OpponentHand
            key={opp.id}
            player={opp}
            isCurrentTurn={game.players[game.currentPlayerIndex].id === opp.id}
            locale={locale}
          />
        ))}
      </div>

      {/* Center: Draw pile + Discard pile + Game log */}
      <div className="my-1 flex shrink-0 items-center justify-center gap-3 sm:my-4 sm:grid sm:h-[11rem] sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <div className="flex items-center gap-3 sm:col-start-2 sm:gap-6">
          <div
            ref={drawPileRef}
            onMouseEnter={() => handleDrawPileHover(true)}
            onMouseLeave={() => handleDrawPileHover(false)}
          >
            <DrawPile count={game.drawPile.length} canDraw={canDraw} onDraw={playerDraw} locale={locale} />
          </div>
          <div ref={discardPileRef}>
            <DiscardPile
              topCard={topDiscard}
              count={game.discardPile.length}
              discardPile={game.discardPile}
              actions={game.actionLog}
              players={game.players}
              highlight={isDiscarding}
              locale={locale}
            />
          </div>
        </div>
        <div className="hidden md:block md:col-start-3 md:justify-self-end w-52">
          <GameLog actions={game.actionLog} players={game.players} locale={locale} />
        </div>
      </div>

      {/* Human player area */}
      <div className="flex flex-1 flex-col space-y-2 sm:space-y-3">
        {/* 罰停橫幅 / 碰窗 / 查看 / 碰意圖面板已全部移入手牌上方的懸浮層
            （見下方 Hand + Declared 區），不再插進文檔流把手牌往下推。 */}
        {/* Row 1: My personality scores */}
        <div className="hidden shrink-0 items-center justify-center gap-1.5 flex-wrap sm:flex">
          {DIMENSIONS.map((d) => {
            const score = humanPlayer.bigFiveScores[d];
            return (
              <div key={d} className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(200,155,93,0.10)', border: '1px solid rgba(200,155,93,0.2)' }}>
                <span className="text-[9px] text-[var(--psy-ink-soft)]">{dimName(d)}</span>
                <span className="text-[10px] font-bold text-[var(--psy-accent)]">{score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>

        {/* Row 2: Targets */}
        <div className="hidden shrink-0 items-center justify-center gap-1.5 flex-wrap sm:flex">
          {DIMENSIONS.map((d) => {
            const target = targets[d];
            const isDone = declaredDims.has(d);
            return (
              <div
                key={d}
                className="flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: isDone ? 'rgba(200,155,93,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDone ? 'rgba(200,155,93,0.45)' : 'rgba(200,155,93,0.14)'}`,
                }}
              >
                <span className="text-[9px]" style={{ color: isDone ? 'var(--psy-accent)' : 'var(--psy-muted)' }}>
                  {dimName(d)}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isDone ? 'var(--psy-accent)' : 'var(--psy-ink-soft)' }}
                >
                  {isDone ? '✓' : (locale === 'en' ? `${target} ${tg.cardsUnit}` : `${target}張`)}
                </span>
              </div>
            );
          })}
          <div className="rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5">
            <span className="text-[9px] text-[var(--psy-muted)]">{tg.done} </span>
            <span className="text-[10px] font-medium text-[var(--psy-success)]">{humanPlayer.declaredSets.length}/5</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:hidden">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[10px] text-[var(--psy-ink-soft)]">
            <span className="psy-serif text-[var(--psy-accent)]">{locale === 'en' ? `${tg.roundUnit} ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''}` : `第 ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''} 輪`}</span>
            <span className="truncate">{tg.doneLabel} {humanPlayer.declaredSets.length}/5</span>
            <span className={`font-mono tabular-nums ${timer <= 5 ? 'text-[var(--psy-danger)]' : 'text-[var(--psy-accent)]'}`}>{timer}s</span>
          </div>
          {/* 5 維目標常駐迷你條：字母 + 目標張數，已歸檔顯示 ✓ 並轉金。
              只顯示目標 + 是否歸檔，不洩露手上已有幾張（保留靠記憶推理的核心）。*/}
          <div className="flex items-center justify-center gap-1">
            <span className="shrink-0 pr-0.5 text-[9px] text-[var(--psy-muted)]">{tg.targetPrefix}</span>
            {DIMENSIONS.map((d) => {
              const isDone = declaredDims.has(d);
              return (
                <span
                  key={d}
                  className="flex flex-1 items-center justify-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-bold tabular-nums"
                  style={{
                    backgroundColor: isDone ? 'rgba(200,155,93,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isDone ? 'rgba(200,155,93,0.45)' : 'rgba(200,155,93,0.14)'}`,
                    color: isDone ? 'var(--psy-accent)' : 'var(--psy-ink-soft)',
                  }}
                >
                  <span className="opacity-80">{d}</span>
                  <span>{isDone ? '✓' : targets[d]}</span>
                </span>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => setMobileSheet('persona')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">{tg.persona}</button>
            <button onClick={() => setMobileSheet('declared')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">{tg.archive}</button>
            <button onClick={() => setMobileSheet('log')} className="psy-btn psy-btn-ghost px-2.5 py-1 text-[10px]">{tg.log}</button>
          </div>
        </div>

        {/* ── 懸浮操作層 ─────────────────────────────────────────────
            罰停橫幅 / 碰窗 / 查看 / 碰意圖面板全部懸浮在操作排上方
            （h-0 錨點 + absolute bottom 錨定；錨點必須在操作排之前——
            否則面板會蓋住排裏的截胡/查看/AI回合按鈕），蓋住牌桌中央而不佔文檔流
            —— 手牌位置在任何窗口彈出時都紋絲不動（牌類手游慣例做法）。 */}
        <div className="relative z-30 h-0 overflow-visible">
          <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
            <div className="pointer-events-auto w-full max-w-xl space-y-2 px-1">

        {/* Penalty banner — lockout 時顯示紅色"罰停"，own-turn 解凍輪顯示提示 */}
        {humanFrozenLockout && (
          <div className="psy-panel flex items-center justify-center gap-2 rounded-xl border border-[rgba(220,106,79,0.45)] bg-[rgba(220,106,79,0.12)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-danger)] sm:text-sm">
            <span>⛔</span>
            <span className="hidden sm:inline">{tg.penaltyLockoutFull}</span>
            <span className="sm:hidden">{tg.penaltyLockoutShort}</span>
          </div>
        )}
        {humanAwaitingOwnDischarge && (
          <div className="psy-panel flex items-center justify-center gap-2 rounded-xl border border-[rgba(200,155,93,0.45)] bg-[rgba(200,155,93,0.12)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-accent)] sm:text-sm">
            <span>⏳</span>
            <span className="hidden sm:inline">{tg.thawFull}</span>
            <span className="sm:hidden">{tg.thawShort}</span>
          </div>
        )}

        {/* Pong panel — first-come-first-served: any non-discarder may
            attempt pong (race resolves naturally). Hidden when the human
            is pong-fail frozen so the panel never offers an action that
            would be rejected by the engine guard. */}
        {isPongWindow && game.pendingDiscard && !humanFrozen &&
          !game.claimResponses.includes(humanPlayer.id) && (
            <PongPanel
              pendingCard={game.pendingDiscard}
              player={humanPlayer}
              discardedByName={game.players[game.discardedByIndex]?.name ?? ''}
              selectedCardIds={selectedCardIds}
              onClaim={handlePong}
              onSkip={handleSkipPong}
              onResolveAI={handleResolvePongAI}
              locale={locale}
            />
          )}

        {viewMode && (
          <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
            <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
              🔍 {tg.viewPickPrompt}（{pickedViewIds.length}/2）
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { setViewMode(false); setPickedViewIds([]); }}
                className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
              >
                {tg.cancel}
              </button>
              <button
                onClick={() => {
                  if (pickedViewIds.length === 0) return;
                  setViewedCardIds(pickedViewIds);
                  setViewMode(false);
                  setPickedViewIds([]);
                  setViewUsedThisTurn(true);
                }}
                disabled={pickedViewIds.length === 0}
                className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                {tg.view}
              </button>
            </div>
          </div>
        )}

        {/* Pong intent — card selection prompt */}
        {pongIntent && (
          <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
            <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
              {pongIntent.type === 'self' ? tg.pongIntentSelf : tg.pongIntentOther} ·{' '}
              <span className="text-[var(--psy-accent)]">
                {dimName(pongIntent.dimension)}
              </span>{' '}
              · {tg.pongSelectPrompt}{' '}
              <span className="text-white font-bold">{pongIntentRequiredSelectCount}</span> {tg.cardsUnit}
              {pongIntent.type === 'self' ? tg.pongSelectSelfSuffix : tg.pongSelectOtherPrefixA + pongIntentTarget + tg.pongSelectOtherPrefixB}
              {locale === 'en' ? ' (' : '（'}{tg.selectedPrefix} <span className="text-white font-bold">{selectedCardIds.length}</span>{locale === 'en' ? ')' : '）'}
            </p>
            {/* Self-pong dimension switcher (only when there are multiple candidates) */}
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
                    className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition"
                    title={isDeclared ? tg.declaredWarn : undefined}
                    style={{
                      borderColor: pongIntent.dimension === d
                        ? '#bb8e49'
                        : isDeclared
                        ? 'rgba(220,106,79,0.35)'
                        : 'rgba(200,155,93,0.18)',
                      backgroundColor: pongIntent.dimension === d
                        ? '#bb8e49'
                        : isDeclared
                        ? 'rgba(220,106,79,0.06)'
                        : 'rgba(255,255,255,0.02)',
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
                {tg.cancel}
              </button>
              <button
                onClick={() => {
                  if (pongIntent.type === 'self') {
                    handleSelfPongCommit();
                  } else {
                    handlePong(pongIntent.dimension, selectedCardIds);
                    setPongIntent(null);
                  }
                }}
                disabled={selectedCardIds.length !== pongIntentRequiredSelectCount}
                className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                {pongIntent.type === 'self' ? tg.selfArchive : tg.archiveJudge}
              </button>
            </div>
          </div>
        )}

            </div>
          </div>
        </div>

        {/* Action buttons — 恆佔一行高度（min-h）：按鈕隨回合出現/消失時
            手牌不再上下跳。面板打開時內容隱藏但行高保留。 */}
        <div className="flex min-h-[46px] shrink-0 flex-wrap items-center justify-center gap-2 sm:gap-3">
          {!viewMode && !pongIntent && (
          <>
            {/* Hu button — visible on own turn, or during an opponent's
                claim-window ("跳着胡"). Hidden when the human has already
                responded to this claim window. */}
            {canHu && (
              <button
                onClick={handleHu}
                className="psy-btn psy-btn-danger px-5 py-2 text-sm font-bold"
              >
                {tg.win}
              </button>
            )}

            {/* Self-pong button — visible only on own turn (claim-window
                pong is handled by the floating PongPanel). Stays enabled
                regardless of whether the player actually has the cards —
                we don't want to leak "you can pong dim X" by toggling
                the button. The player decides; the engine judges. */}
            {isHumanTurn && game.phase !== 'claim-window' && (
              <button
                onClick={() => {
                  if (humanPlayer.selfPongUsedThisTurn || humanFrozen) return;
                  if (selfPongCandidates.length === 0) return;
                  // 默認選第一個未歸檔維度，防止誤觸 trap
                  const defaultDim =
                    selfPongCandidates.find((d) => !declaredDims.has(d)) ??
                    selfPongCandidates[0];
                  setPongIntent({ type: 'self', dimension: defaultDim });
                  setSelectedCardIds([]);
                }}
                disabled={
                  humanFrozen ||
                  !!humanPlayer.selfPongUsedThisTurn ||
                  selfPongCandidates.length === 0
                }
                className="psy-btn psy-btn-accent px-5 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35"
                title={
                  humanFrozen
                    ? tg.selfPongFrozen
                    : humanPlayer.selfPongUsedThisTurn
                    ? tg.selfPongUsed
                    : tg.selfPongHint
                }
              >
                {tg.selfPong}
              </button>
            )}

            {isHumanTurn && isDiscarding && !viewUsedThisTurn && (
              <button
                onClick={() => { setViewMode(true); setPickedViewIds([]); }}
                className="psy-btn psy-btn-ghost px-4 py-2 text-sm font-medium"
                title={tg.viewCardsTitle}
              >
                🔍 {tg.viewTwoCards}（1/1）
              </button>
            )}
            {isHumanTurn && isDiscarding && viewUsedThisTurn && (
              <span className="text-xs text-[var(--psy-muted)]">{tg.viewUsed}</span>
            )}

            {/* AI turn button */}
            {!isHumanTurn && game.phase !== 'game-over' && game.phase !== 'claim-window' && (
              <button
                onClick={runOneAITurn}
                disabled={aiRunning}
                className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
              >
                {game.players[game.currentPlayerIndex].avatar}{' '}
                {game.players[game.currentPlayerIndex].name}{tg.turnOf} — {tg.clickToRun}
              </button>
            )}
          </>
          )}
          </div>

        {/* Hand + Declared cards */}
        <div className="flex flex-1 items-start justify-center gap-3 sm:gap-4">
          <div className="hidden flex-shrink-0 sm:block">
            <DeclaredArea declaredSets={humanPlayer.declaredSets} locale={locale} />
          </div>
          <div ref={handAreaRef} className="flex-1 min-w-0 overflow-visible">
            <PlayerHand
              cards={humanPlayer.hand}
              drawnCard={isHumanTurn ? game.drawnCard : null}
              isDiscarding={isDiscarding && !viewMode && !pongIntent}
              isDeclaring={isPongWindow || pongIntent !== null}
              isMyTurn={isHumanTurn}
              mobileCompact
              selectedCardIds={selectedCardIds}
              viewedCardIds={viewedCardIds}
              viewMode={viewMode}
              pickedViewIds={pickedViewIds}
              onTogglePickView={(cardId) =>
                setPickedViewIds((prev) =>
                  prev.includes(cardId)
                    ? prev.filter((id) => id !== cardId)
                    : prev.length >= 2 ? prev : [...prev, cardId]
                )
              }
              onDiscardCard={handleDiscardCard}
              onToggleSelect={handleToggleSelect}
              onCardHover={handleCardHover}
              locale={locale}
            />
          </div>
        </div>

        {isHumanActive && (
          <div className="hidden items-center justify-center gap-2 sm:flex">
            {canDraw && (
              <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">{tg.clickToDraw}</p>
            )}
            {isDiscarding && !game.drawnCard && (
              <p className="psy-serif animate-pulse text-sm text-[var(--psy-accent)]">
                {tg.pongDoneDiscard}
              </p>
            )}
            <span className={`text-sm font-mono font-bold ${timer <= 5 ? 'text-red-300 animate-pulse' : timer <= 10 ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-muted)]'}`}>
              {timer}s
            </span>
          </div>
        )}

        {/* Round info */}
        <div className="hidden text-center text-xs text-[var(--psy-muted)] sm:block">
          {locale === 'en'
            ? `${tg.roundWord} ${game.currentRound}${game.settings.totalRounds > 0 ? ` / ${game.settings.totalRounds}` : ''}`
            : `第 ${game.currentRound}${game.settings.totalRounds > 0 ? ` / ${game.settings.totalRounds}` : ''} 輪`}
        </div>
      </div>

      <MobileGameSheet
        title={tg.sheetPersonaTitle}
        open={mobileSheet === 'persona'}
        onClose={() => setMobileSheet(null)}
        locale={locale}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => {
              const score = humanPlayer.bigFiveScores[d];
              const isDone = declaredDims.has(d);
              return (
                <div key={d} className="rounded-xl border px-3 py-2" style={{ borderColor: isDone ? 'rgba(200,155,93,0.45)' : 'rgba(200,155,93,0.2)', backgroundColor: isDone ? 'rgba(200,155,93,0.12)' : 'rgba(255,255,255,0.03)' }}>
                  <div className="psy-serif text-sm text-[var(--psy-accent)]">{dimName(d)}</div>
                  <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">{tg.scoreLabel} {score.toFixed(1)} · {isDone ? tg.doneLabel : (locale === 'en' ? `${tg.targetPrefix} ${targets[d]} ${tg.cardsUnit}` : `目標 ${targets[d]} 張`)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </MobileGameSheet>
      <MobileGameSheet
        title={tg.sheetDeclaredTitle}
        open={mobileSheet === 'declared'}
        onClose={() => setMobileSheet(null)}
        locale={locale}
      >
        {humanPlayer.declaredSets.length > 0 ? <DeclaredArea declaredSets={humanPlayer.declaredSets} locale={locale} /> : <p className="text-sm text-[var(--psy-muted)]">{tg.noArchiveYet}</p>}
      </MobileGameSheet>
      <MobileGameSheet
        title={tg.sheetLogTitle}
        open={mobileSheet === 'log'}
        onClose={() => setMobileSheet(null)}
        locale={locale}
      >
        <GameLog actions={game.actionLog} players={game.players} locale={locale} />
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
          locale={locale}
        />
      )}
    </motion.div>
  );
}
