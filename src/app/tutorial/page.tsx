'use client';

import { useMemo, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { TarotCard } from '@/components/game/TarotCard';
import { cardToTarotProps } from '@/components/game/cardToTarotProps';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS } from '@/types';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, type Locale } from '@/lib/i18n';
import { TUTORIAL_T } from '@/lib/i18n/tutorial';
import type { GameCard, PersonalityCard, DummyCard, Dimension } from '@/types';

type TutStrings = (typeof TUTORIAL_T)['zh'];
// 維度名按 locale 取（沙盒裏所有 ${維度名} 都用它解析）。
type DimName = (dim: Dimension) => string;

// ─── Interactive Sandbox ─────────────────────────────────────────────────
// 真正可點擊的教學場景。固定 12 張牌的劇本，玩家按順序：
//   1. 點牌堆抽牌
//   2. 點自摸碰 → 選牌
//   3. 故意選錯 → 看失敗演示 → 重置
//   4. 選對 → 歸檔成功
//   5. 出 1 張牌結束回合

// 教学沙盒卡用自造 id(101+)，本身无对应 /cards 图。imageId 指向「同维度的一张真题图」(1-50)，
// 让沙盒也显示真插画、且不刷 /cards/101.webp 这类 404（教学演示，图文不必严格对应）。
const DIM_IMG: Record<Dimension, number> = { E: 1, A: 2, C: 3, N: 4, O: 5 };
const PC = (id: number, dim: Dimension, text: string, textEn: string, facet = 'demo'): PersonalityCard => ({
  id, dimension: dim, text, textEn, facet, imageId: DIM_IMG[dim],
});
// 知识牌：term 存进 text、定义存进 definition（与正式 KNOWLEDGE_CARDS 一致，英文）。
const DC = (id: number, term: string, definition: string): DummyCard => ({ id, text: term, definition, isDummy: true });

// Card 組件只渲染 card.text，故按 locale 把 text 換成對應語言（不改 Card 邏輯）。
const locCard = <T extends GameCard>(c: T, loc: Locale): T =>
  loc === 'en' && c.textEn ? ({ ...c, text: c.textEn } as T) : c;

// 歸檔 4 張神經質後，手裏留兩對（盡責性 104/108、宜人性 105/106）+ 兩張單張 +
// 知識牌 → 無論玩家棄哪一張，都至少剩一對可用於「截胡碰」演示。
const SANDBOX_HAND: GameCard[] = [
  PC(101, 'N', '我經常感到焦慮或憂慮', 'I often feel anxious or worried'),
  PC(102, 'N', '我容易情緒波動', 'My mood swings easily'),
  PC(103, 'N', '我容易感到壓力', 'I get stressed out easily'),
  PC(104, 'C', '我會認真完成我承諾過的事', 'I follow through on what I promise'),
  PC(105, 'A', '我願意體諒別人的感受', 'I am willing to consider others’ feelings'),
  PC(106, 'A', '我會主動幫助遇到困難的人', 'I take the initiative to help people in trouble'),
  PC(107, 'O', '我對抽象的哲學問題很感興趣', 'I am interested in abstract, philosophical questions'),
  PC(108, 'C', '我做事情之前總會制定計劃', 'I always make a plan before doing things'),
  DC(109, 'Trait Theory', 'Views personality as a configuration of stable, measurable traits.'),
];
const SANDBOX_DRAWN: PersonalityCard = PC(110, 'N', '我對批評比較敏感', 'I am rather sensitive to criticism');
// 對手棄牌（截胡碰用）：維度在 open-claim 時按手裏現存的對子動態選定。
const CLAIM_CARDS: Record<Dimension, PersonalityCard> = {
  O: PC(111, 'O', '我喜歡探索新奇的點子', 'I enjoy exploring novel ideas'),
  C: PC(111, 'C', '我做事一向井井有條', 'I keep things well-organized'),
  E: PC(111, 'E', '我在人群裏很有活力', 'I feel energetic among people'),
  A: PC(111, 'A', '我會站在別人的角度想', 'I see things from others’ perspective'),
  N: PC(111, 'N', '我對批評比較敏感', 'I am rather sensitive to criticism'),
};

