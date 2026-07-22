'use client';

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
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
// 让沙盒显示真插画、且不刷 404。每张卡指定【不同】的插画 id（同维度也不重复），避免多张长一样。
const PC = (id: number, dim: Dimension, text: string, textEn: string, img: number): PersonalityCard => ({
  id, dimension: dim, text, textEn, facet: 'demo', imageId: img,
});
// 知识牌：双语（term/textEn 术语 + definition/definitionEn 定义），渲染按 locale 切换。
const DC = (id: number, term: string, termEn: string, definition: string, definitionEn: string): DummyCard =>
  ({ id, text: term, textEn: termEn, definition, definitionEn, isDummy: true });

// Card 組件只渲染 card.text，故按 locale 把 text 換成對應語言（不改 Card 邏輯）。
const locCard = <T extends GameCard>(c: T, loc: Locale): T =>
  loc === 'en' && c.textEn ? ({ ...c, text: c.textEn } as T) : c;

// 沙盒目標板：刻意讓只有神經質(4)剛好夠碰，其餘維度手牌都不足 → 教學聚焦在神經質。
// O 有 1<2、C 有 2<3、E 有 0<2、A 有 2<3、N 有 4=4。（C=3 也讓後面截胡碰 2+1=3 成立）
const SANDBOX_TARGETS: Record<Dimension, number> = { O: 2, C: 3, E: 2, A: 3, N: 4 };

// 歸檔 4 張神經質後，手裏留兩對（盡責性 104/108、宜人性 105/106）+ 一張單張 +
// 知識牌 → 棄 1 張後仍至少剩一對可用於「截胡碰」演示。每卡用不同插畫 id。
const SANDBOX_HAND: GameCard[] = [
  PC(101, 'N', '我經常感到焦慮或憂慮', 'I often feel anxious or worried', 4),
  PC(102, 'N', '我容易情緒波動', 'My mood swings easily', 14),
  PC(103, 'N', '我容易感到壓力', 'I get stressed out easily', 24),
  PC(104, 'C', '我會認真完成我承諾過的事', 'I follow through on what I promise', 3),
  PC(105, 'A', '我願意體諒別人的感受', 'I am willing to consider others\' feelings', 7),
  PC(106, 'A', '我會主動幫助遇到困難的人', 'I take the initiative to help people in trouble', 17),
  PC(107, 'O', '我對抽象的哲學問題很感興趣', 'I am interested in abstract, philosophical questions', 25),
  PC(108, 'C', '我做事情之前總會制定計劃', 'I always make a plan before doing things', 13),
  DC(109, '特質理論', 'Trait Theory', '認為人格是由穩定且可測量的特質所組成。', 'Views personality as a configuration of stable, measurable traits.'),
];
const SANDBOX_DRAWN: PersonalityCard = PC(110, 'N', '我對批評比較敏感', 'I am rather sensitive to criticism', 34);
// 「查看 2 張」教學指定可看的兩張：104 盡責性 + 110 剛抽到的神經質。玩家手動點選它們揭開。
const VIEW_IDS = [104, 110];
// 對手棄牌（截胡碰用）：維度在 open-claim 時按手裏現存的對子動態選定。插畫與手牌錯開。
const CLAIM_CARDS: Record<Dimension, PersonalityCard> = {
  O: PC(111, 'O', '我喜歡探索新奇的點子', 'I enjoy exploring novel ideas', 35),
  C: PC(111, 'C', '我做事一向井井有條', 'I keep things well-organized', 23),
  E: PC(111, 'E', '我在人群裏很有活力', 'I feel energetic among people', 1),
  A: PC(111, 'A', '我會站在別人的角度想', 'I see things from others\' perspective', 27),
  N: PC(111, 'N', '我對批評比較敏感', 'I am rather sensitive to criticism', 44),
};
// 食胡課專用：已歸檔 4 維（O/C/E/A），手裏剩 3 張神經質，對手打出第 4 張神經質 → 正好食胡。
const HU_HAND: GameCard[] = [
  PC(201, 'N', '我經常感到焦慮或憂慮', 'I often feel anxious or worried', 4),
  PC(202, 'N', '我容易情緒波動', 'My mood swings easily', 14),
  PC(203, 'N', '我容易感到壓力', 'I get stressed out easily', 24),
];
const HU_DISCARD: PersonalityCard = PC(204, 'N', '我對批評比較敏感', 'I am rather sensitive to criticism', 34);
const HU_DECLARED: Dimension[] = ['O', 'C', 'E', 'A'];

type Scene =
  | 'start'            // 等抽牌
  | 'viewing'          // 抽完，等點「查看 2 張」
  | 'view-picking'     // 點了查看 2 張，等玩家手動點選 2 張揭開
  | 'after-draw'       // 看完／跳過，看目標板，等點自摸碰
  | 'pong-dimension'   // 自摸碰：選人格維度
  | 'pong-picking'     // 自摸碰：選牌
  | 'pong-success'     // 自摸碰成功，等選棄牌
  | 'discard-confirm'  // 選了一張要棄的牌，等點「棄牌」
  | 'turn-done'        // 本回合結束
  | 'claim-dimension'  // 截胡碰：先選人格維度（教學步，真實對局中維度隱含於棄牌）
  | 'claim-window'     // 對手棄牌，等碰
  | 'claim-success'    // 截胡碰成功
  | 'hu-window'        // 食胡課：四維已歸檔，對手打出缺的那張
  | 'hu-success';      // 食胡成功

// 操作分組（給操作橫幅 + 目標板高亮用）
type OpGroup = 'self' | 'claim' | 'hu' | null;
function opOf(scene: Scene): OpGroup {
  if (scene === 'after-draw' || scene === 'pong-dimension' || scene === 'pong-picking' || scene === 'pong-success' || scene === 'discard-confirm') return 'self';
  if (scene === 'claim-dimension' || scene === 'claim-window' || scene === 'claim-success') return 'claim';
  if (scene === 'hu-window' || scene === 'hu-success') return 'hu';
  return null;
}

interface SandboxState {
  scene: Scene;
  hand: GameCard[];
  drawnCard: GameCard | null;
  selectedIds: number[];
  revealedIds: number[];           // 只揭開玩家「查看 2 張」翻開的牌（不再 reveal 全場）
  chosenDim: Dimension | null;     // 自摸碰選定的維度
  claimDim: Dimension | null;      // 截胡碰維度（按手牌動態定）
  selectedDiscardId: number | null;// 待確認要棄的牌
  declared: boolean;               // 自摸碰已歸檔
  claimDeclared: boolean;          // 截胡碰已歸檔
  feedback: { tone: 'success' | 'fail' | 'info'; text: string } | null;
}

const initialState: SandboxState = {
  scene: 'start',
  hand: SANDBOX_HAND,
  drawnCard: null,
  selectedIds: [],
  revealedIds: [],
  chosenDim: null,
  claimDim: null,
  selectedDiscardId: null,
  declared: false,
  claimDeclared: false,
  feedback: null,
};

type Action =
  | { type: 'draw' }
  | { type: 'view-two' }
  | { type: 'pick-view'; id: number }
  | { type: 'finish-view' }
  | { type: 'open-pong' }
  | { type: 'choose-dim'; dim: Dimension }
  | { type: 'toggle-select'; id: number }
  | { type: 'commit-pong' }
  | { type: 'cancel-pong' }
  | { type: 'select-discard'; id: number }
  | { type: 'confirm-discard' }
  | { type: 'cancel-discard' }
  | { type: 'open-claim' }
  | { type: 'choose-claim-dim'; dim: Dimension }
  | { type: 'commit-claim' }
  | { type: 'enter-hu' }
  | { type: 'commit-hu' }
  | { type: 'reset' };

