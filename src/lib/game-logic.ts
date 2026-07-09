import {
  GameState,
  GameSettings,
  Player,
  BigFiveScores,
  GameCard,
  PlayerId,
  GameAction,
  Dimension,
  DIMENSIONS,
  isPersonalityCard,
  isDummyCard,
  PersonalityCard,
} from '@/types';
import { AI_PERSONAS } from '@/data/ai-personas';
import { generateAIScores, calculateFinalScore, getTargetCounts } from './scoring';
import { createShuffledDeck, dealCardsVariable } from './card-engine';

function createPlayer(
  id: PlayerId,
  name: string,
  avatar: string,
  hand: GameCard[],
  isHuman: boolean,
  bigFiveScores: BigFiveScores,
  nameEn?: string
): Player {
  return {
    id, name, nameEn, avatar, hand, isHuman, bigFiveScores,
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
  };
}

export function initializeGame(
  humanScores: BigFiveScores,
  settings: GameSettings
): GameState {
  const aiScoresList = AI_PERSONAS.map(() => generateAIScores());
  const allScores = [humanScores, ...aiScoresList];

  const deck = createShuffledDeck(allScores.length);
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = [
    createPlayer('human', '你', '🧑', hands[0], true, humanScores, 'You'),
    ...AI_PERSONAS.map((persona, i) =>
      createPlayer(persona.id as PlayerId, persona.name, persona.avatar, hands[i + 1], false, aiScoresList[i], persona.nameEn)
    ),
  ];

  return {
    phase: 'drawing',
    settings,
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    winner: null,
  };
}

// ── Claim-window helpers ─────────────────────────────────────────────────────
function getEligibleClaimers(state: GameState): number[] {
  return state.players.map((_, i) => i).filter((i) => i !== state.discardedByIndex);
}

function allClaimersResponded(state: GameState): boolean {
  if (state.discardedByIndex < 0) return false;
  const responded = new Set(state.claimResponses);
  return getEligibleClaimers(state).every((i) => responded.has(state.players[i].id));
}

// First-come-first-served claim model: any non-discarder can pong/skip;
// race resolves naturally — once pongCard applies, phase leaves
// 'claim-window' and subsequent pong attempts return state unchanged.

// Penalty-freeze rule (pong-fail / hu-fail aftermath):
//
// After a failed pong, the offender (C) is frozen out of EVERY claim
// window — pong, hu, skip — until their own turn auto-skips them.
// Concretely with seat order A→B→C:
//
//   A discards → C pong-fails → claim window finalizes
//   ↓
//   B's turn: B draws + discards → claim window opens.
//             C must NOT participate (still penalized).
//             autoSkipPenalizedClaimers records C's skip silently.
//   ↓
//   C's turn: skipPenalizedPlayers auto-skips C, clears skipNextTurn.
//   ↓
//   A's turn: A acts again. C is now unfrozen.
//
// Without this auto-skip, B's claim window would block forever waiting
// on C, since C's UI hides the panel for penalized players.
function isFrozen(p: { skipNextTurn: boolean; frozenUntilOwnDiscard?: boolean; hasLeft?: boolean }): boolean {
  // hasLeft permanently freezes the seat — the player quit, their turn
  // is dead-air and they cannot participate in any claim window.
  // frozenUntilOwnDiscard locks the offender out of every claim window
  // for a full round — released only by the offender's own clean discard.
  return !!p.hasLeft || p.skipNextTurn || !!p.frozenUntilOwnDiscard;
}

function autoSkipPenalizedClaimers(state: GameState): GameState {
  if (state.phase !== 'claim-window') return state;
  const newResponses = [...state.claimResponses];
  for (let i = 0; i < state.players.length; i++) {
    if (i === state.discardedByIndex) continue;
    const p = state.players[i];
    if (isFrozen(p) && !newResponses.includes(p.id)) {
      newResponses.push(p.id);
    }
  }
  if (newResponses.length === state.claimResponses.length) return state;
  const next: GameState = { ...state, claimResponses: newResponses };
  return allClaimersResponded(next) ? finalizeClaimWindow(next) : next;
}

function finalizeClaimWindow(state: GameState): GameState {
  if (!state.pendingDiscard) return state;
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    state.discardedByIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );
  const advanced: GameState = {
    ...state,
    discardPile: [...state.discardPile, state.pendingDiscard],
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    winner: isGameOver ? determineWinner(state.players) : state.winner,
  };
  return skipPenalizedPlayers(advanced);
}

