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
  TurnNoticeToast,
  turnNudge,
} from '@/components/game/FeedbackLayer';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS, playerLabel } from '@/lib/i18n';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS, Dimension, GameCard } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';
import { PlayerHand } from '@/components/game/PlayerHand';
import { OpponentHand } from '@/components/game/OpponentHand';
import { DrawPile } from '@/components/game/DrawPile';
import { DiscardPile } from '@/components/game/DiscardPile';
import { GameLog } from '@/components/game/GameLog';
import { GameOverModal } from '@/components/game-results/GameOverModal';
import { FlyingCard } from '@/components/game/FlyingCard';
import { PongPanel } from '@/components/game/PongPanel';
import { DeclaredArea } from '@/components/game/DeclaredArea';
import { MobileGameSheet } from '@/components/game/MobileGameSheet';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

interface FlyingAnim {
  id: number;
  cardId: number;
  card: GameCard;
  from: { x: number; y: number };
  to: { x: number; y: number };
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
  const dimName = useCallback((d: Dimension) => (locale === 'en' ? DIMENSION_META[d].nameEn : DIMENSION_META[d].name), [locale]);
  // 看牌難度（對應聯機版）：open=全公開 / half=每回合看 4 張且保留 / hidden=每回合看 2 張（預設）
  const revealDifficulty = game?.settings?.revealDifficulty ?? 'hidden';
  const viewCap = revealDifficulty === 'half' ? 4 : 2;
  const [aiRunning, setAiRunning] = useState(false);

  // Card selection state (for pong)
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [mobileSheet, setMobileSheet] = useState<'log' | 'declared' | 'persona' | null>(null);
  // "View N cards" feature (N=viewCap: half=4 / hidden=2): 1 use per own turn. Resets when active player changes (half 保留跨回合).
  const [viewMode, setViewMode] = useState(false);
  const [pickedViewIds, setPickedViewIds] = useState<number[]>([]);
  const [viewedCardIds, setViewedCardIds] = useState<number[]>([]);
  const [viewUsedThisTurn, setViewUsedThisTurn] = useState(false);
  const [discardPickId, setDiscardPickId] = useState<number | null>(null);

  // Exit-confirmation modal
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  // Pong intent — when user clicks the main-area 「碰」 button, this opens
  // a card-selection flow. type='self' for 自摸碰 (own turn), 'other' for
  // claiming an opponent's discard.
  const [pongIntent, setPongIntent] = useState<{
    type: 'self' | 'other';
    dimension: Dimension;
  } | null>(null);
  const [selfPongDimensionChosen, setSelfPongDimensionChosen] = useState(false);

  // Arrow state — 存「取点函数」而非静态坐标，ArrowOverlay 每帧重算 → 跟随滚动。
  type Pt = { x: number; y: number };
  const [arrowFrom, setArrowFrom] = useState<(() => Pt | null) | null>(null);
  const [arrowTo, setArrowTo] = useState<(() => Pt | null) | null>(null);
  const [arrowColor, setArrowColor] = useState('#a855f7');

  // 单人 idle 提醒：本回合超过一定时间未行动时，弹「輪到你」toast + 屏幕震动。
  const [idleReminderVisible, setIdleReminderVisible] = useState(false);

  // Flying card animations
  const [flyingCards, setFlyingCards] = useState<FlyingAnim[]>([]);
  const flyIdRef = useRef(0);
  const discardPileRef = useRef<HTMLDivElement>(null);
  const drawPileRef = useRef<HTMLDivElement>(null);
  const handAreaRef = useRef<HTMLDivElement>(null);

  // Timer for human turn
  const isHumanActive = game?.currentPlayerIndex === 0 && (game?.phase === 'drawing' || game?.phase === 'discarding');
  const isHumanDiscardPhase =
    game?.currentPlayerIndex === 0 &&
    game?.phase === 'discarding' &&
    !game.players[0]?.skipNextTurn;