function createReducer(s: TutStrings, dimName: DimName) {
  return function reducer(state: SandboxState, action: Action): SandboxState {
  switch (action.type) {
    case 'draw':
      if (state.scene !== 'start') return state;
      return { ...state, scene: 'viewing', drawnCard: SANDBOX_DRAWN, feedback: { tone: 'success', text: s.fbDraw } };
    case 'view-two':
      if (state.scene !== 'viewing') return state;
      // 不再自動揭開：進入手動點選，玩家點高亮的 2 張才揭開。
      return { ...state, scene: 'view-picking', feedback: { tone: 'info', text: s.fbViewStart } };
    case 'pick-view': {
      if (state.scene !== 'view-picking') return state;
      if (!VIEW_IDS.includes(action.id) || state.revealedIds.includes(action.id)) return state;
      const revealedIds = [...state.revealedIds, action.id];
      const done = VIEW_IDS.every((id) => revealedIds.includes(id));
      return { ...state, revealedIds, feedback: { tone: done ? 'success' : 'info', text: done ? s.fbViewDone : s.fbViewPicked } };
    }
    case 'finish-view':
      if (state.scene !== 'view-picking') return state;
      if (!VIEW_IDS.every((id) => state.revealedIds.includes(id))) return state; // 必須先看完 2 張
      return { ...state, scene: 'after-draw', feedback: { tone: 'success', text: s.fbFinishView } };
    case 'open-pong':
      if (state.scene !== 'after-draw') return state;
      // 不再 reveal 全場：靠 spotlight + 旁白點名 4 張神經質。
      return { ...state, scene: 'pong-dimension', selectedIds: [], chosenDim: null, feedback: { tone: 'info', text: s.fbOpenPong } };
    case 'choose-dim': {
      if (state.scene !== 'pong-dimension') return state;
      return { ...state, scene: 'pong-picking', chosenDim: action.dim, selectedIds: [], feedback: { tone: 'info', text: s.fbChooseDim(dimName(action.dim), SANDBOX_TARGETS[action.dim]) } };
    }
    case 'toggle-select': {
      if (state.scene !== 'pong-picking' && state.scene !== 'claim-window') return state;
      const targetDim = state.scene === 'pong-picking' ? state.chosenDim : state.claimDim;
      const pool: GameCard[] = [...state.hand, ...(state.drawnCard ? [state.drawnCard] : [])];
      const card = pool.find((c) => c.id === action.id);
      const cardDim = card && !card.isDummy && 'dimension' in card ? card.dimension : null;
      // 維度不對 → 溫和攔截，不選中，提示一句（教學期不直接判失敗）。
      if (targetDim && cardDim !== targetDim) {
        return { ...state, feedback: { tone: 'info', text: s.fbWrongDimHint(dimName(targetDim)) } };
      }
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((i) => i !== action.id)
          : [...state.selectedIds, action.id],
      };
    }
    case 'commit-pong': {
      if (state.scene !== 'pong-picking' || !state.chosenDim) return state;
      const need = SANDBOX_TARGETS[state.chosenDim];
      if (state.selectedIds.length !== need) return state; // 按鈕只在湊滿時可點
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
    case 'cancel-pong':
      if (state.scene !== 'pong-picking' && state.scene !== 'pong-dimension') return state;
      return { ...state, scene: 'after-draw', selectedIds: [], chosenDim: null, feedback: null };
    case 'select-discard': {
      if (state.scene !== 'pong-success' && state.scene !== 'discard-confirm') return state;
      if (!state.hand.find((c) => c.id === action.id)) return state;
      return { ...state, scene: 'discard-confirm', selectedDiscardId: action.id, feedback: null };
    }
    case 'cancel-discard':
      if (state.scene !== 'discard-confirm') return state;
      return { ...state, scene: 'pong-success', selectedDiscardId: null };
    case 'confirm-discard': {
      if (state.scene !== 'discard-confirm' || state.selectedDiscardId == null) return state;
      return {
        ...state,
        scene: 'turn-done',
        hand: state.hand.filter((c) => c.id !== state.selectedDiscardId),
        selectedDiscardId: null,
        feedback: { tone: 'success', text: s.fbPickDiscard },
      };
    }
    case 'open-claim': {
      if (state.scene !== 'turn-done') return state;
      const counts: Partial<Record<Dimension, number>> = {};
      for (const c of state.hand) {
        if (!c.isDummy && 'dimension' in c) counts[c.dimension] = (counts[c.dimension] ?? 0) + 1;
      }
      const claimDim = (DIMENSIONS.find((d) => (counts[d] ?? 0) >= 2) ?? 'C') as Dimension;
      // 教學步：先選維度再選牌（與自摸碰第一步同構）。真實對局中碰的維度
      // 隱含於棄牌本身，這裏顯式選一次是爲了讓流程肌肉記憶一致。
      return { ...state, scene: 'claim-dimension', selectedIds: [], claimDim, feedback: { tone: 'info', text: s.fbOpenClaimDim(dimName(claimDim)) } };
    }
    case 'choose-claim-dim': {
      if (state.scene !== 'claim-dimension' || !state.claimDim) return state;
      if (action.dim !== state.claimDim) return state; // 只開放正確維度（教學引導）
      return { ...state, scene: 'claim-window', selectedIds: [], feedback: { tone: 'info', text: s.fbOpenClaim(dimName(state.claimDim)) } };
    }
    case 'commit-claim': {
      if (state.scene !== 'claim-window' || !state.claimDim) return state;
      if (state.selectedIds.length !== 2) return state; // 按鈕只在選滿 2 張時可點
      return {
        ...state,
        scene: 'claim-success',
        hand: state.hand.filter((c) => !state.selectedIds.includes(c.id)),
        selectedIds: [],
        claimDeclared: true,
        feedback: { tone: 'success', text: s.fbClaimSuccess },
      };
    }
    case 'enter-hu':
      if (state.scene !== 'claim-success') return state;
      // 切到食胡課的劇本：四維已歸檔，手裏剩 3 張神經質，揭開讓玩家看清。
      return {
        ...state,
        scene: 'hu-window',
        hand: HU_HAND,
        drawnCard: null,
        selectedIds: [],
        revealedIds: HU_HAND.map((c) => c.id),
        feedback: { tone: 'info', text: s.fbEnterHu(dimName('N')) },
      };
    case 'commit-hu':
      if (state.scene !== 'hu-window') return state;
      // 食胡：指引欄已宣告勝利，旁白框重複同義句 → 去掉黃框旁白，避免重複。
      return { ...state, scene: 'hu-success', feedback: null };
    case 'reset':
      return initialState;
    default:
      return state;
  }
  };
}