// 消費一名罰停玩家的「一次跳過」：
//   - 仍有加重跳過（extraSkipQueued）→ 保留 skipNextTurn、清 extraSkipQueued（這是第 1 跳）。
//   - 否則 → 這是最後一跳，清 skipNextTurn + frozenUntilOwnDiscard（立即解凍）。
// 與 skipPenalizedPlayers 內的逐人邏輯保持一致（DRY）。
function consumeOnePenaltySkip(pl: Player): Player {
  if (pl.extraSkipQueued) {
    return { ...pl, skipNextTurn: true, extraSkipQueued: false };
  }
  return { ...pl, skipNextTurn: false, frozenUntilOwnDiscard: false };
}

// 碰牌偷走出牌權：指針從 discarder 直接跳到 ponger，中間 (discarder+1 … ponger-1)
// 的座位被略過。按「每格都走過」規則（option B），這些被略過的座位若正處於罰停
// （skipNextTurn=true），這一次「被略過」也計作他被跳過一次，與正常 skip 等價。
// 回傳更新後的 players + 為每個被計跳的座位生成的 skip 日誌。
function consumeBypassedPenaltySkips(
  players: Player[],
  discarderIndex: number,
  pongerIndex: number,
  round: number
): { players: Player[]; skipActions: GameAction[] } {
  const n = players.length;
  const skipActions: GameAction[] = [];
  let updated = players;
  if (discarderIndex < 0) return { players: updated, skipActions };
  for (let i = (discarderIndex + 1) % n; i !== pongerIndex; i = (i + 1) % n) {
    const pl = updated[i];
    if (!pl.skipNextTurn) continue; // 只對罰停中的座位補計
    const willClearFreeze = !pl.extraSkipQueued && !!pl.frozenUntilOwnDiscard;
    updated = updated.map((p, idx) => (idx === i ? consumeOnePenaltySkip(p) : p));
    skipActions.push({
      round,
      playerId: pl.id,
      type: 'skip',
      clearedPenalty: willClearFreeze,
      timestamp: Date.now(),
    });
  }
  return { players: updated, skipActions };
}

// Auto-skip any penalized player (skipNextTurn=true) at the head of the turn
// queue. Clears the flag + revealedHand, logs a skip action, and recurses up
// to playerCount times (guard against all-penalized infinite loop).
//
// Safe to call from any 'drawing' state — it's the single source of truth
// for honoring skipNextTurn flags. drawCard/discardCard call this defensively
// as a deadlock guard (see bug #6 fix).
export function skipPenalizedPlayers(state: GameState): GameState {
  let current = state;
  // 加重罰停：每個 frozen 玩家可能被 skip 2 次（extraSkipQueued 觸發第二次）。
  // loop 上限改成 N*2 + safety margin，確保單次調用 consume 完所有 queued skip。
  const maxIters = current.players.length * 3;
  for (let i = 0; i < maxIters; i++) {
    if (current.phase !== 'drawing') return current;
    const p = current.players[current.currentPlayerIndex];
    // hasLeft: permanent seat skip. Their turn is dead-air; we advance
    // immediately, do NOT clear hasLeft (they're out for good).
    if (!p.skipNextTurn && !p.hasLeft) return current;

    // 這次 skip 若是罰停的最後一跳（extraSkipQueued 已消費），完成後立即解凍
    // → 日誌標「解除罰停」。net：罰停 = 錯過 2 個自己的出牌位，跳完即自由。
    const willClearFreeze = !p.extraSkipQueued && !!p.frozenUntilOwnDiscard;
    const skipAction: GameAction = {
      round: current.currentRound,
      playerId: p.id,
      type: 'skip',
      clearedPenalty: willClearFreeze,
      timestamp: Date.now(),
    };
    // Only clear skipNextTurn here — reveals (from hu-fail/pong-fail) must
    // persist through the skip so other players actually see the penalty.
    // They're cleared when this player next draws for real.
    // Also lift any third party's pong-fail freeze that was pointing at
    // this player. The semantic is "frozen until X operates again"; if
    // X keeps getting penalized themselves, a literal-discard requirement
    // would deadlock the third party permanently. A skip counts as X
    // having taken their turn — release the freeze defensively.
    const skippedIdx = current.currentPlayerIndex;
    const newPlayers = current.players.map((pl, idx) => {
      // Only clear skipNextTurn here; frozenUntilOwnDiscard MUST persist
      // through the auto-skipped turn — the offender doesn't get to
      // discard during a skip, so the freeze can't clear until they
      // play a real next turn.
      // 加重罰停：如果 extraSkipQueued=true，被跳過一次後立即重新激活
      // skipNextTurn（下一圈再跳一次）+ 清 extraSkipQueued。net 效果：
      // pong-fail / hu-fail / self-pong-fail 後罰停 2 個 own-turn skip
      // 而不是 1 個。
      if (idx === skippedIdx) {
        if (pl.extraSkipQueued) {
          return { ...pl, skipNextTurn: true, extraSkipQueued: false };
        }
        // 最後一跳完成 → 立即解凍（清 frozenUntilOwnDiscard），玩家恢復碰/胡/出牌。
        return { ...pl, skipNextTurn: false, frozenUntilOwnDiscard: false };
      }
      return pl;
    });
    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      current.currentPlayerIndex,
      current.currentRound,
      current.settings.totalRounds,
      current.players.length
    );
    current = {
      ...current,
      players: newPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...current.actionLog, skipAction],
      winner: isGameOver ? determineWinner(newPlayers) : current.winner,
    };
  }
  return current;
}