  useEffect(() => {
    if (isHumanDiscardPhase) return;
    setDiscardPickId(null);
  }, [isHumanDiscardPhase]);

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
    setSelfPongDimensionChosen(false);
  }, [game?.currentPlayerIndex, game?.phase]);

  // Reset view-cards state on turn change. half 模式：已看的牌保留（不清 viewedCardIds）。
  useEffect(() => {
    setViewMode(false);
    setPickedViewIds([]);
    if (revealDifficulty !== 'half') setViewedCardIds([]);
    setViewUsedThisTurn(false);
  }, [game?.currentPlayerIndex, game?.currentRound, revealDifficulty]);

  // Solo play never advances automatically. The reminder repeats every 30s
  // while the player is deciding; any action resets the interval.
  useEffect(() => {
    if (!isHumanActive) {
      setIdleReminderVisible(false);
      setArrowFrom(null);
      setArrowTo(null);
      return;
    }
    let hideTimer: number | null = null;
    const interval = window.setInterval(() => {
      turnNudge(shakeControls);
      setIdleReminderVisible(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setIdleReminderVisible(false), 2500);
    }, 30_000);
    return () => {
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isHumanActive, game?.actionLog.length, shakeControls]);

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

    // 模拟思考：AI 出牌前随机停顿 5–8 秒，避免节奏过快（原 280ms 几乎瞬发）。
    const thinkDelay = 5000 + Math.random() * 3000;
    const timer = window.setTimeout(() => {
      void runOneAITurn();
    }, thinkDelay);

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
          cardId,
          card,
          from: { x: fr.left + fr.width / 2, y: fr.top + fr.height / 2 },
          to: { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 },
        }]);
        setArrowFrom(null);
        setArrowTo(null);
        return;
      }
    }
    playerDiscard(cardId);
    setArrowFrom(null);
    setArrowTo(null);
  }, [playerDiscard]);

  const removeFlyingCard = useCallback((id: number, cardId: number) => {
    setFlyingCards((prev) => prev.filter((f) => f.id !== id));
    playerDiscard(cardId);
  }, [playerDiscard]);

  const handleToggleSelect = useCallback((cardId: number) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  }, []);

  // Hu (胡) handler
  const handleHu = useCallback(() => {
    playerHu();
  }, [playerHu]);

  // Self-pong (自摸碰) commit handler
  const handleSelfPongCommit = useCallback(() => {
    if (!pongIntent || pongIntent.type !== 'self') return;
    playerSelfPong(pongIntent.dimension, selectedCardIds);
    setSelectedCardIds([]);
    setPongIntent(null);
    setSelfPongDimensionChosen(false);
  }, [playerSelfPong, pongIntent, selectedCardIds]);

  // Pong (碰) handler
  const handlePong = useCallback((dimension: Dimension, handCardIds: number[]) => {
    playerPong(dimension, handCardIds);
    setSelectedCardIds([]);
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
        <p className="psy-serif text-[var(--psy-muted)]">{tg.loadingShort}</p>
      </div>
    );
  }

  const humanPlayer = game.players[0];
  // open 模式：所有手牌（含剛抽到）維度全公開，複用 viewedCardIds 渲染
  const effectiveViewedIds = revealDifficulty === 'open'
    ? [...humanPlayer.hand.map((c) => c.id), ...(game.drawnCard ? [game.drawnCard.id] : [])]
    : viewedCardIds;
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

  const pongIntentTarget = pongIntent ? targets[pongIntent.dimension] : 0;
  const pongIntentRequiredSelectCount =
    pongIntent?.type === 'self'
      ? pongIntentTarget // pick exactly N from pool (hand + drawnCard)
      : pongIntent?.type === 'other'
      ? pongIntentTarget - 1 // pick N-1 from hand; pending card completes it
      : 0;

  return (
    <motion.div animate={shakeControls} className="mx-auto flex min-h-[100dvh] w-full max-w-[min(96vw,112rem)] flex-col px-3 py-3 [overflow-anchor:none] sm:px-4 sm:py-4">
      <FeedbackOverlays flashControls={flashControls} pops={pops} />
      <YourTurnBanner bannerKey={yourTurnKey} locale={locale} />
      {/* 引导箭头线已移除（用户反馈：抽/出/弃牌处的虚线都不要） */}

      {/* idle 提醒 toast：本回合久未行动时弹出（配合震动） */}
      {idleReminderVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed left-1/2 top-24 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 sm:top-28"
        >
          <TurnNoticeToast eyebrow={tg.idleYourTurnEyebrow} title={tg.idleYourTurn} icon="⏰" />
        </motion.div>
      )}


      {flyingCards.map((f) => (
        <FlyingCard key={f.id} from={f.from} to={f.to} card={f.card} locale={locale} onComplete={() => removeFlyingCard(f.id, f.cardId)} />
      ))}

      {/* Top bar: exit button */}
      <div className="mb-1 flex shrink-0 items-center justify-between sm:mb-2">
        <button
          onClick={() => setExitConfirmOpen(true)}
          className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-1 text-[10px] text-[var(--psy-muted)] shadow-[0_8px_18px_rgba(96,72,38,0.1)] transition hover:border-[rgba(220,80,80,0.4)] hover:text-[var(--psy-danger)] sm:text-[11px]"
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

      <div className="shrink-0 rounded-[1.7rem] border border-[rgba(154,116,72,0.16)] bg-[linear-gradient(180deg,rgba(253,248,241,0.76),rgba(234,221,196,0.42))] p-2 shadow-[0_18px_40px_rgba(96,72,38,0.12)] sm:rounded-[2rem] sm:p-3">
        {/* Opponents */}
        <div className="grid grid-cols-3 gap-2 sm:h-[6.5rem] sm:gap-3">
          {opponents.map((opp) => (
            <OpponentHand
              key={opp.id}
              player={opp}
              isCurrentTurn={game.players[game.currentPlayerIndex].id === opp.id}
              locale={locale}
            />
          ))}
        </div>

        {/* 回合数（桌面）：中央行两栏布局无处放轮次，这里补一枚居中 chip；移动端已在下方信息行显示，故 md 才顯示。 */}
        <div className="mt-3 hidden justify-center md:flex">
          <span className="psy-serif rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-4 py-1 text-sm text-[var(--psy-ink-soft)] shadow-[0_8px_18px_rgba(96,72,38,0.08)]">
            {locale === 'en' ? `${tg.roundUnit} ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''}` : `第 ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''} 輪`}
          </span>
        </div>

        {/* Center: 抽牌 + 弃牌 + 行动记录 统一在一个 block 内（记录归入牌堆区，用户反馈） */}
        <div className="mt-3 grid items-center gap-3 rounded-[1.35rem] border border-[rgba(154,116,72,0.16)] bg-[linear-gradient(180deg,#fdf8f1,#f8f1e4)] p-3 sm:mt-4 sm:grid-cols-[minmax(19rem,1fr)_minmax(12rem,0.5fr)] sm:gap-[4%] sm:p-4">
          <div className="flex items-center justify-center gap-[clamp(1rem,4vw,4rem)] px-[clamp(0.5rem,3vw,2.5rem)]">
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
          <div className="hidden w-full sm:block sm:justify-self-stretch">
            <GameLog actions={game.actionLog} players={game.players} locale={locale} />
          </div>
        </div>
      </div>

      {/* Human player area */}
      <div className="mt-2 flex flex-1 flex-col space-y-2 rounded-[1.7rem] border border-[rgba(154,116,72,0.14)] bg-[rgba(253,248,241,0.56)] p-2 shadow-[0_18px_40px_rgba(96,72,38,0.1)] sm:mt-3 sm:space-y-3 sm:rounded-[2rem] sm:p-3">
        {/* 罰停橫幅 / 碰窗 / 查看 / 碰意圖面板已全部移入手牌上方的懸浮層
            （見下方 Hand + Declared 區），不再插進文檔流把手牌往下推。 */}
        <div className="flex shrink-0 flex-col gap-1.5 sm:hidden">
          {/* 回合信息 + 記錄 合并一行（人格/歸檔入口已移除：下方 5 维 pill 即人格展示，点击=展开归档）。 */}
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-full border border-[rgba(154,116,72,0.2)] bg-[var(--psy-card-content)] px-3 py-1.5 text-xs text-[var(--psy-ink-soft)]">
              <span className="psy-serif shrink-0 font-semibold text-[var(--psy-accent-strong)]">{locale === 'en' ? `${tg.roundUnit} ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''}` : `第 ${game.currentRound}${game.settings.totalRounds > 0 ? `/${game.settings.totalRounds}` : ''} 輪`}</span>
              {/* 弃牌阶段（未选牌）时把「先圈定要弃的牌」提示放这里——动作行窄屏空胶囊已隐藏。 */}
              {isHumanTurn && isDiscarding && !viewMode && !pongIntent && discardPickId === null ? (
                <span className="ml-auto truncate font-medium text-[var(--psy-accent)]">{tg.pickDiscard}</span>
              ) : (
                <span className="ml-auto truncate font-medium">{tg.doneLabel} {humanPlayer.declaredSets.length}/5</span>
              )}
            </div>
            <button onClick={() => setMobileSheet('log')} className="psy-btn psy-btn-ghost shrink-0 px-3 py-1.5 text-xs">{tg.log}</button>
          </div>
          {/* 5 维人格 pill：点击展开归档（模态居中）；实底加深、字加大，替代原独立人格/归档入口。 */}
          <div className="grid grid-cols-5 gap-1.5" aria-label={locale === 'en' ? 'Archive progress' : '歸檔進度'}>
            {DIMENSIONS.map((dimension) => {
              const done = declaredDims.has(dimension);
              return (
                <button
                  key={dimension}
                  type="button"
                  onClick={() => setMobileSheet('declared')}
                  className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1.5 text-center transition active:scale-95 ${done ? 'border-[rgba(111,143,85,0.5)] bg-[rgba(111,143,85,0.18)] text-[var(--psy-success)]' : 'border-[rgba(154,116,72,0.3)] bg-[#f0e6d2] text-[var(--psy-ink)]'}`}
                >
                  <span className="text-[11px] font-bold leading-tight">{locale === 'en' ? dimension : dimName(dimension)}</span>
                  <span className="text-[8px] font-medium leading-tight opacity-90">{locale === 'en' ? `${targets[dimension]} · ${done ? 'Done' : 'Open'}` : `目標${targets[dimension]}張 ${done ? '已歸檔' : '未歸檔'}`}</span>
                </button>
              );
            })}
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
          <div className="fixed left-1/2 top-3 z-[78] flex w-[min(54rem,calc(100vw-2rem))] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border border-[rgba(220,106,79,0.5)] bg-[var(--psy-card-content)] px-3 py-2 text-[11px] font-semibold leading-snug text-[var(--psy-danger)] shadow-[0_14px_30px_rgba(96,72,38,0.2)] sm:text-sm">
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
              discardedByName={(() => { const p = game.players[game.discardedByIndex]; return p ? playerLabel(p, locale) : ''; })()}
              selectedCardIds={selectedCardIds}
              onClaim={handlePong}
              onSkip={handleSkipPong}
              onResolveAI={handleResolvePongAI}
              autoAdvance={false}
              revealPendingDimension={revealDifficulty === 'open'}
              locale={locale}
            />
          )}

        {viewMode && (
          <div className="psy-panel space-y-2 rounded-[1.35rem] border p-3">
            <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
              🔍 {tg.viewPickPrompt}（{pickedViewIds.length}/{viewCap}）
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
                  // half 累加保留；hidden 每回合已清空，累加等同替换
                  setViewedCardIds((prev) => [...new Set([...prev, ...pickedViewIds])]);
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
              <span className="font-bold text-[var(--psy-accent-strong)]">{pongIntentRequiredSelectCount}</span> {tg.cardsUnit}
              {pongIntent.type === 'self' ? tg.pongSelectSelfSuffix : tg.pongSelectOtherPrefixA + pongIntentTarget + tg.pongSelectOtherPrefixB}
              {locale === 'en' ? ' (' : '（'}{tg.selectedPrefix} <span className="font-bold text-[var(--psy-accent-strong)]">{selectedCardIds.length}</span>{locale === 'en' ? ')' : '）'}
            </p>
            {/* Self-pong dimension switcher (only when there are multiple candidates) */}
            {pongIntent.type === 'self' && selfPongCandidates.length > 1 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {selfPongCandidates.map((d) => {
                  const isDeclared = declaredDims.has(d);
                  return (
                  <button
                    key={d}
                    disabled={isDeclared}
                    onClick={() => {
                      setPongIntent({ type: 'self', dimension: d });
                      setSelectedCardIds([]);
                      setSelfPongDimensionChosen(true);
                    }}
                    className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition disabled:cursor-not-allowed"
                    style={{
                      borderColor: isDeclared
                        ? 'rgba(154,116,72,0.12)'
                        : selfPongDimensionChosen && pongIntent.dimension === d
                        ? '#c39a52'
                        : 'rgba(200,155,93,0.18)',
                      backgroundColor: isDeclared
                        ? 'rgba(154,116,72,0.06)'
                        : selfPongDimensionChosen && pongIntent.dimension === d
                        ? '#c39a52'
                        : '#fdf8f1',
                      color: isDeclared
                        ? 'rgba(96,72,38,0.34)'
                        : selfPongDimensionChosen && pongIntent.dimension === d
                        ? '#fff7ea'
                        : 'var(--psy-ink-soft)',
                      opacity: isDeclared ? 0.6 : 1,
                      textDecoration: isDeclared ? 'line-through' : undefined,
                    }}
                  >
                    {dimName(d)}
                  </button>
                  );
                })}
              </div>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { setPongIntent(null); setSelectedCardIds([]); setSelfPongDimensionChosen(false); }}
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
                    disabled={(pongIntent.type === 'self' && !selfPongDimensionChosen) || selectedCardIds.length !== pongIntentRequiredSelectCount}
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
        <div className="flex min-h-[46px] shrink-0 flex-wrap items-center justify-center gap-2 sm:flex-nowrap sm:gap-3">
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
                  setSelfPongDimensionChosen(selfPongCandidates.length === 1);
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

            {isHumanTurn && isDiscarding && !viewUsedThisTurn && revealDifficulty !== 'open' && (
              <button
                onClick={() => { setViewMode(true); setPickedViewIds([]); }}
                className="psy-btn psy-btn-ghost px-4 py-2 text-sm font-medium"
                title={tg.viewCardsTitle}
              >
                🔍 {locale === 'en' ? `View ${viewCap}` : `查看 ${viewCap} 張`}
              </button>
            )}
            {isHumanTurn && isDiscarding && viewUsedThisTurn && revealDifficulty !== 'open' && (
              <span className="rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-2 text-xs text-[var(--psy-muted)]">{tg.viewUsed}</span>
            )}

            {isHumanTurn && isDiscarding && !viewMode && !pongIntent && (
              // 仅提示无按钮(discardPickId===null)时：窄屏(<sm)隐藏空胶囊——提示改在下方回合行显示；
              // sm+ 正常显示带文字的 pill。有取消/提交按钮时始终显示。
              <div className={`min-w-0 items-center gap-2 rounded-full border border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] px-3 py-1.5 ${discardPickId === null ? 'hidden sm:flex' : 'flex'}`}>
                <span className="hidden max-w-[15rem] truncate text-xs text-[var(--psy-muted)] sm:inline">
                  {discardPickId === null ? tg.pickDiscard : tg.confirmDiscardHint}
                </span>
                {discardPickId !== null && (
                  <>
                    <button
                      onClick={() => setDiscardPickId(null)}
                      className="psy-btn psy-btn-ghost px-3 py-1.5 text-xs"
                    >
                      {tg.cancel}
                    </button>
                    <button
                      onClick={() => {
                        const id = discardPickId;
                        handleDiscardCard(id);
                        setDiscardPickId(null);
                      }}
                      className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
                    >
                      {tg.submitDiscard}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* AI 回合：自动执行（8-15s 思考延迟已在 effect 内），此处仅弱提示「思考中…」。
                仍保留 onClick 作为万一自动流程卡死时的隐藏兜底，但不再显示「點擊執行」。 */}
            {!isHumanTurn && game.phase !== 'game-over' && game.phase !== 'claim-window' && (
              <button
                onClick={runOneAITurn}
                disabled={aiRunning}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-4 py-2 text-sm text-[var(--psy-muted)]"
              >
                <span>{game.players[game.currentPlayerIndex].avatar}</span>
                <span className="psy-serif text-[var(--psy-ink-soft)]">{playerLabel(game.players[game.currentPlayerIndex], locale)}{tg.turnOf}</span>
                <span className="animate-pulse">{locale === 'en' ? 'thinking…' : '思考中…'}</span>
              </button>
            )}
          </>
          )}
          </div>

        {/* Hand + Declared cards */}
        <div className="flex flex-1 items-start justify-center gap-3 sm:gap-4">
          <div className="hidden flex-shrink-0 sm:block">
            <DeclaredArea
              declaredSets={humanPlayer.declaredSets}
              locale={locale}
              targets={targets}
            />
          </div>
          <div ref={handAreaRef} className="flex-1 min-w-0 overflow-visible">
            <PlayerHand
              cards={humanPlayer.hand}
              drawnCard={isHumanTurn ? game.drawnCard : null}
              isDiscarding={isDiscarding && !viewMode && !pongIntent}
              isDeclaring={isPongWindow || pongIntent !== null}
              isMyTurn={isHumanTurn}
              selectedCardIds={selectedCardIds}
              viewedCardIds={effectiveViewedIds}
              discardPickId={discardPickId}
              onDiscardPickChange={setDiscardPickId}
              showDiscardControls={false}
              flyingCardId={flyingCards[0]?.cardId ?? null}
              viewMode={viewMode}
              pickedViewIds={pickedViewIds}
              onTogglePickView={(cardId) =>
                setPickedViewIds((prev) =>
                  prev.includes(cardId)
                    ? prev.filter((id) => id !== cardId)
                    : prev.length >= viewCap ? prev : [...prev, cardId]
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
          </div>
        )}
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
              const isDone = declaredDims.has(d);
              return (
                <div key={d} className="rounded-xl border px-3 py-2" style={{ borderColor: isDone ? 'rgba(154,116,72,0.45)' : 'rgba(154,116,72,0.2)', backgroundColor: isDone ? 'rgba(195,154,82,0.14)' : '#fdf8f1' }}>
                  <div className="psy-serif text-sm text-[var(--psy-accent)]">{dimName(d)}</div>
                  <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">{isDone ? tg.doneLabel : (locale === 'en' ? `${tg.targetPrefix} ${targets[d]} ${tg.cardsUnit}` : `目標 ${targets[d]} 張`)}</div>
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
        variant="centered"
      >
        {humanPlayer.declaredSets.length > 0 ? <DeclaredArea declaredSets={humanPlayer.declaredSets} locale={locale} overlayZIndex={98} expanded /> : <p className="text-sm text-[var(--psy-muted)]">{tg.noArchiveYet}</p>}
      </MobileGameSheet>
      <MobileGameSheet
        title={tg.sheetLogTitle}
        open={mobileSheet === 'log'}
        onClose={() => setMobileSheet(null)}
        locale={locale}
      >
        <GameLog actions={game.actionLog} players={game.players} locale={locale} overlayZIndex={96} inline />
      </MobileGameSheet>

      {/* Game Over */}
      {game.phase === 'game-over' && (
        <GameOverModal
          players={game.players}
          onPlayAgain={() => {
            // 原地重開局：手動清本地查看狀態，避免 half 檔把上一局看過的牌 id 帶進新局
            // （turn-reset effect 在「新局 round/玩家 index 未變」時可能不觸發，兜不住）。
            setViewMode(false);
            setPickedViewIds([]);
            setViewedCardIds([]);
            setViewUsedThisTurn(false);
            if (bigFiveScores) initGame(bigFiveScores, game.settings);
          }}
          onBackToLobby={() => {
            resetGame();
            router.push('/');
          }}
          locale={locale}
        />
      )}
    </motion.div>
  );
}
