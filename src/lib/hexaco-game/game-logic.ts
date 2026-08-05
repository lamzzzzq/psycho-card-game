// HEXACO 遊戲引擎（src/lib/game-logic.ts 的六維物理隔離副本，2026-08-05 複製）。
// 規則邏輯與 Big Five 版逐行一致（食胡/碰/自摸碰/罰停/離場全套），僅：
//   1. 類型換成 @/types/hexaco-game（六維 H/E/X/A/C/O）
//   2. bigFiveScores → hexacoScores
//   3. attemptHu 的 handByDim 字面量擴到六鍵
// ⚠️ Big Five 側修 bug 時記得同步這裡（隔離是老闆定的，重複維護成本已知情）。
import {
  GameState,
  GameSettings,
  Player,
  HexacoScores,
  GameCard,
  PlayerId,
  GameAction,
  Dimension,
  DIMENSIONS,
  isPersonalityCard,
  isDummyCard,
  PersonalityCard,
} from '@/types/hexaco-game';
import { AI_PERSONAS } from '@/data/ai-personas';
import { generateAIScores, calculateFinalScore, getTargetCounts } from './scoring';
import { createShuffledDeck, dealCardsVariable } from './card-engine';

function createPlayer(
  id: PlayerId,
  name: string,
  avatar: string,
  hand: GameCard[],
  isHuman: boolean,
  hexacoScores: HexacoScores,
  nameEn?: string
): Player {
  return {
    id, name, nameEn, avatar, hand, isHuman, hexacoScores,
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
  };
}