export function hasWon(player: Player): boolean {
  const declaredDims = new Set(player.declaredSets.map((s) => s.dimension));
  return DIMENSIONS.every((d) => declaredDims.has(d));
}

export function getDeclaredDimensions(player: Player): Set<Dimension> {
  return new Set(player.declaredSets.map((s) => s.dimension));
}

// Hu (胡) — attempt to declare ALL remaining undeclared dimensions at once
export function attemptHu(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  // Penalized players are frozen out of all claim actions (pong / hu /
  // skip) until their own turn auto-skips AND the original block-discarder
  // operates again. Defensive guard so direct calls from PVP can't bypass
  // the freeze.
  if (isFrozen(player)) return state;
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  // Count personality cards by dimension in hand
  const handByDim: Record<Dimension, PersonalityCard[]> = { O: [], C: [], E: [], A: [], N: [] };
  for (const card of player.hand) {
    if (isPersonalityCard(card)) {
      handByDim[card.dimension].push(card);
    }
  }

  // Check ALL undeclared dimensions have enough cards
  const allSatisfied = DIMENSIONS.every((d) => {
    if (declaredDims.has(d)) return true;
    return handByDim[d].length >= targets[d];
  });

  if (allSatisfied) {
    // HU SUCCESS — declare all remaining dimensions
    const newDeclaredSets = [...player.declaredSets];
    const usedCardIds = new Set<number>();

    for (const d of DIMENSIONS) {
      if (declaredDims.has(d)) continue;
      const cards = handByDim[d].slice(0, targets[d]);
      newDeclaredSets.push({ dimension: d, cards, round: state.currentRound });
      cards.forEach((c) => usedCardIds.add(c.id));
    }

    const newHand = player.hand.filter((c) => !usedCardIds.has(c.id));
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? { ...p, hand: newHand, declaredSets: newDeclaredSets } : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'hu-success',
      timestamp: Date.now(),
    };

    return {
      ...state,
      players: newPlayers,
      actionLog: [...state.actionLog, action],
      phase: 'game-over',
      winner: player.id,
    };
  } else {
    // HU FAIL — same penalty model as pong-fail: skip own next turn +
    // frozen until own next clean discard. Plus full-hand reveal
    // (heavier reveal than pong-fail; matches the stakes of declaring hu).
    // extraSkipQueued=true 讓 skipPenalizedPlayers 跳過該玩家時再 queue 一次。
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? {
            ...p,
            skipNextTurn: true,
            extraSkipQueued: true,
            frozenUntilOwnDiscard: true,
            revealedHand: true,
          }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'hu-fail',
      timestamp: Date.now(),
    };

    // If hu attempted during another player's claim-window, register response
    // and wait for remaining claimers before advancing.
    if (state.phase === 'claim-window' && state.pendingDiscard) {
      const playerId = state.players[playerIndex].id;
      const newResponses = state.claimResponses.includes(playerId)
        ? state.claimResponses
        : [...state.claimResponses, playerId];
      const nextState: GameState = {
        ...state,
        players: newPlayers,
        claimResponses: newResponses,
        actionLog: [...state.actionLog, action],
      };
      return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
    }

    // Own-turn hu-fail: 立即結束本回合 + 罰停下一輪 + 鎖定 claim windows
    // 直到自己再次完成 own-discard。等價於 self-pong-fail 的「罰停一整輪」語義。
    //   1. drawnCard 還回手牌 — 不讓玩家用 discard 解凍 frozenUntilOwnDiscard。
    //   2. advance turn + skipPenalizedPlayers — 本回合就讓位。
    //   3. skipNextTurn 讓下一圈到該玩家時再被跳過一回合。
    // 之前的舊實現：當回合繼續 draw+discard，結果 UI banner 顯示罰停但按鈕沒禁，
    // 玩家事實上「能出牌」+ 當回合 discard 又把 frozenUntilOwnDiscard 清掉了。
    //
    // ⚠️ 邊界：最後一回合 own-turn hu-fail 會觸發 isGameOver=true，winner 由
    // getRankings 推斷（declaredSets desc, hand asc）。被罰停玩家此時手牌 +1
    // (drawnCard 還回) + declaredSets 一張沒加 → 通常 rank 墊底。這是設計
    // 取捨：舊實現允許該玩家最後再補一張人格組，新實現一律不補。
    const handWithDrawnReturned: GameCard[] = state.drawnCard
      ? [...newPlayers[playerIndex].hand, state.drawnCard]
      : newPlayers[playerIndex].hand;
    const finalPlayers = newPlayers.map((p, i) =>
      i === playerIndex ? { ...p, hand: handWithDrawnReturned } : p
    );
    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      playerIndex,
      state.currentRound,
      state.settings.totalRounds,
      state.players.length
    );
    return skipPenalizedPlayers({
      ...state,
      players: finalPlayers,
      drawnCard: null,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(finalPlayers) : null,
    });
  }
}