type Scene =
  | 'start'           // 等抽牌
  | 'viewing'         // 查看 2 張
  | 'after-draw'      // 抽完，等點自摸碰
  | 'pong-dimension'  // 自摸碰後先選人格維度
  | 'pong-picking'    // 選牌中
  | 'pong-failed'     // 演示失敗，等點「重置」
  | 'pong-success'    // 歸檔成功，等出牌
  | 'claim-window'    // 對手棄牌，等碰/食胡
  | 'claim-success'   // 截胡碰成功
  | 'hu-demo'         // 食胡演示
  | 'discard-picking' // 選要棄的牌
  | 'done';           // 完成本回合

interface SandboxState {
  scene: Scene;
  hand: GameCard[];
  drawnCard: GameCard | null;
  selectedIds: number[];
  revealedIds: number[];
  revealedAll: boolean;          // 自摸碰激活後揭開所有牌的維度（便於教學，真實遊戲不會）
  chosenDim: Dimension | null;   // 自摸碰選定要歸檔的人格維度
  claimDim: Dimension | null;    // 截胡碰演示的維度（按手牌動態定）
  declared: boolean;             // 是否已歸檔
  claimDeclared: boolean;
  penaltyShown: boolean;
  feedback: { tone: 'success' | 'fail' | 'info'; text: string } | null;
  failCount: number;             // 失敗次數（用於切換 caption）
}

const initialState: SandboxState = {
  scene: 'start',
  hand: SANDBOX_HAND,
  drawnCard: null,
  selectedIds: [],
  revealedIds: [],
  revealedAll: false,
  chosenDim: null,
  claimDim: null,
  declared: false,
  claimDeclared: false,
  penaltyShown: false,
  feedback: null,
  failCount: 0,
};

type Action =
  | { type: 'draw' }
  | { type: 'view-two' }
  | { type: 'finish-view' }
  | { type: 'open-pong' }
  | { type: 'choose-dim'; dim: Dimension }
  | { type: 'toggle-select'; id: number }
  | { type: 'commit-pong' }
  | { type: 'cancel-pong' }
  | { type: 'continue-after-fail' }
  | { type: 'pick-discard'; id: number }
  | { type: 'open-claim' }
  | { type: 'commit-claim' }
  | { type: 'show-hu' }
  | { type: 'reset' };