export function initializeGame(
  humanScores: HexacoScores,
  settings: GameSettings,
  humanAvatar: string = '🧑'
): GameState {
  const aiScoresList = AI_PERSONAS.map(() => generateAIScores());
  const allScores = [humanScores, ...aiScoresList];

  const deck = createShuffledDeck(allScores.length);
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = [
    createPlayer('human', '你', humanAvatar, hands[0], true, humanScores, 'You'),
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

// 「欠一張罰棄牌」的前提是手上真有牌可棄（手牌 或 剛摸的那張）。
// 理論上到不了 false：碰牌成功、自摸碰成功都有空手兜底，不會把玩家留在
// 「discarding 但一張牌都沒有」的狀態。但萬一到了，讓他卡在一個永遠棄不出去的
// 回合是最壞的結果（整局作廢），所以兩條 fail 路徑都用它兜一道，false 就直接讓位。
function canStillDiscard(state: GameState, playerIndex: number): boolean {
  return state.players[playerIndex].hand.length > 0 || !!state.drawnCard;
}

// fail 之後直接結束該玩家的回合（兜底路徑：沒牌可棄，或食胡失敗發生在摸牌前）。
function endTurnAfterFailure(
  state: GameState,
  playerIndex: number,
  players: Player[],
  action: GameAction
): GameState {
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    playerIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );
  // 走這條路 = 這回合就此結束，不欠棄牌了（呼叫方可能已經先標上）。
  const cleared = players.map((p, i) =>
    i === playerIndex ? { ...p, owesPenaltyDiscard: false } : p
  );
  return skipPenalizedPlayers({
    ...state,
    players: cleared,
    // 已摸未棄的那張進棄牌堆 —— 直接置 null 會讓它從牌池蒸發（重洗時永久缺失）。
    discardPile: state.drawnCard ? [...state.discardPile, state.drawnCard] : state.discardPile,
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(cleared) : null,
  });
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
  // 終局守衛：其餘 action 都有 phase 檢查，唯獨 hu 沒有 —— PVP 下遲到的
  // hu action-request（最後一輪 claim 超時 finalize / last-standing 判勝的
  // 同一瞬間）會走到 hu-fail 分支把 phase 改回 'drawing'、winner 清空，
  // 已寫入 DB 的終局被廣播「復活」成殭屍續局。
  if (state.phase === 'game-over') return state;
  const player = state.players[playerIndex];
  // Penalized players are frozen out of all claim actions (pong / hu /
  // skip) until their own turn auto-skips AND the original block-discarder
  // operates again. Defensive guard so direct calls from PVP can't bypass
  // the freeze.
  if (isFrozen(player)) return state;
  // 老闆規則：本回合已經用過自摸碰 → 這回合不能再食胡（「他沒看出自己能胡，
  // 選了自摸碰，那這回合就認了」）。只鎖【自己回合】——別人棄牌的判讀窗口裏
  // 截胡不受影響（selfPongUsedThisTurn 要到自己下次抽牌才清，不 gate 會誤鎖截胡）。
  // UI 那邊直接把食胡鈕隱藏掉，這裏是 PVP 直調 / 亂序消息的防禦。
  // 限定 discarding/ai-turn：selfPongUsedThisTurn 要到玩家【真的摸牌】才清，所以
  // 下一回合的 drawing 階段它還掛着 true —— 不限定階段的話會把下一回合也一起鎖了。
  if (
    (state.phase === 'discarding' || state.phase === 'ai-turn') &&
    playerIndex === state.currentPlayerIndex &&
    player.selfPongUsedThisTurn
  ) {
    return state;
  }
  const targets = getTargetCounts(player.hexacoScores);
  const declaredDims = getDeclaredDimensions(player);

  // 胡牌牌池 = 手牌 + 刚摸到的牌(自摸胡) + 正在截胡的弃牌(荣胡)。三处都要算，
  // 漏任一处都会在「靠那张补齐」时把胡误判为张数不够而失败：
  //   - drawnCard：自己摸到的最后一张(与 hand 分开存，见 selfPongCard)。自摸胡。
  //   - pendingDiscard：别人打出、你在 claim-window 里截胡的那张(你不是弃牌者本人时)。荣胡。
  const claimCard: GameCard | null =
    state.phase === 'claim-window' && state.pendingDiscard && playerIndex !== state.discardedByIndex
      ? state.pendingDiscard
      : null;
  const pool: GameCard[] = [
    ...player.hand,
    ...(state.drawnCard ? [state.drawnCard] : []),
    ...(claimCard ? [claimCard] : []),
  ];
  const handByDim: Record<Dimension, PersonalityCard[]> = { H: [], E: [], X: [], A: [], C: [], O: [] };
  for (const card of pool) {
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

    // 从 pool(含 drawnCard) 里过滤，避免刚抽到的牌被消耗后仍残留
    const newHand = pool.filter((c) => !usedCardIds.has(c.id));
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
      drawnCard: null,
      // 荣胡：被截的弃牌已并入胜者归档，清掉 pending（不进弃牌堆）。自摸胡时本就是 null。
      pendingDiscard: null,
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

    // 自己回合的 hu-fail（已經摸了牌 或 碰完欠一張）：【留在原地，把那張牌棄掉】。
    //
    // 舊實現是把 drawnCard 塞回手牌 + 立刻讓位，結果那張牌永遠沒棄出去 —— 該玩家
    // 站立手牌從此永久 +1，打破「手牌 = 剩餘目標總和 − 1」不變量：之後他摸牌前
    // 就能合法胡，而且【故意胡錯就能白賺一張牌】，只賠一次罰停。老闆實測發現
    // （「如果人哋撳咗 Win 掣，冇出到牌，下次再 draw 嘅時候就會多咗一張牌」）。
    // 碰成功後那條路徑本來就是這麼處理的，這裏只是把兩條路合成同一條。
    //
    // owesPenaltyDiscard=true：
    //   - 讓 UI 知道「雖然你被罰停了，但這一張還是得你自己點出來」（否則
    //     isDiscarding 會因為 skipNextTurn 而是 false，玩家點不動 = 死鎖）；
    //   - 讓 discardCard 知道這次棄牌【不解凍】，罰停力度和舊實現一樣重。
    // 這張罰出來的牌照常開判讀窗口給別人碰/截胡（老闆定的），終局判定也自然
    // 落在棄牌之後 —— 都走 discardCard 的常規路徑。
    const owingPlayers = newPlayers.map((p, i) =>
      i === playerIndex ? { ...p, owesPenaltyDiscard: true } : p
    );
    if (
      (state.phase === 'discarding' || state.phase === 'ai-turn') &&
      canStillDiscard(state, playerIndex)
    ) {
      return {
        ...state,
        players: owingPlayers,
        actionLog: [...state.actionLog, action],
      };
    }

    // phase === 'drawing'：還沒摸牌，手上沒有多出來的牌 → 沒有棄牌可欠，直接讓位。
    // （UI 已把摸牌前的食胡鈕置灰，這條只在 PVP 亂序/重放消息下才走到。）
    return endTurnAfterFailure(state, playerIndex, newPlayers, action);
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
  // owesPenaltyDiscard 也一併清掉：摸牌代表上一回合已經結束，任何殘留的「欠一張
  // 罰棄牌」都作廢。正常流程下它在 discardCard 就清了，這裏是防呆 —— 萬一某條路徑
  // 讓回合在沒棄牌的情況下過去了，殘留的標誌會讓他下一次正常棄牌被誤判成罰棄牌
  // （不解凍），白白多凍一輪。
  const newPlayers = state.players.map((p, i) =>
    i === currentIdx && !p.skipNextTurn
      ? { ...p, revealedHand: false, revealedSelectedCards: undefined, selfPongUsedThisTurn: false, owesPenaltyDiscard: false }
      : i === currentIdx
      ? { ...p, selfPongUsedThisTurn: false, owesPenaltyDiscard: false }
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

  // 罰棄牌：食胡失敗 / 自摸碰失敗之後欠的那一張。它【不算】解凍用的乾淨出牌 ——
  // 否則「胡錯 → 馬上棄一張 → 立刻解凍」，罰停等於白罰。玩家仍要照常被跳過
  // 兩個 own-turn，由 skipPenalizedPlayers 在最後一跳時解凍。
  const isPenaltyDiscard = !!player.owesPenaltyDiscard;

  const action: GameAction = {
    round: state.currentRound,
    playerId: player.id,
    type: 'discard',
    card: cardToDiscard,
    // 這次出牌若把自己的凍結解除（解凍輪 own discard）→ 標記，方便日誌顯示
    // 「解除罰停」，讓玩家直觀看到罰停確實結束了。
    clearedPenalty: !isPenaltyDiscard && !!player.frozenUntilOwnDiscard,
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
      owesPenaltyDiscard: false,
      frozenUntilOwnDiscard: isPenaltyDiscard ? p.frozenUntilOwnDiscard : false,
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

  // 已表態（跳過/胡敗）者不能回頭再碰 —— skipPong 有這道守衛而這裡沒有，
  // PVP 直調 pongCard 時 skip 後的亂序/重放消息可繞回來碰。
  if (state.claimResponses.includes(state.players[pongerIndex].id)) {
    console.warn('[pong-silent] #4 already-responded', {
      pongerIndex,
      pongerId: state.players[pongerIndex].id,
    });
    return state;
  }

  const ponger = state.players[pongerIndex];
  const pendingCard = state.pendingDiscard;
  const targets = getTargetCounts(ponger.hexacoScores);
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

    // 碰成功 = 把出牌權搶過來，對 ponger 而言是【全新的一回合】：
    // selfPongUsedThisTurn 必須清掉。否則他上一回合用過自摸碰的話，這個標誌會一路
    // 帶到碰來的這回合 —— 自摸碰鈕被鎖死，更要命的是「碰完即胡」也會被
    // attemptHu 的「本回合用過自摸碰就不能胡」守衛擋掉（該守衛 2026-08-01 加）。
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets, selfPongUsedThisTurn: false }
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
  // ⚠️ 只允许在 'discarding' 阶段自摸碰（= 本回合已抽牌 或 刚碰过牌）。
  // 若允许在 'drawing' 阶段（还没抽牌）自摸碰，则「自摸碰(净0)+强制弃牌(-1)」
  // 会净掉一张牌：玩家跳过了抽牌却仍弃牌 → 持牌从 T-1 掉到 T-2（bug 报告：
  // 对方罚停时连续自摸碰、抽少一次牌）。抽牌后自摸(hand+drawnCard)或截胡碰后
  // 自摸(已+1弃牌)都守恒。
  if (state.phase !== 'discarding') return state;
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

  const targets = getTargetCounts(ponger.hexacoScores);
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
  //   1. 【仍然要棄一張牌】：留在 discarding + owesPenaltyDiscard=true。舊實現是
  //      把 drawnCard 塞回手牌直接讓位，那張牌永遠沒棄出去 → 站立手牌永久 +1，
  //      故意碰錯就能白賺一張牌（見 attemptHu 裏同款註釋）。這次棄牌【不解凍】
  //      （discardCard 看 owesPenaltyDiscard），所以罰停力度和舊實現一樣重。
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
  // drawnCard 留在原處（不塞回手牌）—— 玩家等下要從「手牌 + 剛摸的那張」裏
  // 挑一張棄掉，跟正常回合一模一樣。selfPongUsedThisTurn 也照樣記，本回合不能再碰。
  const newPlayers = state.players.map((p, i) =>
    i === pongerIndex
      ? {
          ...p,
          skipNextTurn: true,
          extraSkipQueued: true,
          frozenUntilOwnDiscard: true,
          selfPongUsedThisTurn: true,
          owesPenaltyDiscard: true,
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

  // 留在 discarding：本回合還沒完 —— 罰歸罰，這一張牌照樣要棄出去（老闆定的）。
  // 讓位、判讀窗口、終局判定全部交給接下來的 discardCard 走常規路徑。
  // canStillDiscard 兜底：手上一張牌都沒有時不能欠棄牌（會卡死），直接讓位。
  if (!canStillDiscard(state, pongerIndex)) {
    return endTurnAfterFailure(state, pongerIndex, newPlayers, action);
  }
  return {
    ...state,
    players: newPlayers,
    actionLog: [...state.actionLog, action],
  };
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

  // End the game if 0 or 1 active players left. 只剩 1 人 → 該玩家直接躺贏
  // （與 /rules、教學「規則要點」的文案一致）。0 人（全退光）則按排名取第一。
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
    // on cleanly. 已摸未棄的那張牌回棄牌堆 —— 直接置 null 會讓它從全部
    // 牌池蒸發（摸牌堆耗盡重洗時永久缺失）。
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
      discardPile: next.drawnCard ? [...next.discardPile, next.drawnCard] : next.discardPile,
      drawnCard: null,
      phase: isGameOver ? 'game-over' : 'drawing',
      winner: isGameOver ? getRankings(next.players)[0]?.id ?? null : next.winner,
    };
    if (next.phase === 'drawing') next = skipPenalizedPlayers(next);
  }

  return next;
}