export function drawCard(state: GameState): GameState {
  // 防禦性 guard：skipNextTurn=true 的玩家不該收到 drawCard — turn advance 時
  // skipPenalizedPlayers 應已經跳過他。出現這種狀態說明上游漏了 skipPenalizedPlayers
  // 調用，兜底強制跳過避免死鎖。
  // 注意：只查 skipNextTurn，不查 frozenUntilOwnDiscard — 後者的解凍條件就是
  // own draw + discard，禁掉 draw 會造成無法解凍的死鎖。
  const guardPlayer = state.players[state.currentPlayerIndex];
  if (guardPlayer?.skipNextTurn) {
    return skipPenalizedPlayers(state);
  }

  let drawPile = state.drawPile;
  let discardPile = state.discardPile;

  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      // No cards left anywhere — force game over to prevent infinite loop
      return {
        ...state,
        phase: 'game-over',
        winner: determineWinner(state.players),
      };
    }
    drawPile = [...discardPile];
    for (let i = drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
    discardPile = [];
  }

  const [drawnCard, ...remaining] = drawPile;
  const currentIdx = state.currentPlayerIndex;
  const action: GameAction = {
    round: state.currentRound,
    playerId: state.players[currentIdx].id,
    type: 'draw',
    card: drawnCard,
    timestamp: Date.now(),
  };

  // Clear penalty reveals only after the player has completed their skip
  // turn (skipNextTurn=false). This keeps reveals visible through own-turn
  // hu-fail + discard + full loop + skip turn, then clears on resume.
  // Also reset selfPongUsedThisTurn — drawing a card marks the start of
  // a fresh turn, so the once-per-turn self-pong gate is restored.
  const newPlayers = state.players.map((p, i) =>
    i === currentIdx && !p.skipNextTurn
      ? { ...p, revealedHand: false, revealedSelectedCards: undefined, selfPongUsedThisTurn: false }
      : i === currentIdx
      ? { ...p, selfPongUsedThisTurn: false }
      : p
  );

  return {
    ...state,
    players: newPlayers,
    drawPile: remaining,
    discardPile,
    drawnCard,
    phase: newPlayers[currentIdx].isHuman ? 'discarding' : 'ai-turn',
    actionLog: [...state.actionLog, action],
  };
}

export function discardCard(state: GameState, cardId: number): GameState {
  // After a successful pong, phase='discarding' with drawnCard=null — ponger
  // must discard directly from hand. Otherwise the normal path: drawnCard
  // is the just-drawn card, also discardable.
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const drawnCard = state.drawnCard;

  const allCards = drawnCard ? [...player.hand, drawnCard] : [...player.hand];
  const cardToDiscard = allCards.find((c) => c.id === cardId);
  if (!cardToDiscard) return state;
  const newHand = allCards.filter((c) => c.id !== cardId);

  const action: GameAction = {
    round: state.currentRound,
    playerId: player.id,
    type: 'discard',
    card: cardToDiscard,
    // 這次出牌若把自己的凍結解除（解凍輪 own discard）→ 標記，方便日誌顯示
    // 「解除罰停」，讓玩家直觀看到罰停確實結束了。
    clearedPenalty: !!player.frozenUntilOwnDiscard,
    timestamp: Date.now(),
  };

  // Apply hand mutation + lift the offender's own penalty freeze.
  // New semantic: frozenUntilOwnDiscard is released when the offender
  // themselves completes a real draw + discard. Other players' freezes
  // are independent of this discard.
  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return {
      ...p,
      hand: newHand,
      frozenUntilOwnDiscard: false,
    };
  });

  // Personality card → claim window; dummy card → advance turn (no claim)
  if (isPersonalityCard(cardToDiscard)) {
    const claimState: GameState = {
      ...state,
      players: newPlayers,
      drawnCard: null,
      pendingDiscard: cardToDiscard,
      discardedByIndex: playerIndex,
      claimResponses: [],
      phase: 'claim-window',
      actionLog: [...state.actionLog, action],
    };
    // Frozen claimers (pong-fail / hu-fail offenders) auto-skip so the
    // window doesn't deadlock waiting on them.
    return autoSkipPenalizedClaimers(claimState);
  }

  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    playerIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );

  return skipPenalizedPlayers({
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, cardToDiscard],
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  });
}