function createReducer(s: TutStrings, dimName: DimName) {
  return function reducer(state: SandboxState, action: Action): SandboxState {
  switch (action.type) {
    case 'draw':
      if (state.scene !== 'start') return state;
      return {
        ...state,
        scene: 'viewing',
        drawnCard: SANDBOX_DRAWN,
        feedback: { tone: 'success', text: s.fbDraw },
      };
    case 'view-two':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        revealedIds: [104, 110],
        feedback: { tone: 'info', text: s.fbViewTwo },
      };
    case 'finish-view':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        scene: 'after-draw',
        feedback: { tone: 'success', text: s.fbFinishView },
      };
    case 'open-pong':
      if (state.scene !== 'after-draw') return state;
      return {
        ...state,
        scene: 'pong-dimension',
        revealedAll: true, // 教學模式揭開維度，方便玩家看牌選維度
        selectedIds: [],
        chosenDim: null,
        feedback: { tone: 'info', text: s.fbOpenPong },
      };
    case 'choose-dim': {
      if (state.scene !== 'pong-dimension') return state;
      const name = dimName(action.dim);
      return {
        ...state,
        scene: 'pong-picking',
        chosenDim: action.dim,
        selectedIds: [],
        feedback: { tone: 'info', text: s.fbChooseDim(name, 4) },
      };
    }
    case 'toggle-select':
      if (state.scene !== 'pong-picking' && state.scene !== 'claim-window') return state;
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((i) => i !== action.id)
          : [...state.selectedIds, action.id],
      };
    case 'commit-pong': {
      if (state.scene !== 'pong-picking') return state;
      const pool: GameCard[] = [...state.hand, ...(state.drawnCard ? [state.drawnCard] : [])];
      const selected = pool.filter((c) => state.selectedIds.includes(c.id));
      const dim = state.chosenDim;
      const allMatch = !!dim && selected.every((c) => !c.isDummy && 'dimension' in c && c.dimension === dim);
      const correctCount = selected.length === 4;
      if (allMatch && correctCount) {
        // 成功：4 張神經質從手牌移除，drawnCard 也消耗
        const remaining = state.hand.filter((c) => !state.selectedIds.includes(c.id));
        const drawnUsed = state.drawnCard && state.selectedIds.includes(state.drawnCard.id);
        return {
          ...state,
          scene: 'pong-success',
          hand: remaining,
          drawnCard: drawnUsed ? null : state.drawnCard,
          selectedIds: [],
          declared: true,
          feedback: { tone: 'success', text: s.fbPongSuccess },
        };
      }
      // 失敗
      const dName = dim ? dimName(dim) : s.fallbackDimName;
      const reason = !correctCount
        ? s.fbPongFailWrongCount(selected.length, 4)
        : s.fbPongFailWrongDim(dName);
      return {
        ...state,
        scene: 'pong-failed',
        feedback: {
          tone: 'fail',
          text: s.fbPongFail(reason),
        },
        failCount: state.failCount + 1,
        penaltyShown: true,
      };
    }
    case 'continue-after-fail': {
      if (state.scene !== 'pong-failed') return state;
      const name = state.chosenDim ? dimName(state.chosenDim) : s.fallbackDimName;
      return {
        ...state,
        scene: 'pong-picking',
        selectedIds: [],
        feedback: { tone: 'info', text: s.fbContinueAfterFail(name, 4) },
      };
    }
    case 'cancel-pong':
      if (state.scene !== 'pong-picking' && state.scene !== 'pong-dimension') return state;
      return {
        ...state,
        scene: 'after-draw',
        selectedIds: [],
        chosenDim: null,
        revealedAll: false,
        feedback: null,
      };
    case 'pick-discard': {
      if (state.scene !== 'pong-success' && state.scene !== 'discard-picking') return state;
      // 只允許丟手中的牌
      if (!state.hand.find((c) => c.id === action.id)) return state;
      return {
        ...state,
        scene: 'done',
        hand: state.hand.filter((c) => c.id !== action.id),
        feedback: {
          tone: 'success',
          text: s.fbPickDiscard,
        },
      };
    }
    case 'open-claim': {
      if (state.scene !== 'done') return state;
      // 找手裏還有 ≥2 張的維度作為截胡演示維度（兩對保證至少有一個）。
      const counts: Partial<Record<Dimension, number>> = {};
      for (const c of state.hand) {
        if (!c.isDummy && 'dimension' in c) counts[c.dimension] = (counts[c.dimension] ?? 0) + 1;
      }
      const claimDim = (DIMENSIONS.find((d) => (counts[d] ?? 0) >= 2) ?? 'C') as Dimension;
      const name = dimName(claimDim);
      return {
        ...state,
        scene: 'claim-window',
        selectedIds: [],
        claimDim,
        feedback: { tone: 'info', text: s.fbOpenClaim(name) },
      };
    }
    case 'commit-claim': {
      if (state.scene !== 'claim-window' || !state.claimDim) return state;
      const dim = state.claimDim;
      const picked = state.hand.filter((c) => state.selectedIds.includes(c.id));
      const ok = picked.length === 2 && picked.every((c) => !c.isDummy && 'dimension' in c && c.dimension === dim);
      if (!ok) {
        const name = dimName(dim);
        return {
          ...state,
          feedback: {
            tone: 'fail',
            text: s.fbClaimFail(name, picked.length),
          },
        };
      }
      // 成功：2 張手牌 + 棄牌 = 3 張公開歸檔，被碰的 2 張從手牌移除
      return {
        ...state,
        scene: 'claim-success',
        hand: state.hand.filter((c) => !state.selectedIds.includes(c.id)),
        selectedIds: [],
        claimDeclared: true,
        feedback: { tone: 'success', text: s.fbClaimSuccess },
      };
    }
    case 'show-hu':
      if (state.scene !== 'claim-window' && state.scene !== 'claim-success') return state;
      return {
        ...state,
        scene: 'hu-demo',
        feedback: { tone: 'success', text: s.fbShowHu },
      };
    case 'reset':
      return initialState;
    default:
      return state;
  }
  };
}