function InteractiveSandbox({
  onComplete,
  s,
  dimName,
  loc,
  resetSignal,
  onStartedChange,
}: {
  onComplete: () => void;
  s: TutStrings;
  dimName: DimName;
  loc: Locale;
  // 頁頭「重新開始」按鈕的信號（重新開始/退出已合併進頁頭標題行，省一行面板頭）。
  // 每 +1 觸發一次 reset dispatch。
  resetSignal: number;
  // 報告是否已超過第一步（抽牌前 scene='start'）→ 父組件據此決定顯不顯示「重新開始」。
  onStartedChange: (started: boolean) => void;
}) {
  const reducer = useMemo(() => createReducer(s, dimName), [s, dimName]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [introSeen, setIntroSeen] = useState(false);
  const prevResetRef = useRef(resetSignal);
  useEffect(() => {
    if (prevResetRef.current !== resetSignal) {
      prevResetRef.current = resetSignal;
      dispatch({ type: 'reset' });
    }
  }, [resetSignal]);
  // 第一步 scene='start'（抽牌前）→ started=false，隱藏「重新開始」；之後 true。
  useEffect(() => {
    onStartedChange(state.scene !== 'start');
  }, [state.scene, onStartedChange]);
  const N = DIMENSION_META.N;
  const archived = state.chosenDim ? DIMENSION_META[state.chosenDim] : N;
  const claimed = state.claimDim ? DIMENSION_META[state.claimDim] : DIMENSION_META.A;

  // 底部指引欄高度隨 caption/feedback 長短變化。用固定 mb 預留會出現「大窟窿」
  // （指引欄比預留值矮時，露出未被覆蓋的空白）或內容被欄蓋住。改為實測欄高動態預留。
  const guideRef = useRef<HTMLDivElement>(null);
  const [guidePad, setGuidePad] = useState(176);
  useEffect(() => {
    const el = guideRef.current;
    if (!el) return;
    const update = () => setGuidePad(el.offsetHeight + 16);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const op = opOf(state.scene);
  const pongNeed = state.chosenDim ? SANDBOX_TARGETS[state.chosenDim] : 4;
  const successToast =
    state.scene === 'pong-success' ? s.toastPongDone
    : state.scene === 'claim-success' ? s.toastClaimDone
    : state.scene === 'hu-success' ? s.toastHuDone
    : null;
  const chosenName = state.chosenDim ? dimName(state.chosenDim) : '';
  const captionByScene: Record<Scene, string> = {
    start: s.captionStart,
    viewing: s.captionViewing,
    'view-picking': s.captionViewPicking(state.revealedIds.filter((id) => VIEW_IDS.includes(id)).length),
    'after-draw': s.captionAfterDraw,
    'pong-dimension': s.captionPongDimension(dimName('N')),
    'pong-picking':
      state.selectedIds.length === pongNeed
        ? s.captionPongPickingDone(chosenName, pongNeed)
        : s.captionPongPicking(chosenName, pongNeed, state.selectedIds.length),
    'pong-success': s.captionPongSuccess,
    'discard-confirm': s.captionDiscardConfirm,
    'turn-done': s.captionDone,
    'claim-dimension': state.claimDim
      ? s.captionClaimDim(dimName(state.claimDim))
      : s.captionClaimWindowFallback,
    'claim-window': state.claimDim
      ? s.captionClaimWindow(dimName(state.claimDim), state.selectedIds.length)
      : s.captionClaimWindowFallback,
    'claim-success': s.captionClaimSuccess,
    'hu-window': s.captionHuWindow(dimName('N')),
    'hu-success': s.captionHuSuccess,
  };

  const renderHand = () => {
    const all: GameCard[] = [...state.hand, ...(state.drawnCard ? [state.drawnCard] : [])];
    if (all.length === 0) {
      return <div className="py-4 text-center text-xs text-[var(--psy-muted)]">{s.handEmpty}</div>;
    }
    return (
      <AnimatePresence>
        {/* 約束寬度 → 桌面也分成兩行，不再一長排顯得平鋪難看 */}
        <div className="mx-auto flex max-w-[26rem] flex-wrap justify-center gap-2">
          {all.map((c) => {
            const isDrawn = state.drawnCard?.id === c.id;
            const isSelected = state.selectedIds.includes(c.id);
            const isDummy = c.isDummy === true;
            const dimension = !isDummy ? (c as PersonalityCard).dimension : null;
            const inPick = state.scene === 'pong-picking';
            const inClaim = state.scene === 'claim-window';
            const inDiscard = state.scene === 'pong-success' || state.scene === 'discard-confirm';
            // 「查看 2 張」手動點選：只開放指定的 2 張且尚未揭開。
            const canClickToView = state.scene === 'view-picking' && VIEW_IDS.includes(c.id) && !state.revealedIds.includes(c.id);
            const canClickToSelect = inPick || inClaim;
            const canClickToDiscard = inDiscard && !isDrawn;
            const isDiscardPick = c.id === state.selectedDiscardId;
            const targetDim = inPick ? state.chosenDim : inClaim ? state.claimDim : null;
            const lifted = isSelected || isDiscardPick;
            const clickable = canClickToSelect || canClickToDiscard || canClickToView;
            // 引導高亮：查看點選 2 張；選牌/截胡高亮目標維度未選；棄牌高亮可棄手牌。
            // 注意：after-draw / pong-dimension 不預先高亮手牌——必須先點自摸碰、選維度後才高亮。
            const spotlight =
              canClickToView ||
              (canClickToSelect && !isSelected && dimension === targetDim) ||
              (canClickToDiscard && !isDiscardPick);
            // 聚焦調暗：手牌與當前步驟無關時壓暗，只留「該步真正要看／點」的卡明亮。
            // 桌面端也生效（純 opacity，不依賴遮罩層級）。
            const handActive = inPick || inClaim || inDiscard || state.scene === 'view-picking';
            const relevant = state.scene === 'view-picking'
              ? VIEW_IDS.includes(c.id)
              : inPick
              ? dimension === state.chosenDim
              : inClaim
              ? dimension === state.claimDim
              : inDiscard
              ? !isDrawn
              : false;
            // 食胡课豁免：enter-hu 特意 revealedIds=HU_HAND「揭開讓玩家看清」，
            // 不能一边翻牌一边把整排手牌压到 0.32 透明度。
            const inHu = state.scene === 'hu-window' || state.scene === 'hu-success';
            const dimmed = inHu ? false : handActive ? !relevant && !lifted : true;
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: dimmed ? 0.32 : 1, scale: 1, y: lifted ? -8 : 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className={`relative rounded-[0.55rem] ${
                  lifted ? 'ring-2 ring-emerald-400' : ''
                } ${spotlight ? 'tut-spotlight' : ''} ${clickable ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (canClickToSelect) dispatch({ type: 'toggle-select', id: c.id });
                  else if (canClickToDiscard) dispatch({ type: 'select-discard', id: c.id });
                  else if (canClickToView) dispatch({ type: 'pick-view', id: c.id });
                }}
              >
                <TarotCard
                  {...cardToTarotProps(locCard(c, loc), loc)}
                  width={73}
                  revealedDimension={state.revealedIds.includes(c.id) && dimension ? dimension : null}
                  selected={lifted}
                />
                {isDrawn && (
                  <div className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--psy-accent)] px-2.5 py-0.5 text-[9px] font-bold text-[#1a1206] shadow-md">
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
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700'
      : state.feedback?.tone === 'fail'
      ? 'border-red-500/35 bg-red-500/10 text-red-700'
      : 'border-[rgba(154,116,72,0.36)] bg-[rgba(195,154,82,0.12)] text-[var(--psy-accent-strong)]';

  return (
    <>
    {/* 開局介紹遮罩：先講清「目標張數」是什麼，再開始教學 */}
    <AnimatePresence>
      {!introSeen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(58,48,32,0.45)] px-5 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="psy-panel psy-etched w-full max-w-md space-y-4 rounded-[1.6rem] p-6 text-center"
          >
            <h3 className="psy-serif text-xl text-[var(--psy-ink)]">{s.introTitle}</h3>
            <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{s.introBody}</p>
            <TargetBoard label={s.targetBoardLabel} activeDim="N" dimName={dimName} />
            <button
              onClick={() => setIntroSeen(true)}
              className="psy-btn psy-btn-accent psy-serif w-full px-6 py-3 text-sm font-semibold"
            >
              {s.introBtn}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 原「聚焦遮罩」已移除：棕色半透 (58,48,32,.34) 疊在暖米背景上會發髒（橄欖灰）。
        lightmode 下不壓暗頁面，聚焦交給面板陰影 + 卡片級 opacity 淡化即可。*/}
    <motion.div
      key="sandbox"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="psy-panel psy-etched relative z-40 rounded-[1.8rem] p-5 pb-8 sm:p-7 sm:pb-8"
      style={{ marginBottom: guidePad }}
    >
      {/* 面板頭（「交互式沙盒」標籤 + 重置/退出鏈接行）已刪：太佔縱向空間，
          重置/退出按鈕合併進了頁頭標題行（見父組件 mode==='sandbox' 分支）。 */}

      {/* 牌桌 */}
      <div className="space-y-3 rounded-[1.4rem] border border-[rgba(154,116,72,0.18)] bg-[linear-gradient(180deg,var(--psy-card-content),#f8f1e4)] p-4">
        {/* 歸檔區（min-h 鎖行高：「（暫無）」純文字與 chip 高度差 ~3px，
            會讓下方整體微移） */}
        <div className="flex min-h-[23px] flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--psy-muted)]">{s.publicArchiveLabel}</span>
          {op === 'hu' ? (
            <>
              {HU_DECLARED.map((d) => {
                const m = DIMENSION_META[d];
                return (
                  <span key={d} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: m.colorHex, backgroundColor: m.colorHex + '20', border: `1px solid ${m.colorHex}55` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.colorHex }} />
                    {s.archiveSetSuffix(dimName(d), SANDBOX_TARGETS[d])}
                  </span>
                );
              })}
              <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: N.colorHex, borderColor: N.colorHex + '88' }}>
                {s.huGapSuffix(dimName('N'))}
              </span>
            </>
          ) : (
            <>
              {!state.declared && !state.claimDeclared && (
                <span className="text-[var(--psy-muted)]">{s.archiveNone}</span>
              )}
              {state.declared && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: archived.colorHex, backgroundColor: archived.colorHex + '20', border: `1px solid ${archived.colorHex}55` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: archived.colorHex }} />
                  {s.archiveSetSuffix(dimName(archived.key), SANDBOX_TARGETS[archived.key])}
                </span>
              )}
              {state.claimDeclared && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: claimed.colorHex, backgroundColor: claimed.colorHex + '20', border: `1px solid ${claimed.colorHex}55` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: claimed.colorHex }} />
                  {s.archiveSetSuffix(dimName(claimed.key), SANDBOX_TARGETS[claimed.key])}
                </span>
              )}
            </>
          )}
        </div>

        {/* ── 操作區等高槽位 ──────────────────────────────────────────
            所有步驟的操作 UI（橫幅/牌堆/按鈕排/面板）疊進同一個 grid 格；
            旁邊疊兩個 invisible 的「最高步影子」（自摸碰選維度 / 食胡卡）
            一起撐高 → 槽位高度恆等於最高步，且隨語言斷行自動適配。
            效果：目標板和手牌的 Y 位置在所有步驟間恆定，不再被新面板
            頂出視窗、視窗不再忽高忽低（核心痛點）。新增更高的步驟時，
            把它的結構補成第三個影子即可。 */}
        <div className="grid">
          {/* 影子 A：自摸碰步 = 橫幅 + 選維度面板（僅複製佔位結構，不可交互） */}
          <div aria-hidden className="hidden pointer-events-none col-start-1 row-start-1 space-y-3 sm:block sm:invisible">
            <div className="rounded-xl py-1.5 text-center">
              <span className="psy-serif text-base font-black tracking-[0.18em]">{s.opSelfPong}</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border px-3 py-2 text-xs">
              <span>{s.pongStep1}</span>
              <div className="flex flex-wrap justify-center gap-2">
                {DIMENSIONS.map((d) => (
                  <button key={d} disabled tabIndex={-1} className="psy-btn px-3 py-1.5 text-[11px] font-bold">
                    {dimName(d)}
                  </button>
                ))}
              </div>
              <button disabled tabIndex={-1} className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]">{s.btnCancel}</button>
            </div>
          </div>
          {/* 影子 B：食胡步 = 橫幅 + 食胡卡面板 */}
          <div aria-hidden className="hidden pointer-events-none col-start-1 row-start-1 space-y-3 sm:block sm:invisible">
            <div className="rounded-xl py-1.5 text-center">
              <span className="psy-serif text-base font-black tracking-[0.18em]">{s.opHu}</span>
            </div>
            <div className="grid gap-3 rounded-xl border p-3 text-xs sm:grid-cols-[auto_1fr]">
              <div className="flex justify-center">
                <TarotCard {...cardToTarotProps(locCard(HU_DISCARD, loc), loc)} revealedDimension="N" width={73} />
              </div>
              <div className="flex flex-col justify-center gap-2">
                <div>
                  <div className="psy-serif text-sm">{s.huWho}</div>
                  <div className="mt-1 leading-6">{s.huBody(dimName('N'))}</div>
                </div>
                <button disabled tabIndex={-1} className="psy-btn psy-btn-danger self-start px-5 py-2 text-sm font-bold">
                  {s.btnHu}
                </button>
              </div>
            </div>
          </div>
          {/* 真實內容：垂直居中在槽位裏（矮步驟上下留白，視覺穩定） */}
          <div className="col-start-1 row-start-1 flex flex-col justify-center gap-3">

        {/* 操作大標題（自摸碰／截胡碰／食胡）——做成醒目章節標題，起區分作用，非按鈕 */}
        {op && (
          <div
            className="rounded-xl py-1.5 text-center shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            style={
              op === 'self'
                ? { background: 'linear-gradient(180deg,rgba(214,170,98,0.96),rgba(200,155,93,0.96))', color: '#1a1206' }
                : op === 'claim'
                ? { background: 'linear-gradient(180deg,rgba(82,190,176,0.96),rgba(63,174,159,0.96))', color: '#06231f' }
                : { background: 'linear-gradient(180deg,rgba(224,104,86,0.96),rgba(214,90,72,0.96))', color: '#fff' }
            }
          >
            <span className="psy-serif text-base font-black tracking-[0.18em]">
              {op === 'self' ? s.opSelfPong : op === 'claim' ? s.opClaim : s.opHu}
            </span>
          </div>
        )}

        {/* 牌堆：只在開局抽牌時顯示，抽完即隱藏，避免後續步驟多餘 */}
        {state.scene === 'start' && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => dispatch({ type: 'draw' })}
              className="flex cursor-pointer flex-col items-center gap-3"
            >
              <span className="text-sm uppercase tracking-[0.3em] text-[var(--psy-muted)] sm:text-base">{s.drawPileClick}</span>
              <div className="relative tut-spotlight rounded-[0.55rem]">
                <TarotCard faceDown text="" width={112} />
                {/* 手指 👆 在牌堆下部上下浮動、指回牌堆（與正式對局 DrawPile 一致）。黃色調淺：降飽和+提亮。 */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 select-none text-4xl sm:text-5xl"
                  style={{ bottom: '0.9rem', filter: 'saturate(0.5) brightness(1.15) drop-shadow(0 2px 4px rgba(96,72,38,0.25))' }}
                  animate={{ y: [4, -6, 4] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                >
                  👆
                </motion.div>
              </div>
            </button>
          </div>
        )}

        {/* 操作按鈕排：只在「查看 / 完成查看 / 自摸碰」這幾步顯示，截胡碰 / 食胡 走各自面板 */}
        {(state.scene === 'viewing' || state.scene === 'view-picking' || state.scene === 'after-draw') && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              disabled={state.scene !== 'viewing'}
              onClick={() => dispatch({ type: 'view-two' })}
              className={`psy-btn psy-btn-ghost px-4 py-1.5 text-xs font-bold ${
                state.scene === 'viewing' ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {s.btnViewTwo}
            </button>
            <button
              disabled={state.scene !== 'view-picking' || !VIEW_IDS.every((id) => state.revealedIds.includes(id))}
              onClick={() => dispatch({ type: 'finish-view' })}
              className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold ${
                state.scene === 'view-picking' && VIEW_IDS.every((id) => state.revealedIds.includes(id)) ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {s.btnContinueJudge}
            </button>
            <button
              disabled={state.scene !== 'after-draw'}
              onClick={() => dispatch({ type: 'open-pong' })}
              className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold transition ${
                state.scene === 'after-draw' ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {s.btnSelfPong}
            </button>
          </div>
        )}

        {/* 看牌模式对照：把「看 4 张永久保留 / 看 2 张不保留」两条规则常驻显示在看牌步，
            让两种模式都出现在 UI 里（当前示範用隱藏·看 2 張，高亮那条）。紧凑两行、不换行。*/}
        {(state.scene === 'viewing' || state.scene === 'view-picking') && (
          <div className="mx-auto mt-2 flex w-full max-w-xs flex-col gap-1 rounded-xl border border-[var(--psy-border)] bg-[var(--psy-card-content)] px-4 py-2 text-[11px] leading-tight">
            <span className="text-[var(--psy-muted)]">{s.revealHalfNote}</span>
            <span className="font-medium text-[var(--psy-accent)]">{s.revealHiddenNote}</span>
          </div>
        )}

        {/* 自摸碰第一步：選人格維度（只開放神經質，引導點擊）*/}
        {state.scene === 'pong-dimension' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-2 text-xs text-[var(--psy-accent)]"
          >
            <span>{s.pongStep1}</span>
            <div className="flex flex-wrap justify-center gap-2">
              {DIMENSIONS.map((d) => {
                const meta = DIMENSION_META[d];
                const enabled = d === 'N';
                return (
                  <button
                    key={d}
                    disabled={!enabled}
                    onClick={() => enabled && dispatch({ type: 'choose-dim', dim: d })}
                    className={`psy-btn px-3 py-1.5 text-[11px] font-bold ${enabled ? 'tut-spotlight' : 'opacity-30 cursor-not-allowed'}`}
                    style={{ color: meta.colorHex, borderColor: meta.colorHex + '66' }}
                  >
                    {dimName(d)}
                  </button>
                );
              })}
            </div>
            <button onClick={() => dispatch({ type: 'cancel-pong' })} className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]">
              {s.btnCancel}
            </button>
          </motion.div>
        )}

        {/* 自摸碰第二步：選牌（計數器）+ 確認 */}
        {state.scene === 'pong-picking' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-2 text-xs text-[var(--psy-accent)]"
          >
            <span style={{ color: state.chosenDim ? DIMENSION_META[state.chosenDim].colorHex : N.colorHex }}>
              {s.pongStep2(chosenName, pongNeed, state.selectedIds.length)}
            </span>
            <div className="flex gap-2">
              <button onClick={() => dispatch({ type: 'cancel-pong' })} className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]">
                {s.btnCancel}
              </button>
              <button
                onClick={() => dispatch({ type: 'commit-pong' })}
                disabled={state.selectedIds.length !== pongNeed}
                className={`psy-btn psy-btn-accent px-3 py-1 text-[10px] font-bold ${state.selectedIds.length === pongNeed ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'}`}
              >
                {s.btnSelfArchive}
              </button>
            </div>
          </motion.div>
        )}

        {/* 棄牌確認：選了一張後出現「取消 / 棄牌」——放在手牌上方，與正式對局的動作行一致 */}
        {state.scene === 'discard-confirm' && (
          <div className="flex justify-center gap-2">
            <button onClick={() => dispatch({ type: 'cancel-discard' })} className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs">
              {s.btnCancel}
            </button>
            <button onClick={() => dispatch({ type: 'confirm-discard' })} className="psy-btn psy-btn-accent tut-spotlight px-4 py-1.5 text-xs font-bold">
              {s.btnDiscard}
            </button>
          </div>
        )}

        {/* 截胡碰第一步：選人格維度（教學步——只開放正確維度，引導點擊；
            與自摸碰第一步同構，讓「碰=先選維度再選牌」的肌肉記憶一致） */}
        {state.scene === 'claim-dimension' && state.claimDim && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(63,174,159,0.32)] bg-[rgba(63,174,159,0.06)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr]"
          >
            <div className="flex justify-center">
              <TarotCard {...cardToTarotProps(locCard(CLAIM_CARDS[state.claimDim], loc), loc)} revealedDimension={state.claimDim} width={73} />
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="psy-serif text-sm text-[var(--psy-ink)]">{s.claimWho}</div>
              <span className="text-[rgba(102,212,196,0.95)]">{s.pongStep1}</span>
              <div className="flex flex-wrap justify-center gap-2">
                {DIMENSIONS.map((d) => {
                  const meta = DIMENSION_META[d];
                  const enabled = d === state.claimDim;
                  return (
                    <button
                      key={d}
                      disabled={!enabled}
                      onClick={() => enabled && dispatch({ type: 'choose-claim-dim', dim: d })}
                      className={`psy-btn px-3 py-1.5 text-[11px] font-bold ${enabled ? 'tut-spotlight' : 'opacity-30 cursor-not-allowed'}`}
                      style={{ color: meta.colorHex, borderColor: meta.colorHex + '66' }}
                    >
                      {dimName(d)}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* 截胡碰窗口：對手棄牌 + 旁白 + 碰 */}
        {state.scene === 'claim-window' && state.claimDim && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(63,174,159,0.32)] bg-[rgba(63,174,159,0.06)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr_auto]"
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
              disabled={state.selectedIds.length !== 2}
              className={`psy-btn psy-btn-accent self-center px-4 py-2 text-xs font-bold ${state.selectedIds.length === 2 ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'}`}
            >
              {s.btnPong}
            </button>
          </motion.div>
        )}

        {/* 截胡碰成功 → 進入食胡課 */}
        {state.scene === 'claim-success' && (
          <div className="flex justify-center">
            <button onClick={() => dispatch({ type: 'enter-hu' })} className="psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold">
              {s.btnContinueHu}
            </button>
          </div>
        )}

        {/* 食胡課：對手打出你缺的那張神經質 */}
        {state.scene === 'hu-window' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(214,90,72,0.35)] bg-[rgba(214,90,72,0.08)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr]"
          >
            <div className="flex justify-center">
              <TarotCard {...cardToTarotProps(locCard(HU_DISCARD, loc), loc)} revealedDimension="N" width={73} />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div>
                <div className="psy-serif text-sm text-[var(--psy-ink)]">{s.huWho}</div>
                <div className="mt-1 leading-6">{s.huBody(dimName('N'))}</div>
              </div>
              <button
                onClick={() => dispatch({ type: 'commit-hu' })}
                className="psy-btn psy-btn-danger tut-spotlight self-start px-5 py-2 text-sm font-bold"
              >
                {s.btnHu}
              </button>
            </div>
          </motion.div>
        )}

          </div>
        </div>

        {/* 目標板：常駐渲染（原本只在操作階段出現——它一出現/消失就會把
            手牌上下推，破壞「手牌位置恆定」；開局就展示目標張數也更直觀）。 */}
        <TargetBoard label={s.targetBoardLabel} activeDim={op === 'claim' ? state.claimDim : 'N'} dimName={dimName} />

        {/* 手牌 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">
              {state.scene === 'pong-success' || state.scene === 'discard-confirm' ? s.discardToEnd : s.yourHand}
            </span>
            <span className="text-[10px] text-[var(--psy-muted)]">
              {s.cardsCountSuffix(state.hand.length + (state.drawnCard ? 1 : 0))}
            </span>
          </div>
          {renderHand()}
        </div>

        {/* 手牌下方按鈕排：恆佔一行高度，按鈕出現/消失時面板底部不再忽高忽低 */}
        <div className="flex min-h-[46px] flex-col justify-center">

        {/* 回合結束 → 進入截胡演示 */}
        {state.scene === 'turn-done' && (
          <div className="flex justify-center">
            <button onClick={() => dispatch({ type: 'open-claim' })} className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold">
              {s.btnSimDiscard}
            </button>
          </div>
        )}

        {/* 食胡成功 → 完成教程，回首頁 */}
        {state.scene === 'hu-success' && (
          <div className="flex justify-center">
            <button onClick={onComplete} className="psy-btn psy-btn-accent tut-spotlight px-6 py-2.5 text-sm font-bold">
              {s.btnFinishTutorial}
            </button>
          </div>
        )}
        </div>
      </div>

    </motion.div>

    {/* 成功提示 bubble：固定浮層，不隨滾動跑掉，永遠在視窗頂部彈出 */}
    <AnimatePresence>
      {successToast && (
        <motion.div
          key={successToast}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          className="psy-serif fixed left-1/2 top-20 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-emerald-600/35 bg-emerald-50 px-6 py-2.5 text-center text-base font-bold text-emerald-700 shadow-[0_12px_34px_rgba(96,72,38,0.18)]"
        >
          {successToast}
        </motion.div>
      )}
    </AnimatePresence>

    {/* 固定在視窗底部、永遠可見的指引欄。做大做醒目（佔更多空間、強對比）。
        渲染在 motion.div 之外，避免 framer transform 祖先讓 fixed 失效。 */}
    <div ref={guideRef} className="fixed inset-x-0 bottom-0 z-50 [transform:translateZ(0)] border-t-2 border-[rgba(154,116,72,0.36)] bg-[linear-gradient(180deg,#fdf8f1,#eaddc4)] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-14px_34px_rgba(96,72,38,0.18)]">
      <div className="mx-auto max-w-3xl space-y-2.5">
        <div className="space-y-2">
          <span className="psy-serif inline-block rounded-full bg-[var(--psy-accent)] px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-[#1a1206]">
            {s.guideLabel}
          </span>
          <motion.p
            key={state.scene + '-' + state.selectedIds.length + '-' + state.revealedIds.length}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="whitespace-pre-line text-base font-medium leading-7 text-[var(--psy-ink)] sm:text-lg sm:leading-8"
          >
            {captionByScene[state.scene]}
          </motion.p>
        </div>
        {/* 旁白框：min-h 鎖一行高度（有無旁白欄高都不變，貼底欄不再上下彈）；
            mode="wait" 讓舊句完全退場後新句再進——默認 sync 模式會新舊同屏疊放
            ~220ms，欄高瞬間翻倍、舊句一閃而過（錄屏裏的「一閃一閃」）。 */}
        <div className="min-h-[40px]" role="status" aria-live="polite">
          <AnimatePresence mode="wait">
            {state.feedback && (
              <motion.p
                key={state.feedback.text}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={`rounded-lg border px-3 py-2 text-sm leading-6 ${feedbackToneClass}`}
              >
                {state.feedback.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  );
}

// 沙盒目標板：5 維 + 目標張數，當前操作維度高亮。教學玩家「數字=要湊幾張」。
function TargetBoard({ label, activeDim, dimName }: { label: string; activeDim: Dimension | null; dimName: DimName }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-2">
      <span className="mr-1 text-[10px] tracking-wide text-[var(--psy-muted)]">{label}</span>
      {DIMENSIONS.map((d) => {
        const active = d === activeDim;
        const m = DIMENSION_META[d];
        return (
          <span
            key={d}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
            style={{
              color: active ? '#1a1206' : 'var(--psy-ink-soft)',
              background: active ? m.colorHex : '#f8f1e4',
              border: `1px solid ${active ? m.colorHex : 'rgba(154,116,72,0.18)'}`,
            }}
          >
            <span>{dimName(d)}</span>
            <span>{SANDBOX_TARGETS[d]}</span>
          </span>
        );
      })}
    </div>
  );
}

// ── 規則示意圖基元（CSS 拼圖，跟 FlowScreenshot 同一套設計語言）──
// 迷你卡：小圓角卡 + 維度字母／符號，可指定主題色。
function MiniCard({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex h-11 w-8 items-center justify-center rounded-md text-[13px] font-bold"
      style={{
        color,
        background: color + '1a',
        border: `1px solid ${color}66`,
        boxShadow: 'inset 0 0 0 1px rgba(253,248,241,0.55)',
      }}
    >
      {label}
    </span>
  );
}

// 蓋著的牌（未知維度）
function FaceDownCard() {
  return (
    <span
      className="inline-flex h-11 w-8 items-center justify-center rounded-md text-[15px] font-bold text-[var(--psy-muted)]"
      style={{ background: '#fdf8f1', border: '1px solid rgba(154,116,72,0.18)' }}
    >
      ?
    </span>
  );
}

// 牌堆 / 棄牌堆小方塊
function PileBox({ label, glow = false }: { label: string; glow?: boolean }) {
  return (
    <span
      className="inline-flex h-11 w-8 flex-col items-center justify-center rounded-md tracking-wider"
      style={{
        background: 'linear-gradient(180deg, #eaddc4, #d7c49e)',
        border: `1px solid ${glow ? 'rgba(154,116,72,0.62)' : 'rgba(154,116,72,0.28)'}`,
        boxShadow: glow ? '0 0 14px rgba(195,154,82,0.35)' : undefined,
      }}
    >
      <span className="text-sm text-[var(--psy-ink)]">◈</span>
      <span className="text-[7px] text-[var(--psy-ink-soft)]">{label}</span>
    </span>
  );
}

// 已歸檔維度小膠囊（字母 + ✓，金色）
function DonePill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
      style={{ color: 'var(--psy-accent-strong)', background: 'rgba(195,154,82,0.18)', border: '1px solid rgba(154,116,72,0.42)' }}
    >
      {label}
      <span className="text-[8px]">✓</span>
    </span>
  );
}

// 連接符號（+ = →）
function Sym({ children }: { children: ReactNode }) {
  return <span className="px-0.5 text-sm font-bold text-[var(--psy-accent)]">{children}</span>;
}

// 帶說明的示意圖外框
function DiagramFrame({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] px-3 py-3">
      <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
      {caption && <p className="mt-2 text-center text-[10px] leading-4 text-[var(--psy-muted)]">{caption}</p>}
    </div>
  );
}

// 每條規則下的示意圖。flex-wrap 自適應：桌面 2 欄、手機 1 欄都不擠。
function RuleDiagram({ index, s }: { index: number; s: TutStrings }) {
  const c = DIMENSION_META.E.colorHex; // 示例維度用外向性 E 的主題色
  const danger = '#d66a4f'; // 罰停／亮牌的紅

  switch (index) {
    case 0: { // 你的目標：每維各需要 N 張（數字=要湊幾張）→ 全部湊齊食胡
      const sample: Record<Dimension, number> = { O: 3, C: 4, E: 2, A: 5, N: 4 };
      return (
        <DiagramFrame caption={s.dgGoalCaption}>
          <div className="flex flex-wrap justify-center gap-1">
            {DIMENSIONS.map((d) => {
              const m = DIMENSION_META[d];
              return (
                <span
                  key={d}
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{ color: m.colorHex, background: m.colorHex + '20', border: `1px solid ${m.colorHex}66` }}
                >
                  <span>{d}</span>
                  <span>{sample[d]}</span>
                </span>
              );
            })}
          </div>
          <Sym>→</Sym>
          <span className="text-xl">🏆</span>
        </DiagramFrame>
      );
    }

    case 1: // 認識卡牌：兩類牌並排對比（人格牌可歸檔 ✓ / 知識牌不可歸檔 ✗）
      return (
        <DiagramFrame caption={s.dgTwoTypesCaption}>
          {/* 人格描述牌：有顏色、可歸檔 */}
          <div className="flex flex-col items-center gap-1">
            <MiniCard label="E" color={c} />
            <span className="text-[9px] font-medium text-[var(--psy-ink-soft)]">{s.dgCardPersona}</span>
            <span className="text-[9px] font-semibold" style={{ color: '#3f9d5a' }}>✓ {s.dgCanArchive}</span>
          </div>
          <Sym>vs</Sym>
          {/* 知識牌：灰色、不可歸檔、安全棄 */}
          <div className="flex flex-col items-center gap-1">
            <span
              className="inline-flex h-11 w-8 items-center justify-center rounded-md text-[15px] font-bold text-[var(--psy-muted)]"
              style={{ background: '#f1ece2', border: '1px dashed rgba(154,116,72,0.35)' }}
            >
              ⓘ
            </span>
            <span className="text-[9px] font-medium text-[var(--psy-ink-soft)]">{s.dgCardKnowledge}</span>
            <span className="text-[9px] font-semibold text-[var(--psy-muted)]">✕ {s.dgCantArchive}</span>
          </div>
        </DiagramFrame>
      );

    case 2: // 基本輪迴：摸牌 → 出牌 → 判讀窗口
      return (
        <DiagramFrame caption={s.dgDiscardCaption}>
          <PileBox label="DRAW" />
          <Sym>→</Sym>
          <MiniCard label="E" color={c} />
          <Sym>→</Sym>
          <PileBox label={s.dgDiscardPile} glow />
          <span className="text-lg">👀</span>
        </DiagramFrame>
      );

    case 3: // 碰／食胡：2 張同維度手牌 + 1 張進來的牌 = 湊滿鎖定
      return (
        <DiagramFrame caption={s.dgPongCaption}>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              <MiniCard label="E" color={c} />
              <MiniCard label="E" color={c} />
            </div>
            <span className="text-[9px] text-[var(--psy-muted)]">{s.dgHand}（2）</span>
          </div>
          <Sym>+</Sym>
          <div className="flex flex-col items-center gap-1">
            <MiniCard label="E" color={c} />
            <span className="text-[9px] text-[var(--psy-muted)]">{s.dgIncoming}（1）</span>
          </div>
          <Sym>=</Sym>
          <div className="flex flex-col items-center gap-1">
            <span
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-bold tracking-[0.15em]"
              style={{
                color: 'var(--psy-accent)',
                background: 'rgba(200,155,93,0.16)',
                border: '1px solid rgba(200,155,93,0.5)',
              }}
            >
              E E E
              <span className="rounded-full bg-[var(--psy-accent)] px-1.5 text-[10px] text-[#1a1206]">3</span>
            </span>
            <span className="text-[9px] font-medium text-[var(--psy-accent)]">✓ {s.dgLocked}</span>
          </div>
        </DiagramFrame>
      );

    case 4: // 罰停：宣告失敗 → 罰停 1 回合 + 亮牌
      return (
        <DiagramFrame caption={s.dgFrozenCaption}>
          <span className="text-xl">⛔</span>
          <div className="flex gap-1">
            <MiniCard label="E" color={danger} />
            <MiniCard label="A" color={danger} />
          </div>
        </DiagramFrame>
      );

    case 5: // 聯機與勝負：無人胡 → 比已歸檔維度數排名（排名文字已在卡片正文，框內只留示意）
      return (
        <DiagramFrame>
          <span className="text-base">🥇</span>
          <span className="flex gap-0.5"><DonePill label="O" /><DonePill label="C" /><DonePill label="E" /></span>
          <Sym>›</Sym>
          <span className="text-base">🥈</span>
          <span className="flex gap-0.5"><DonePill label="O" /><DonePill label="C" /></span>
        </DiagramFrame>
      );

    default:
      return null;
  }
}

// 流程示意的一行「設置選項」（標籤 + 若干膠囊，active 高亮）。房間/大廳設置面板共用。
function ShotRow({ label, options, active }: { label: string; options: readonly string[]; active: number }) {
  return (
    <div>
      <div className="mb-1 text-[9px] text-[var(--psy-muted)]">{label}</div>
      <div className="flex gap-1.5">
        {options.map((o, i) => (
          <div
            key={o}
            className={`flex-1 rounded-lg border px-1 py-1 text-center text-[10px] ${
              i === active
                ? 'border-[rgba(154,116,72,0.4)] bg-[rgba(195,154,82,0.2)] text-[var(--psy-ink)]'
                : 'border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] text-[var(--psy-muted)]'
            }`}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowScreenshot({ mode, index, s }: { mode: 'pvp' | 'solo'; index: number; s: TutStrings }) {
  // ① 首頁：首次進入只有「開始測評」一個入口。
  const home = (
    <div className="space-y-3">
      <div className="psy-serif text-base text-[var(--psy-ink)]">{s.shotProductName}</div>
      <div className="h-1.5 w-16 rounded-full bg-[rgba(195,154,82,0.4)]" />
      <div className="rounded-full bg-[rgba(200,155,93,0.32)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">
        {s.shotStartAssessBtn}
      </div>
      <div className="text-center text-[9px] text-[var(--psy-muted)]">{s.shotHomeHint}</div>
    </div>
  );

  // ② 輸入學號：答題前只輸入一次。
  const studentId = (
    <div className="space-y-3">
      <div className="psy-serif text-center text-sm text-[var(--psy-ink)]">{s.shotStudentIdTitle}</div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.4)] bg-[var(--psy-card-content)] px-3 py-3 text-center text-xs text-[var(--psy-muted)]">
        {s.shotStudentIdPlaceholder}
      </div>
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">
        {s.shotStartAssessBtn}
      </div>
      <div className="text-center text-[9px] text-[var(--psy-muted)]">{s.shotStudentIdOnce}</div>
    </div>
  );

  // ③ 人格畫像：五維條 + 聯機/單機/重測入口。
  const portrait = (
    <div className="space-y-2.5">
      <div className="psy-serif text-center text-sm text-[var(--psy-ink)]">{s.shotPortraitTitle}</div>
      {/* 迷你五維雷達（示意）：替代原橫條，更直觀——也與流程說明「五維雷達圖」一致。
          原本重複的「聯機/單機/重新測評」按鈕排已移除（正式頁底部才有）。*/}
      <div className="flex justify-center py-0.5">
        <svg viewBox="0 0 100 100" className="h-44 w-44" aria-hidden>
          <polygon points="50,16 82.3,39.5 70,77.5 30,77.5 17.7,39.5" fill="none" stroke="rgba(154,116,72,0.22)" strokeWidth="1" />
          <polygon points="50,33 66.2,44.8 60,63.75 40,63.75 33.85,44.8" fill="none" stroke="rgba(154,116,72,0.16)" strokeWidth="0.8" />
          {([[50, 16], [82.3, 39.5], [70, 77.5], [30, 77.5], [17.7, 39.5]] as const).map(([x, y], i) => (
            <line key={i} x1="50" y1="50" x2={x} y2={y} stroke="rgba(154,116,72,0.16)" strokeWidth="0.7" />
          ))}
          <polygon points="50,26.2 65.5,45 64,69.3 33.6,72.6 32.5,44.3" fill="rgba(195,154,82,0.32)" stroke="#c39a52" strokeWidth="1.6" />
          {([['O', 50, 26.2], ['C', 65.5, 45], ['E', 64, 69.3], ['A', 33.6, 72.6], ['N', 32.5, 44.3]] as const).map(([d, x, y]) => (
            <circle key={d} cx={x} cy={y} r="2.1" fill={DIMENSION_META[d as Dimension].colorHex} />
          ))}
        </svg>
      </div>
    </div>
  );

  // ④-pvp 聯機房間設置：學號帶入(鎖) + 創建/加入 + 人數/輪數/看牌難度。
  const roomSetup = (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-lg border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-3 py-1.5">
        <span className="text-[10px] text-[var(--psy-muted)]">{s.shotStudentId}</span>
        <span className="text-[10px] text-[var(--psy-ink-soft)]">17094905G 🔒</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-[rgba(60,45,25,0.85)] px-2 py-1.5 text-center text-[10px] font-semibold text-[#f5ecdc]">{s.shotCreateRoom}</div>
        <div className="rounded-lg border border-[rgba(154,116,72,0.2)] px-2 py-1.5 text-center text-[10px] text-[var(--psy-muted)]">{s.shotJoinRoom}</div>
      </div>
      <ShotRow label={s.shotMaxPlayersLabel} options={s.shotMaxPlayers} active={1} />
      <ShotRow label={s.shotRoundsLabel} options={s.shotRounds} active={1} />
      <ShotRow label={s.shotRevealLabel} options={s.shotReveals} active={0} />
    </div>
  );

  // ⑤-pvp 開始對戰：座位（房主 + 玩家）+ 開始按鈕。
  const startGame = (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[s.shotYou, 'P2', 'P3', 'P4'].map((name, i) => (
          <div key={name} className="rounded-xl border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-1 py-3 text-center">
            <div className="text-[11px] text-[var(--psy-ink)]">{name}</div>
            {i === 0 && <div className="mt-1 text-[9px] text-[var(--psy-muted)]">{s.shotHost}</div>}
          </div>
        ))}
      </div>
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">{s.shotStartMatch}</div>
    </div>
  );

  // ④-solo 對戰大廳：AI 難度 / 輪數 / 看牌難度 + 對手檔案。
  const soloLobby = (
    <div className="space-y-2.5">
      <ShotRow label={s.shotAiDifficultyLabel} options={s.shotDifficulties} active={0} />
      <ShotRow label={s.shotRoundsLabel} options={s.shotRounds} active={1} />
      <ShotRow label={s.shotRevealLabel} options={s.shotReveals} active={0} />
      <div>
        <div className="mb-1 text-[9px] text-[var(--psy-muted)]">{s.shotOpponentLabel}</div>
        <div className="grid grid-cols-3 gap-1.5">
          {s.shotAiOpponents.map((name) => (
            <div key={name} className="rounded-lg border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-1 py-2 text-center text-[10px] text-[var(--psy-ink-soft)]">
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ⑤-solo 開始對戰：你 + 3 AI + 開始按鈕。
  const soloStart = (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[s.shotYou, ...s.shotAiOpponents].map((name, i) => (
          <div key={name} className="rounded-xl border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] px-1 py-3 text-center">
            <div className="text-[11px] text-[var(--psy-ink)]">{name}</div>
            <div className="mt-1 text-[9px] text-[var(--psy-muted)]">{i === 0 ? s.shotHost : s.shotAiOpponentLabel}</div>
          </div>
        ))}
      </div>
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">{s.shotStartMatch}</div>
    </div>
  );

  // 前 3 幀（測評 → 學號 → 畫像）聯機/單機共用，之後分岔。
  const pvpFrames = [home, studentId, portrait, roomSetup, startGame];
  const soloFrames = [home, studentId, portrait, soloLobby, soloStart];
  const frame = mode === 'pvp' ? pvpFrames[index] : soloFrames[index];

  return (
    <div className="mx-auto w-full max-w-md rounded-[1.2rem] border border-[rgba(154,116,72,0.16)] bg-[linear-gradient(180deg,var(--psy-card),#efe4cf)] p-3 shadow-[0_14px_28px_rgba(96,72,38,0.12)]">
      <div className="min-h-[12rem] rounded-[1rem] border border-[rgba(154,116,72,0.14)] bg-[linear-gradient(180deg,var(--psy-card-content),#f8f1e4)] p-4 shadow-[inset_0_0_0_1px_rgba(255,250,240,0.62)]">
        {frame}
      </div>
    </div>
  );
}

function StartFlowGuide({ s, onEnterSandbox }: { s: TutStrings; onEnterSandbox: () => void }) {
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
        <div className="grid grid-cols-2 gap-2 rounded-full border border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] p-1">
          <button
            onClick={() => switchMode('pvp')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'pvp'
                ? 'bg-[rgba(195,154,82,0.22)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {s.tabPvp}
          </button>
          <button
            onClick={() => switchMode('solo')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'solo'
                ? 'bg-[rgba(195,154,82,0.22)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {s.tabSolo}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        {/* lg：纵向步骤列表（不占纵向空间）。窄屏改用卡片底部的點式頁碼，省空間留給內容。 */}
        <div className="hidden lg:flex lg:flex-col lg:space-y-2">
          {steps.map((step, i) => (
            <button
              key={step.title}
              onClick={() => setIndex(i)}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-left transition lg:w-full lg:shrink ${
                i === index
                  ? 'border-[rgba(154,116,72,0.45)] bg-[rgba(195,154,82,0.14)] text-[var(--psy-ink)]'
                  : 'border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
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
          className="rounded-[1.2rem] border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] p-5"
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
          <div className="mt-5 flex items-center justify-between gap-2">
            {/* 窄屏點式頁碼：取代佔高的步驟膠囊行，點選跳步。lg 有側欄步驟列表故隱藏。 */}
            <div className="flex items-center gap-1.5 lg:hidden">
              {steps.map((step, i) => (
                <button
                  key={step.title}
                  onClick={() => setIndex(i)}
                  aria-label={`${i + 1} ${step.title}`}
                  aria-current={i === index ? 'step' : undefined}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-5 bg-[var(--psy-accent)]' : 'w-2 bg-[rgba(154,116,72,0.3)] hover:bg-[rgba(154,116,72,0.5)]'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
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
          </div>
        </motion.div>
      </div>

      {/* 合併後的沙盒 CTA：先看完流程，再進沙盒打一回合。 */}
      <div className="mt-5 flex flex-col gap-3 rounded-[1.2rem] border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="psy-serif text-sm font-semibold text-[var(--psy-ink)]">{s.sandboxCtaLead}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--psy-ink-soft)]">{s.ctaBody}</p>
        </div>
        <button
          onClick={onEnterSandbox}
          className="psy-btn psy-btn-accent psy-serif shrink-0 px-6 py-3 text-sm font-semibold"
        >
          {s.ctaButton}
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────
export default function TutorialPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'list' | 'sandbox'>('list');
  // 完成教程後回到 list 視圖並滾到「規則要點」——讓玩家接著看規則（而非跳回首頁）。
  const rulesRef = useRef<HTMLDivElement>(null);
  const returnToRules = () => {
    setMode('list');
    setTimeout(() => rulesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  // 沙盒重置信號：頁頭「重新開始」按鈕 +1，InteractiveSandbox 監聽後 dispatch reset。
  const [sandboxResetSignal, setSandboxResetSignal] = useState(0);
  // 沙盒是否已開始（scene 超過第一步）：第一步（抽牌前）不顯示「重新開始」，沒東西可重置。
  const [sandboxStarted, setSandboxStarted] = useState(false);
  const hydrated = useHydrated();
  const locale = useLocaleStore((st) => st.locale);
  const loc: Locale = hydrated ? locale : 'zh';
  // zh / en 結構一致；用 zh 形狀作為各子組件的 props 類型，運行時按 loc 取。
  const s: TutStrings = TUTORIAL_T[loc] as unknown as TutStrings;
  const dimName: DimName = (dim) => (loc === 'en' ? DIMENSION_META[dim].nameEn : DIMENSION_META[dim].name);

  return (
    <div className={`flex flex-1 flex-col items-center px-4 sm:px-6 ${mode === 'sandbox' ? 'py-3 sm:py-4' : 'py-8 sm:py-10'}`}>
      <div className={`w-full max-w-4xl ${mode === 'sandbox' ? 'space-y-3' : 'space-y-6 sm:space-y-8'}`}>
        {/* 沙盒模式頁頭壓縮：大標題+eyebrow ≈ 150px 縱向空間，正是「自摸碰步
            手牌第二行被指引欄蓋住」的元兇之一——沙盒裏收成一行小標題。 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* 分级标题：人格麻將(大) + Big Five 教學(稍小)。flex-wrap → 桌面同行、手机两行；
                两段各自 nowrap，词不被拆。 */}
            <h1 className="psy-serif flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className={`whitespace-nowrap text-[var(--psy-ink)] ${mode === 'sandbox' ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-5xl'}`}>
                {s.titleMain}
              </span>
              <span className={`whitespace-nowrap text-[var(--psy-ink-soft)] ${mode === 'sandbox' ? 'text-sm sm:text-base' : 'text-lg sm:text-2xl'}`}>
                {s.titleSub}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'sandbox' ? (
              <>
                {/* 沙盒模式：重新開始/退出合併進頁頭（原沙盒面板頭一整行已刪，省縱向空間）。
                    規則/返回首頁在沙盒裏用不上，退出後仍可達。
                    第一步（抽牌前）隱藏「重新開始」——還沒東西可重置，顯示奇怪。 */}
                {sandboxStarted && (
                  <button
                    onClick={() => setSandboxResetSignal((n) => n + 1)}
                    className="psy-btn flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
                  >
                    {s.sandboxReset}
                  </button>
                )}
                <button
                  onClick={() => setMode('list')}
                  className="psy-btn psy-btn-ghost flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
                >
                  {s.sandboxExit}
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {mode === 'list' && (
          <>
            {/* 先看流程（StartFlowGuide），沙盒 CTA 已合併到它的底部。 */}
            <StartFlowGuide s={s} onEnterSandbox={() => setMode('sandbox')} />

            {/* 概念卡片 */}
            <div ref={rulesRef} className="scroll-mt-4">
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
                    <RuleDiagram index={i} s={s} />
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
          {mode === 'sandbox' && <InteractiveSandbox onComplete={returnToRules} s={s} dimName={dimName} loc={loc} resetSignal={sandboxResetSignal} onStartedChange={setSandboxStarted} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