// Pong (碰) — claim a pending discard to complete a dimension.
// First-come-first-served: any non-discarder may attempt pong; the race
// resolves naturally because a successful pong advances the phase out
// of 'claim-window'.
export function pongCard(
  state: GameState,
  pongerIndex: number,
  dimension: Dimension,
  handCardIds: number[]
): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') {
    console.warn('[pong-silent] #1 claim-window-closed', {
      pongerIndex,
      pongerId: state.players[pongerIndex]?.id,
      phase: state.phase,
      hasPendingDiscard: !!state.pendingDiscard,
      discardedByIndex: state.discardedByIndex,
      claimResponses: state.claimResponses,
    });
    return state;
  }
  if (pongerIndex === state.discardedByIndex) {
    console.warn('[pong-silent] #2 self-discard', {
      pongerIndex,
      pongerId: state.players[pongerIndex]?.id,
      discardedByIndex: state.discardedByIndex,
    });
    return state;
  }

  // Penalized players can't pong (matches hu-fail/pong-fail 罰停一輪 rule).
  if (isFrozen(state.players[pongerIndex])) {
    const p = state.players[pongerIndex];
    console.warn('[pong-silent] #3 frozen', {
      pongerIndex,
      pongerId: p.id,
      skipNextTurn: p.skipNextTurn,
      frozenUntilOwnDiscard: p.frozenUntilOwnDiscard,
    });
    return state;
  }

  const ponger = state.players[pongerIndex];
  const pendingCard = state.pendingDiscard;
  const targets = getTargetCounts(ponger.bigFiveScores);
  const targetCount = targets[dimension];

  // 已歸檔維度強 trap：玩家明知碰過仍 commit → 當 pong-fail 處理 + 罰停。
  // UI 端會顯示已歸檔維度按鈕但視覺降級，玩家可在選卡前取消（pongIntent 清空）。
  const alreadyDeclared = getDeclaredDimensions(ponger).has(dimension);

  const selectedHandCards = ponger.hand.filter((c) => handCardIds.includes(c.id));
  const allPongCards = [...selectedHandCards, pendingCard];

  // STRICT count enforcement: user must commit exactly `targetCount` cards
  // total (targetCount - 1 from hand + the pending discard). Selecting
  // fewer OR more is treated as a failed pong and incurs the penalty.
  // This locks in the contract the player declared: "I have exactly N
  // cards of this dimension."
  const exactCount = allPongCards.length === targetCount;
  const allCorrect =
    !alreadyDeclared &&
    exactCount &&
    allPongCards.every(
      (c) => isPersonalityCard(c) && c.dimension === dimension
    );

  if (allCorrect) {
    // PONG SUCCESS
    const declaredCards = allPongCards.filter(isPersonalityCard) as PersonalityCard[];
    const newHand = ponger.hand.filter((c) => !handCardIds.includes(c.id));
    const newDeclaredSets = [
      ...ponger.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];

    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: ponger.id,
      type: 'pong-success',
      dimension,
      cardCount: declaredCards.length,
      timestamp: Date.now(),
    };

    const updatedPonger = newPlayers[pongerIndex];
    if (hasWon(updatedPonger)) {
      return {
        ...state,
        players: newPlayers,
        pendingDiscard: null,
        discardedByIndex: -1,
        claimResponses: [],
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: ponger.id,
      };
    }

    // Option B：碰牌偷走出牌權，指針從 discarder 跳到 ponger，中間被略過的
    // 罰停座位也補計一次跳過（與「每格都走過」一致）。生成對應 skip 日誌。
    const { players: playersAfterBypass, skipActions: bypassSkips } =
      consumeBypassedPenaltySkips(newPlayers, state.discardedByIndex, pongerIndex, state.currentRound);
    const logWithPong = [...state.actionLog, action, ...bypassSkips];

    // Edge case (empty-hand deadlock): a non-winning pong can consume the
    // ponger's ENTIRE hand (e.g. their last 2 cards were both the ponged
    // dimension). They'd then be stuck in 'discarding' with no card to
    // discard and no drawnCard → permanent deadlock. In that case the
    // stolen turn simply ends: advance to the next player.
    const pongerNewHand = playersAfterBypass[pongerIndex].hand;
    if (pongerNewHand.length === 0) {
      const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
        pongerIndex,
        state.currentRound,
        state.settings.totalRounds,
        state.players.length
      );
      return skipPenalizedPlayers({
        ...state,
        players: playersAfterBypass,
        pendingDiscard: null,
        discardedByIndex: -1,
        claimResponses: [],
        currentPlayerIndex: nextPlayerIndex,
        currentRound: nextRound,
        phase: isGameOver ? 'game-over' : 'drawing',
        drawnCard: null,
        actionLog: logWithPong,
        winner: isGameOver ? determineWinner(playersAfterBypass) : null,
      });
    }

    // Pong steals the turn: ponger plays next. Per bug #7, ponger does
    // NOT draw a new card — they must immediately discard one from hand.
    // phase='discarding' + drawnCard=null signals this state.
    return skipPenalizedPlayers({
      ...state,
      players: playersAfterBypass,
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
      currentPlayerIndex: pongerIndex,
      phase: 'discarding',
      drawnCard: null,
      actionLog: logWithPong,
      winner: null,
    });
  } else {
    // PONG FAIL — only the cards used in the failed bet are exposed
    // (NOT the full hand; full-hand reveal is reserved for hu-fail).
    // Ponger gets two penalty marks:
    //   1. skipNextTurn — auto-skip at their next own turn
    //   2. frozenUntilOwnDiscard — locked out of every claim window
    //      until the offender themselves completes a fresh draw+discard
    //      (after the auto-skip turn). Equivalent to "罰停一整輪":
    //      no claim participation for the full cycle, then skip own turn,
    //      then play one real turn to clear.
    const exposedCards = selectedHandCards;
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? {
            ...p,
            skipNextTurn: true,
            extraSkipQueued: true,
            frozenUntilOwnDiscard: true,
            revealedSelectedCards: exposedCards,
          }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: ponger.id,
      type: 'pong-fail',
      dimension,
      cardCount: allPongCards.length,
      failReason: alreadyDeclared ? 'already-declared' : 'wrong-cards',
      timestamp: Date.now(),
    };

    const pongerId = state.players[pongerIndex].id;
    const newResponses = state.claimResponses.includes(pongerId)
      ? state.claimResponses
      : [...state.claimResponses, pongerId];

    const nextState: GameState = {
      ...state,
      players: newPlayers,
      claimResponses: newResponses,
      actionLog: [...state.actionLog, action],
    };

    return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
  }
}