function InteractiveSandbox({
  onClose,
  s,
  dimName,
  loc,
}: {
  onClose: () => void;
  s: TutStrings;
  dimName: DimName;
  loc: Locale;
}) {
  const reducer = useMemo(() => createReducer(s, dimName), [s, dimName]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const N = DIMENSION_META.N;
  const archived = state.chosenDim ? DIMENSION_META[state.chosenDim] : N;
  const claimed = state.claimDim ? DIMENSION_META[state.claimDim] : DIMENSION_META.A;

  const chosenName = state.chosenDim ? dimName(state.chosenDim) : '';
  const captionByScene: Record<Scene, string> = {
    start: s.captionStart,
    viewing: s.captionViewing,
    'after-draw': s.captionAfterDraw,
    'pong-dimension': s.captionPongDimension(dimName('N')),
    'pong-picking':
      state.selectedIds.length === 4
        ? s.captionPongPickingDone(chosenName, 4)
        : s.captionPongPicking(chosenName, 4, state.selectedIds.length),
    'pong-failed': s.captionPongFailed,
    'pong-success': s.captionPongSuccess,
    'claim-window': state.claimDim
      ? s.captionClaimWindow(dimName(state.claimDim), state.selectedIds.length)
      : s.captionClaimWindowFallback,
    'claim-success': s.captionClaimSuccess,
    'hu-demo': s.captionHuDemo,
    'discard-picking': s.captionDiscardPicking,
    done: s.captionDone,
  };

  const renderHand = () => {
    const all: GameCard[] = [...state.hand, ...(state.drawnCard ? [state.drawnCard] : [])];
    if (all.length === 0) {
      return <div className="py-4 text-center text-xs text-[var(--psy-muted)]">{s.handEmpty}</div>;
    }
    return (
      <AnimatePresence>
        <div className="flex flex-wrap justify-center gap-2">
          {all.map((c) => {
            const isDrawn = state.drawnCard?.id === c.id;
            const isSelected = state.selectedIds.includes(c.id);
            const isDummy = c.isDummy === true;
            const dimension = !isDummy ? (c as PersonalityCard).dimension : null;
            const inPick = state.scene === 'pong-picking';
            const inClaim = state.scene === 'claim-window';
            const canClickToSelect = inPick || inClaim;
            const canClickToDiscard = state.scene === 'pong-success' && !isDrawn;
            const targetDim = inPick ? state.chosenDim : inClaim ? state.claimDim : null;
            // 引導高亮：選牌/截胡階段高亮「目標維度且還沒選」的牌；棄牌階段高亮所有可棄手牌。
            const spotlight =
              (canClickToSelect && !isSelected && dimension === targetDim) ||
              canClickToDiscard;
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, y: isSelected ? -8 : 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className={`relative ${
                  isSelected ? 'ring-2 ring-emerald-400 rounded-[1.1rem]' : ''
                } ${spotlight ? 'tut-spotlight' : ''} ${(canClickToSelect || canClickToDiscard) ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (canClickToSelect) dispatch({ type: 'toggle-select', id: c.id });
                  else if (canClickToDiscard) dispatch({ type: 'pick-discard', id: c.id });
                }}
              >
                <TarotCard
                  {...cardToTarotProps(locCard(c, loc), loc)}
                  width={73}
                  revealedDimension={(state.revealedAll || state.revealedIds.includes(c.id)) && dimension ? dimension : null}
                  selected={isSelected}
                />
                {isDrawn && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--psy-accent)] px-2 py-0.5 text-[8px] font-bold text-black">
                    {s.justDrawn}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    );
  };

  const feedbackToneClass =
    state.feedback?.tone === 'success'
      ? 'border-emerald-400/45 bg-emerald-500/12 text-emerald-300'
      : state.feedback?.tone === 'fail'
      ? 'border-red-400/45 bg-red-500/12 text-red-300'
      : 'border-amber-400/45 bg-amber-500/12 text-amber-300';

  return (
    <>
    <motion.div
      key="sandbox"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="psy-panel psy-etched rounded-[1.8rem] p-5 pb-8 sm:p-7 sm:pb-8 mb-44"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-muted)]">
          {s.sandboxLabel}
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'reset' })}
            className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            {s.sandboxReset}
          </button>
          <button
            onClick={onClose}
            className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            {s.sandboxExit}
          </button>
        </div>
      </div>

      {/* 牌桌 */}
      <div className="space-y-4 rounded-[1.4rem] border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-4">
        {/* 歸檔區 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--psy-muted)]">{s.publicArchiveLabel}</span>
          {state.declared ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: archived.colorHex,
                backgroundColor: archived.colorHex + '20',
                border: `1px solid ${archived.colorHex}55`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: archived.colorHex }} />
              {s.archiveSetSuffix(dimName(archived.key), 4)}
            </span>
          ) : (
            <span className="text-[var(--psy-muted)]">{s.archiveNone}</span>
          )}
          {state.claimDeclared && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: claimed.colorHex,
                backgroundColor: claimed.colorHex + '20',
                border: `1px solid ${claimed.colorHex}55`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: claimed.colorHex }} />
              {s.archiveSetSuffix(dimName(claimed.key), 3)}
            </span>
          )}
        </div>

        {/* 牌堆 */}
        <div className="flex items-center justify-center gap-6">
          <button
            disabled={state.scene !== 'start'}
            onClick={() => dispatch({ type: 'draw' })}
            className={`flex flex-col items-center gap-1.5 transition ${
              state.scene === 'start'
                ? 'cursor-pointer animate-pulse'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">
              {state.scene === 'start' ? s.drawPileClick : s.drawPile}
            </span>
            <div className={state.scene === 'start' ? 'tut-spotlight' : ''}>
              <TarotCard faceDown text="" width={73} />
            </div>
          </button>
        </div>

        {/* 操作按鈕 */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            disabled={state.scene !== 'claim-window' && state.scene !== 'claim-success'}
            onClick={() => dispatch({ type: 'show-hu' })}
            className={`psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold ${
              state.scene === 'claim-window' || state.scene === 'claim-success' ? 'animate-pulse' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {s.btnHu}
          </button>
          <button
            disabled={state.scene !== 'viewing' || state.revealedIds.length > 0}
            onClick={() => dispatch({ type: 'view-two' })}
            className={`psy-btn psy-btn-ghost px-4 py-1.5 text-xs font-bold ${
              state.scene === 'viewing' && state.revealedIds.length === 0 ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {s.btnViewTwo}
          </button>
          <button
            disabled={state.scene !== 'viewing' || state.revealedIds.length === 0}
            onClick={() => dispatch({ type: 'finish-view' })}
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold ${
              state.scene === 'viewing' && state.revealedIds.length > 0 ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {s.btnContinueJudge}
          </button>
          <button
            disabled={state.scene !== 'after-draw'}
            onClick={() => dispatch({ type: 'open-pong' })}
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold transition ${
              state.scene === 'after-draw'
                ? 'tut-spotlight'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {s.btnSelfPong}
          </button>
        </div>

        {/* 自摸碰第一步：選人格維度 */}
        {state.scene === 'pong-dimension' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-3 text-xs text-[var(--psy-accent)]"
          >
            <span>{s.pongStep1}</span>
            <div className="flex flex-wrap justify-center gap-2">
              {DIMENSIONS.map((d) => {
                const meta = DIMENSION_META[d];
                return (
                  <button
                    key={d}
                    onClick={() => dispatch({ type: 'choose-dim', dim: d })}
                    className={`psy-btn px-3 py-1.5 text-[11px] font-bold ${d === 'N' ? 'tut-spotlight' : ''}`}
                    style={{ color: meta.colorHex, borderColor: meta.colorHex + '66' }}
                  >
                    {dimName(d)}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => dispatch({ type: 'cancel-pong' })}
              className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]"
            >
              {s.btnCancel}
            </button>
          </motion.div>
        )}

        {/* 自摸碰第二步：選牌 + commit/cancel */}
        {state.scene === 'pong-picking' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-2 text-xs text-[var(--psy-accent)]"
          >
            <span style={{ color: state.chosenDim ? DIMENSION_META[state.chosenDim].colorHex : N.colorHex }}>
              {s.pongStep2(chosenName, 4, state.selectedIds.length)}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => dispatch({ type: 'cancel-pong' })}
                className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]"
              >
                {s.btnCancel}
              </button>
              <button
                onClick={() => dispatch({ type: 'commit-pong' })}
                className={`psy-btn psy-btn-accent px-3 py-1 text-[10px] font-bold ${state.selectedIds.length === 4 ? 'tut-spotlight' : ''}`}
              >
                {s.btnSelfArchive}
              </button>
            </div>
          </motion.div>
        )}

        {/* 失敗後的繼續按鈕 */}
        {state.scene === 'pong-failed' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'continue-after-fail' })}
              className="psy-btn psy-btn-accent animate-pulse px-4 py-1.5 text-xs font-bold"
            >
              {s.btnContinue}
            </button>
          </div>
        )}

        {state.penaltyShown && state.scene === 'pong-failed' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-300">
            {s.penaltyDemo}
          </div>
        )}

        {state.scene === 'claim-window' && state.claimDim && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.06)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="flex justify-center">
              <TarotCard {...cardToTarotProps(locCard(CLAIM_CARDS[state.claimDim], loc), loc)} revealedDimension={state.claimDim} width={73} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="psy-serif text-sm text-[var(--psy-ink)]">{s.claimWho}</div>
              <div className="mt-1 leading-6">
                {s.claimCardBodyA}
                <b style={{ color: DIMENSION_META[state.claimDim].colorHex }}>{s.claimCardBodyMid(dimName(state.claimDim))}</b>
                {s.claimCardBodyB(state.selectedIds.length)}
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'commit-claim' })}
              className={`psy-btn psy-btn-accent self-center px-4 py-2 text-xs font-bold ${state.selectedIds.length === 2 ? 'tut-spotlight' : ''}`}
            >
              {s.btnPong}
            </button>
          </motion.div>
        )}

        {state.scene === 'claim-success' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'show-hu' })}
              className="psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold"
            >
              {s.btnContinueHu}
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
            {s.huDemoBox}
          </div>
        )}

        {/* 手牌 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">
              {state.scene === 'pong-success' ? s.discardToEnd : s.yourHand}
            </span>
            <span className="text-[10px] text-[var(--psy-muted)]">
              {s.cardsCountSuffix(state.hand.length + (state.drawnCard ? 1 : 0))}
            </span>
          </div>
          {renderHand()}
        </div>

        {state.scene === 'done' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'open-claim' })}
              className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
            >
              {s.btnSimDiscard}
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'reset' })}
              className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
            >
              {s.btnPlayAgain}
            </button>
          </div>
        )}
      </div>

    </motion.div>

    {/* 固定在視窗底部、永遠可見的指引欄。渲染在 motion.div 之外，
        避免 framer transform 祖先讓 fixed 失效。 */}
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[rgba(200,155,93,0.3)] bg-[rgba(11,18,28,0.97)] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto max-w-4xl space-y-2">
        <div className="flex items-start gap-2">
          <span className="psy-eyebrow mt-0.5 shrink-0 text-[10px] text-[var(--psy-accent)]">{s.guideLabel}</span>
          <motion.p
            key={state.scene + '-' + state.selectedIds.length}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="text-sm leading-6 text-[var(--psy-ink)]"
          >
            {captionByScene[state.scene]}
          </motion.p>
        </div>
        <AnimatePresence>
          {state.feedback && (
            <motion.p
              key={state.feedback.text}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className={`rounded-lg border px-3 py-1.5 text-xs leading-5 ${feedbackToneClass}`}
            >
              {state.feedback.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}

function FlowScreenshot({ mode, index, s }: { mode: 'pvp' | 'solo'; index: number; s: TutStrings }) {
  const frameTitle = mode === 'pvp' ? s.shotPvpTitle : s.shotSoloTitle;

  const homeChoice = (
    <div className="space-y-3">
      <div className="psy-serif text-sm text-[var(--psy-ink)]">{s.shotProductName}</div>
      <div className="grid gap-2">
        <div className={`${mode === 'pvp' ? 'bg-[rgba(200,155,93,0.28)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.04)] text-[var(--psy-muted)]'} rounded-full border border-[rgba(200,155,93,0.24)] px-4 py-2 text-center text-sm`}>
          {s.shotPvp}
        </div>
        <div className={`${mode === 'solo' ? 'bg-[rgba(200,155,93,0.28)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.04)] text-[var(--psy-muted)]'} rounded-full border border-[rgba(200,155,93,0.24)] px-4 py-2 text-center text-sm`}>
          {s.shotSolo}
        </div>
      </div>
    </div>
  );

  const identityForm = (
    <div className="space-y-3">
      <div className="psy-serif text-sm text-[var(--psy-ink)]">{s.shotPlayerInfo}</div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-3 py-2">
        <div className="text-[9px] text-[var(--psy-muted)]">{s.shotStudentId}</div>
        <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">{s.shotEnterStudentId}</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-3 py-2">
        <div className="text-[9px] text-[var(--psy-muted)]">{s.shotConfirmStudentId}</div>
        <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">{s.shotReenterStudentId}</div>
      </div>
    </div>
  );

  const assessmentCheck = (
    <div className="grid gap-2">
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
        <div className="text-xs font-semibold text-emerald-300">{s.shotAssessedTrue}</div>
        <div className="mt-1 text-[10px] leading-5 text-[var(--psy-ink-soft)]">{s.shotAssessedTrueBody}</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-2">
        <div className="text-xs font-semibold text-[var(--psy-accent)]">{s.shotAssessedFalse}</div>
        <div className="mt-1 text-[10px] leading-5 text-[var(--psy-ink-soft)]">{s.shotAssessedFalseBody}</div>
      </div>
    </div>
  );

  const roomPanel = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] p-3">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">{s.shotCreateRoom}</div>
        <div className="mt-2 rounded-lg bg-[rgba(200,155,93,0.12)] px-3 py-2 text-center text-sm text-[var(--psy-accent)]">{s.shotRoomCode('4821')}</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] p-3">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">{s.shotJoinRoom}</div>
        <div className="mt-2 rounded-lg border border-[rgba(200,155,93,0.2)] px-3 py-2 text-center text-xs text-[var(--psy-muted)]">{s.shotEnter4Code}</div>
      </div>
    </div>
  );

  const startGame = (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[s.shotYou, '11', '12', '13'].map((name, i) => (
          <div key={name} className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2 py-3 text-center">
            <div className="text-xs text-[var(--psy-ink)]">{name}</div>
            <div className="mt-1 text-[9px] text-[var(--psy-muted)]">{i === 0 ? s.shotHost : s.shotReady}</div>
          </div>
        ))}
      </div>
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">{s.shotStartGame}</div>
    </div>
  );

  const soloSetup = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {s.shotDifficulties.map((label, i) => (
          <div key={label} className={`${i === Math.min(index, 2) ? 'bg-[rgba(200,155,93,0.22)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.03)] text-[var(--psy-muted)]'} rounded-xl border border-[rgba(200,155,93,0.18)] px-2 py-3 text-center text-xs`}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {s.shotRounds.map((label, i) => (
          <div key={label} className={`${i === 1 ? 'bg-[rgba(200,155,93,0.18)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.03)] text-[var(--psy-muted)]'} rounded-xl border border-[rgba(200,155,93,0.16)] px-2 py-2 text-center text-[10px]`}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );

  const soloOpponents = (
    <div className="grid grid-cols-3 gap-2">
      {s.shotAiOpponents.map((name) => (
        <div key={name} className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-2 py-4 text-center">
          <div className="text-sm text-[var(--psy-ink)]">{name}</div>
          <div className="mt-2 text-[9px] leading-4 text-[var(--psy-muted)]">{s.shotAiOpponentLabel}</div>
        </div>
      ))}
    </div>
  );

  const soloStart = (
    <div className="space-y-3">
      {soloSetup}
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">{s.shotStartMatch}</div>
    </div>
  );

  const pvpFrames = [homeChoice, identityForm, assessmentCheck, roomPanel, startGame];
  const soloFrames = [homeChoice, assessmentCheck, soloSetup, soloOpponents, soloStart];
  const frame = mode === 'pvp' ? pvpFrames[index] : soloFrames[index];

  return (
    <div className="rounded-[1.2rem] border border-[rgba(200,155,93,0.16)] bg-[radial-gradient(circle_at_top,rgba(200,155,93,0.10),transparent_42%),rgba(9,15,23,0.68)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="psy-serif text-[10px] text-[var(--psy-accent)]">{frameTitle}</span>
        <span className="rounded-full border border-[rgba(200,155,93,0.18)] px-2 py-0.5 text-[9px] text-[var(--psy-muted)]">{s.shotStaticBadge}</span>
      </div>
      <div className="min-h-[12rem] rounded-[1rem] border border-[rgba(200,155,93,0.12)] bg-[linear-gradient(180deg,rgba(18,31,45,0.76),rgba(9,15,23,0.86))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
        {frame}
      </div>
    </div>
  );
}

function StartFlowGuide({ s }: { s: TutStrings }) {
  const [mode, setMode] = useState<'pvp' | 'solo'>('pvp');
  const [index, setIndex] = useState(0);
  const steps = mode === 'pvp' ? s.pvpFlow : s.soloFlow;
  const current = steps[index];

  const switchMode = (next: 'pvp' | 'solo') => {
    setMode(next);
    setIndex(0);
  };

  return (
    <div className="psy-panel psy-etched rounded-[1.6rem] p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="psy-eyebrow text-[10px]">{s.flowEyebrow}</p>
          <h2 className="psy-serif mt-2 text-2xl text-[var(--psy-ink)]">{s.flowTitle}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-full border border-[rgba(200,155,93,0.16)] bg-[rgba(255,255,255,0.02)] p-1">
          <button
            onClick={() => switchMode('pvp')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'pvp'
                ? 'bg-[rgba(200,155,93,0.24)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {s.tabPvp}
          </button>
          <button
            onClick={() => switchMode('solo')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'solo'
                ? 'bg-[rgba(200,155,93,0.24)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {s.tabSolo}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        {/* 移动端：横向滚动 chips；lg：纵向步骤列表 */}
        <div className="psy-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:space-y-2 lg:overflow-visible lg:px-0 lg:pb-0">
          {steps.map((step, i) => (
            <button
              key={step.title}
              onClick={() => setIndex(i)}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-left transition lg:w-full lg:shrink ${
                i === index
                  ? 'border-[rgba(200,155,93,0.45)] bg-[rgba(200,155,93,0.12)] text-[var(--psy-ink)]'
                  : 'border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
              }`}
            >
              <span className="psy-serif mr-2 text-[10px] text-[var(--psy-accent)]">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-xs">{step.title}</span>
            </button>
          ))}
        </div>

        <motion.div
          key={`${mode}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.2rem] border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.025)] p-5"
        >
          <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="psy-serif text-xl text-[var(--psy-ink)]">{current.title}</h3>
                <span className="rounded-full border border-[rgba(200,155,93,0.2)] px-3 py-1 text-xs text-[var(--psy-accent)]">
                  {index + 1}/{steps.length}
                </span>
              </div>
              <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{current.body}</p>
              {current.note && (
                <p className="mt-4 rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.06)] px-3 py-2 text-xs leading-6 text-[var(--psy-accent)]">
                  {current.note}
                </p>
              )}
            </div>
            <FlowScreenshot mode={mode} index={index} s={s} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className="psy-btn psy-btn-ghost px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {s.prevStep}
            </button>
            <button
              onClick={() => setIndex(Math.min(steps.length - 1, index + 1))}
              disabled={index === steps.length - 1}
              className="psy-btn psy-btn-accent px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              {s.nextStep}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function TutorialPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'list' | 'sandbox'>('list');
  const hydrated = useHydrated();
  const locale = useLocaleStore((st) => st.locale);
  const loc: Locale = hydrated ? locale : 'zh';
  // zh / en 結構一致；用 zh 形狀作為各子組件的 props 類型，運行時按 loc 取。
  const s: TutStrings = TUTORIAL_T[loc] as unknown as TutStrings;
  const dimName: DimName = (dim) => (loc === 'en' ? DIMENSION_META[dim].nameEn : DIMENSION_META[dim].name);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="psy-serif text-[11px] uppercase tracking-[0.42em] text-[var(--psy-ink-soft)] sm:text-xs">
              {s.eyebrow}
            </p>
            <h1 className="psy-serif text-3xl text-[var(--psy-ink)] sm:text-5xl">
              {s.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/rules')}
              className="psy-btn flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
            >
              {s.rulesHardcopy}
            </button>
            <button
              onClick={() => router.push('/')}
              className="psy-btn psy-btn-ghost flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
            >
              {s.backHome}
            </button>
          </div>
        </div>

        {mode === 'list' && (
          <>
            {/* 主 CTA */}
            <div className="psy-panel psy-etched rounded-[1.6rem] p-6 text-center sm:p-7">
              <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">
                {s.ctaTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--psy-ink-soft)]">
                {s.ctaBody}
              </p>
              <button
                onClick={() => setMode('sandbox')}
                className="psy-btn psy-btn-accent psy-serif mt-4 px-7 py-3 text-base font-semibold"
              >
                {s.ctaButton}
              </button>
            </div>

            <StartFlowGuide s={s} />

            {/* 概念卡片 */}
            <div>
              <p className="psy-eyebrow mb-3 text-[10px]">{s.rulesPointsLabel}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {s.steps.map((step, i) => (
                  <div key={step.title} className="psy-panel psy-etched rounded-[1.4rem] p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="psy-serif text-xs text-[var(--psy-accent)]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="psy-serif text-lg text-[var(--psy-ink)]">{step.title}</h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--psy-ink-soft)]">
                      {step.body}
                    </p>
                    {step.hint && (
                      <p className="mt-3 rounded-lg border border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.06)] px-3 py-2 text-xs text-[var(--psy-accent)]">
                        💡 {step.hint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push('/assessment')}
                className="psy-btn psy-btn-accent px-6 py-3 text-sm font-medium"
              >
                {s.directStartAssess}
              </button>
              <button
                onClick={() => router.push('/')}
                className="psy-btn psy-btn-ghost px-6 py-3 text-sm"
              >
                {s.backHome}
              </button>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {mode === 'sandbox' && <InteractiveSandbox onClose={() => setMode('list')} s={s} dimName={dimName} loc={loc} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