// Self-pong (自摸碰) — declare a dimension on your own turn from your
// own cards (hand + just-drawn). Triggered during your 'drawing' /
// 'discarding' phase. STRICT count: must commit exactly `targetCount`
// same-dimension cards. Wrong count or wrong dimension → pong-fail
// penalty (skipNextTurn + selected-card reveal).
//
// Distinct from pongCard:
//   - Failure still applies frozenUntilOwnDiscard like pongCard does.
//   - All cards come from the ponger's own pool (hand + drawnCard).
//   - On success the ponger stays as currentPlayer in 'discarding' phase
//     (they still owe a discard, whether or not drawnCard was used).
export function selfPongCard(
  state: GameState,
  pongerIndex: number,
  dimension: Dimension,
  cardIds: number[]
): GameState {
  if (state.phase !== 'drawing' && state.phase !== 'discarding') return state;
  if (state.currentPlayerIndex !== pongerIndex) return state;

  const ponger = state.players[pongerIndex];
  if (isFrozen(ponger)) return state;
  // 已歸檔維度強 trap：玩家明知碰過仍提交自摸 → 走 SELF-PONG FAIL 罰停。
  // 優先級順序（前者命中即 return / fail 不再判後續）：
  //   1. isFrozen → silent reject（受罰狀態不可參與任何動作，UI 也禁掉了按鈕）
  //   2. selfPongUsedThisTurn → silent reject（本回合已用過一次，硬規則優先於
  //      trap；不會把"再次提交已歸檔維度"算作 fail，否則玩家無法理解爲啥被罰）
  //   3. alreadyDeclared 進入 FAIL 分支（強 trap）— 必須先成功過一次，且未
  //      在本回合用掉 self-pong 名額，再 commit 同維度纔會觸發
  const alreadyDeclared = getDeclaredDimensions(ponger).has(dimension);
  // One self-pong per turn. Cleared when the player draws on their
  // next turn (drawCard).
  if (ponger.selfPongUsedThisTurn) return state;

  const targets = getTargetCounts(ponger.bigFiveScores);
  const targetCount = targets[dimension];

  // Pool = current hand + the freshly-drawn card (if any).
  const pool: GameCard[] = [
    ...ponger.hand,
    ...(state.drawnCard ? [state.drawnCard] : []),
  ];
  const selected = pool.filter((c) => cardIds.includes(c.id));

  const exactCount = selected.length === targetCount;
  const allCorrect =
    !alreadyDeclared &&
    exactCount &&
    selected.every(
      (c) => isPersonalityCard(c) && c.dimension === dimension
    );

  if (allCorrect) {
    const declaredCards = selected as PersonalityCard[];
    const drawnUsed = state.drawnCard && cardIds.includes(state.drawnCard.id);
    const newHand = ponger.hand.filter((c) => !cardIds.includes(c.id));
    const newDrawn = drawnUsed ? null : state.drawnCard;

    const newDeclaredSets = [
      ...ponger.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets, selfPongUsedThisTurn: true }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: ponger.id,
      type: 'pong-success',
      dimension,
      cardCount: declaredCards.length,
      timestamp: Date.now(),
    };

    const updatedPonger = newPlayers[pongerIndex];
    if (hasWon(updatedPonger)) {
      return {
        ...state,
        players: newPlayers,
        drawnCard: newDrawn,
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: ponger.id,
      };
    }

    // Empty-hand deadlock guard (same as pongCard): if the self-pong
    // consumed every card the player could discard (hand empty AND no
    // leftover drawnCard), there's nothing to discard — end the turn.
    if (newHand.length === 0 && newDrawn === null) {
      const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
        pongerIndex,
        state.currentRound,
        state.settings.totalRounds,
        state.players.length
      );
      return skipPenalizedPlayers({
        ...state,
        players: newPlayers,
        drawnCard: null,
        currentPlayerIndex: nextPlayerIndex,
        currentRound: nextRound,
        phase: isGameOver ? 'game-over' : 'drawing',
        actionLog: [...state.actionLog, action],
        winner: isGameOver ? determineWinner(newPlayers) : null,
      });
    }

    // Stays in discarding — player still owes one discard.
    return {
      ...state,
      players: newPlayers,
      drawnCard: newDrawn,
      phase: 'discarding',
      actionLog: [...state.actionLog, action],
    };
  }

  // SELF-PONG FAIL — full "罰停一整輪" treatment.
  //   1. drawnCard returns to hand — letting the offender discard would
  //      immediately clear frozenUntilOwnDiscard, nullifying the freeze.
  //   2. skipNextTurn=true — the offender ALSO loses their next own-turn
  //      (no draw, no discard). Combined with frozenUntilOwnDiscard,
  //      this forces the offender to sit through TWO full rounds of
  //      claim windows before the second own-turn finally clears the
  //      freeze. The first own turn is consumed by the auto-skip.
  //   3. frozenUntilOwnDiscard=true — blocks every claim window between
  //      now and the second own-turn discard.
  // Net cost: ~6 claim windows + 1 own-turn skip. Yes, this is heavier
  // than pong-fail (4 + 1) — by design, because the offender has more
  // information (they already saw the drawnCard + chose a dim).
  const exposedCards = selected;
  const handWithDrawnReturned: GameCard[] = state.drawnCard
    ? [...ponger.hand, state.drawnCard]
    : ponger.hand;
  const newPlayers = state.players.map((p, i) =>
    i === pongerIndex
      ? {
          ...p,
          hand: handWithDrawnReturned,
          skipNextTurn: true,
          extraSkipQueued: true,
          frozenUntilOwnDiscard: true,
          revealedSelectedCards: exposedCards,
        }
      : p
  );

  const action: GameAction = {
    round: state.currentRound,
    playerId: ponger.id,
    type: 'pong-fail',
    dimension,
    cardCount: selected.length,
    failReason: alreadyDeclared ? 'already-declared' : 'wrong-cards',
    timestamp: Date.now(),
  };

  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    state.currentPlayerIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );

  return skipPenalizedPlayers({
    ...state,
    players: newPlayers,
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  });
}

// A single claimer passes. Pending card only moves to discard pile after
// every eligible non-discarder has responded (skip / pong-fail / hu-fail).
// First-come-first-served — no priority gating.
export function skipPong(state: GameState, playerIndex: number): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') return state;

  const playerId = state.players[playerIndex].id;
  if (state.claimResponses.includes(playerId)) return state;
  if (playerIndex === state.discardedByIndex) return state;

  const nextState: GameState = {
    ...state,
    claimResponses: [...state.claimResponses, playerId],
  };

  return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
}

function advancePlayer(
  currentIndex: number,
  currentRound: number,
  totalRounds: number,
  playerCount: number = 4
): { nextPlayerIndex: number; nextRound: number; isGameOver: boolean } {
  const nextPlayerIndex = (currentIndex + 1) % playerCount;
  const isRoundEnd = nextPlayerIndex === 0;
  const nextRound = isRoundEnd ? currentRound + 1 : currentRound;
  // totalRounds = 0 means unlimited
  const isGameOver = totalRounds > 0 && isRoundEnd && nextRound > totalRounds;
  return { nextPlayerIndex, nextRound, isGameOver };
}

function determineWinner(players: Player[]): PlayerId {
  const ranked = getRankings(players);
  return ranked[0].id;
}

export function getPlayerScore(player: Player): number {
  return calculateFinalScore(player.declaredSets.length, player.hand);
}

export function getRankings(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const declDiff = b.declaredSets.length - a.declaredSets.length;
    if (declDiff !== 0) return declDiff;
    return a.hand.length - b.hand.length;
  });
}

// Mark a player as having quit. The seat stays in players[] (indexes
// must remain stable for currentPlayerIndex / discardedByIndex), but
// the player is treated as permanently frozen by isFrozen() —
// skipPenalizedPlayers will fast-forward their turn forever.
//
// Side-effects we have to handle here:
//   1. If the leaver was the current player, advance the turn and
//      run skipPenalizedPlayers so the next live player gets control.
//   2. If we're inside a claim-window, auto-pass for the leaver so
//      we don't deadlock waiting on their response.
//   3. If fewer than 2 active players remain, end the game now and
//      award the last-standing seat (or the highest-ranked active
//      player) the win.
export function markPlayerLeft(state: GameState, playerId: string): GameState {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return state;
  if (state.players[idx].hasLeft) return state;
  if (state.phase === 'game-over') return state;

  const newPlayers = state.players.map((p, i) =>
    i === idx ? { ...p, hasLeft: true } : p
  );

  const activeCount = newPlayers.filter((p) => !p.hasLeft).length;

  // End the game if 0 or 1 active players left.
  if (activeCount <= 1) {
    const lastStanding = newPlayers.find((p) => !p.hasLeft);
    const winnerId = lastStanding
      ? lastStanding.id
      : getRankings(newPlayers)[0]?.id ?? null;
    return {
      ...state,
      players: newPlayers,
      phase: 'game-over',
      winner: winnerId,
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
    };
  }

  let next: GameState = { ...state, players: newPlayers };

  // Inside a claim-window we have to record the leaver as having
  // implicitly passed so allClaimersResponded() can fire.
  if (next.phase === 'claim-window') {
    const leftId = newPlayers[idx].id;
    if (!next.claimResponses.includes(leftId) && next.discardedByIndex !== idx) {
      next = { ...next, claimResponses: [...next.claimResponses, leftId] };
    }
    next = autoSkipPenalizedClaimers(next);
    // If everyone else already responded, finalize.
    if (next.phase === 'claim-window' && allClaimersResponded(next)) {
      next = finalizeClaimWindow(next);
    }
  }

  // If we ended up handing control to the leaver (their own turn at
  // the moment they quit, or finalize-claim landed on them), force the
  // turn-skip machinery to step past them.
  if (
    next.phase === 'drawing' &&
    next.players[next.currentPlayerIndex].hasLeft
  ) {
    // Synthesize the same skip flow used by skipPenalizedPlayers.
    next = skipPenalizedPlayers(next);
  } else if (
    (next.phase === 'discarding' || next.phase === 'drawing') &&
    next.currentPlayerIndex === idx
  ) {
    // Mid-turn leave (e.g. they had drawn but not yet discarded). Move
    // on cleanly.
    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      idx,
      next.currentRound,
      next.settings.totalRounds,
      next.players.length
    );
    next = {
      ...next,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      drawnCard: null,
      phase: isGameOver ? 'game-over' : 'drawing',
      winner: isGameOver ? getRankings(next.players)[0]?.id ?? null : next.winner,
    };
    if (next.phase === 'drawing') next = skipPenalizedPlayers(next);
  }

  return next;
}
