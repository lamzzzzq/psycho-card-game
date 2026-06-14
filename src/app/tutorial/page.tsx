'use client';

import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/game/Card';
import { DIMENSION_META } from '@/data/dimensions';
import { DIMENSIONS } from '@/types';
import type { GameCard, PersonalityCard, DummyCard, Dimension } from '@/types';

// ─── Static doc: 概念分組 ────────────────────────────────────────────────
type Step = {
  title: string;
  body: string;
  hint?: string;
};

type FlowStep = {
  title: string;
  body: string;
  note?: string;
};

const PVP_FLOW: FlowStep[] = [
  {
    title: '進入聯機對戰',
    body: '從首頁點「聯機對戰」。這裏不是直接進牌桌，而是先進入聯機大廳。',
  },
  {
    title: '填寫身份信息',
    body: '只輸入學號，並再次輸入學號確認。學號用於防止同一個人同時佔兩個活動房間的座位。',
  },
  {
    title: '檢查是否完成測評',
    body: '已測評：系統會用你的五維分數生成本局目標張數。未測評：會先引導去測評，否則你的目標張數沒有依據。',
    note: '測評結果會影響每個維度需要歸檔幾張，所以不同玩家的胡牌路線不同。',
  },
  {
    title: '創建房間 / 加入房間',
    body: '房主創建房間後拿到房間碼並等待其他玩家；非房主輸入房間碼加入。4 個真實玩家坐齊後才適合開始。',
  },
  {
    title: '開始遊戲',
    body: '房主負責點開始。進入牌桌後，所有人的手牌維度默認不公開，只能靠描述、記憶和每回合查看能力判斷。',
  },
];

const SOLO_FLOW: FlowStep[] = [
  {
    title: '進入單機對戰',
    body: '從首頁點「單機對戰」。如果沒有測評結果，會先去測評；如果已經測評，直接進入單機設置大廳。',
  },
  {
    title: '選擇 AI 難度',
    body: '簡單偏隨機，中等會做基礎歸檔判斷，困難會更積極推測你的牌。',
  },
  {
    title: '選擇輪數',
    body: '5 / 10 / 15 / 無限都可以。無限會一直打到有人食胡或牌局自然結束。',
  },
  {
    title: '確認對手陣容',
    body: '單機固定是你 + 3 個 AI。AI 會按自己的策略抽牌、棄牌、碰牌和食胡。',
  },
  {
    title: '開始遊戲',
    body: '進入牌桌後流程和聯機一致：抽牌、查看、歸檔、棄牌、響應別人棄牌。',
  },
];

const STEPS: Step[] = [
  {
    title: '你的目標',
    body: '5 個人格維度（開放性、盡責性、外向性、宜人性、情緒穩定性）全部完成「公開歸檔」，先達成的玩家獲勝。每個維度的目標張數等於你測評出來的分數四捨五入，所以每人的「胡牌路線」都不一樣。',
  },
  {
    title: '牌桌',
    body: '單機固定 4 人（你 + 3 個 AI）；聯機 2–4 名真實玩家。牌堆會依人數縮放。牌分兩類：帶顏色標記的「人格描述牌」（屬於某一維度），以及無維度歸屬的「檔案註記 / 知識牌」（中立，可棄可觀察對手風格）。',
    hint: '初始手牌張數 = 5 個維度目標張數之和 − 1。少的那張要靠「碰」或「食胡」補齊。',
  },
  {
    title: '抽牌',
    body: '輪到你時，先點擊牌堆抽 1 張。如果你願意，可以一次性開啓「查看 2 張牌」的特權 —— 每回合最多 1 次，把任意 2 張未知的手牌真實人格揭開。用完即重置到下次回合。',
  },
  {
    title: '出牌',
    body: '抽完後選 1 張你不需要的丟到中間的棄牌堆。被棄出的牌進入「心理判讀窗口」，其他 3 名玩家有幾秒鐘決定是否要「碰」（同維度歸檔）或「食胡」（直接勝利）。',
  },
  {
    title: '碰（公開歸檔）',
    body: '把同維度的牌湊齊目標張數即可歸檔。兩種觸發方式：\n• 自摸碰（你自己回合內，每回合最多 1 次）→ 從你的「手牌 + 剛抽到的牌」裏挑選恰好「該維度目標張數」張同維度牌；\n• 截胡碰（claim 窗口內先點先得）→ 從手牌挑選「該維度目標張數 − 1」張同維度牌，加上那張棄牌正好湊齊；\n選錯維度、混入其他人格牌、張數不對 → 視爲「碰失敗」，會被罰停（見下「罰停」一節）。',
    hint: '系統不會告訴你「這個維度你夠了」，5 個未歸檔維度全部讓你選，需要自己判斷。',
  },
  {
    title: '食胡（宣佈勝利）',
    body: '當你的牌（已歸檔 + 手中 + 這張待判定牌）正好完成全部 5 個維度時，按下「食胡」。\n觸發時機：\n• 你的回合中（自摸食胡）；\n• 任意人棄牌進入判讀窗口時（截胡食胡）。\n判定不成立 → 食胡失敗，整副手牌公開並罰停。',
  },
  {
    title: '罰停（失敗的懲罰）',
    body: '「碰失敗 / 自摸碰失敗 / 食胡失敗」三者懲罰相同：下次輪到你時罰停一回合，自動跳過（不抽牌、不出牌）後立即解除。\n罰停期間：\n• 你押錯的那幾張牌（碰 / 自摸碰）或整副手牌（食胡）立即公開；\n• 任何人棄牌進入判讀窗口時，你都不能參與（不能碰、不能食胡）。\n所有玩家都會在你頭像下看到「⛔ 罰停中」標識。',
    hint: '一次誤判 ≈ 損失下一個出牌回合，務必想清楚再下手。罰停期間也不能宣告食胡。',
  },
  {
    title: '查看 2 張牌（每回合 1 次）',
    body: '手牌人格默認不顯示維度，必須靠記憶和推理。但你可以在自己回合開始抽完後，啓用「🔍 查看 2 張牌」一次性把 2 張手牌的真實維度揭開。本回合內有效，下回合自動重置。\n用得好的玩家會優先看自己最不確定的牌，避免歸檔時混入錯誤。',
  },
  {
    title: '知識牌（檔案註記）',
    body: '牌堆裏有一類無人格歸屬的「檔案註記 / 知識牌」 —— 內容是心理學常識。它們不能用於歸檔，但也不會"穿幫"成錯誤維度。\n用途：\n• 抽到就丟，騰出手牌空間；\n• 也是觀察對手心理風格的趣味設計（看對手怎麼挑這些中性牌可以暴露偏好）。',
  },
  {
    title: '聯機 · 退出與輪轉',
    body: '聯機房 2–4 人，任何人點「退出對局」即從該桌退出 —— 不接管，剩下的玩家繼續打到分勝負。\n• 退出者的座位永久跳過（看到「🚪 已退出對局」徽章）；\n• 僅剩 1 人即自動宣告該玩家勝利；\n• 你的回合超過 30 秒未操作會彈「請注意：現在是你的回合」提醒，每 30 秒重複一次直到你出牌。',
    hint: '同學號同時進入兩個活動房間會被拒絕 —— 防止兩個客戶端共享同一座位。',
  },
  {
    title: '勝負與結算',
    body: '第一個完成全部 5 維度歸檔的玩家直接獲勝。若打滿約定輪數仍無人胡，則按排名結算：先比已歸檔維度數（多者勝），同數再比剩餘手牌（少者勝）。',
  },
];

// ─── Interactive Sandbox ─────────────────────────────────────────────────
// 真正可點擊的教學場景。固定 12 張牌的劇本，玩家按順序：
//   1. 點牌堆抽牌
//   2. 點自摸碰 → 選牌
//   3. 故意選錯 → 看失敗演示 → 重置
//   4. 選對 → 歸檔成功
//   5. 出 1 張牌結束回合

const PC = (id: number, dim: Dimension, text: string, facet = 'demo'): PersonalityCard => ({
  id, dimension: dim, text, facet,
});
const DC = (id: number, text: string): DummyCard => ({ id, text, isDummy: true });

// 歸檔 4 張情緒穩定性後，手裏留兩對（盡責性 104/108、宜人性 105/106）+ 兩張單張 +
// 知識牌 → 無論玩家棄哪一張，都至少剩一對可用於「截胡碰」演示。
const SANDBOX_HAND: GameCard[] = [
  PC(101, 'N', '我經常感到焦慮或憂慮'),
  PC(102, 'N', '我容易情緒波動'),
  PC(103, 'N', '我容易感到壓力'),
  PC(104, 'C', '我會認真完成我承諾過的事'),
  PC(105, 'A', '我願意體諒別人的感受'),
  PC(106, 'A', '我會主動幫助遇到困難的人'),
  PC(107, 'O', '我對抽象的哲學問題很感興趣'),
  PC(108, 'C', '我做事情之前總會制定計劃'),
  DC(109, '顏色會影響食慾，藍色會抑制飢餓感'),
];
const SANDBOX_DRAWN: PersonalityCard = PC(110, 'N', '我對批評比較敏感');
// 對手棄牌（截胡碰用）：維度在 open-claim 時按手裏現存的對子動態選定。
const CLAIM_CARDS: Record<Dimension, PersonalityCard> = {
  O: PC(111, 'O', '我喜歡探索新奇的點子'),
  C: PC(111, 'C', '我做事一向井井有條'),
  E: PC(111, 'E', '我在人群裏很有活力'),
  A: PC(111, 'A', '我會站在別人的角度想'),
  N: PC(111, 'N', '我對批評比較敏感'),
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

function reducer(state: SandboxState, action: Action): SandboxState {
  switch (action.type) {
    case 'draw':
      if (state.scene !== 'start') return state;
      return {
        ...state,
        scene: 'viewing',
        drawnCard: SANDBOX_DRAWN,
        feedback: { tone: 'success', text: '抽到一張線索牌。現在選擇很多，先演示「查看 2 張牌」。' },
      };
    case 'view-two':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        revealedIds: [104, 110],
        feedback: { tone: 'info', text: '本回合查看了 2 張牌：一張盡責性，一張情緒穩定性。真實牌局裏只會揭開你選的 2 張。' },
      };
    case 'finish-view':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        scene: 'after-draw',
        feedback: { tone: 'success', text: '現在你知道剛抽到的牌能補齊一組。下一步演示自摸碰。' },
      };
    case 'open-pong':
      if (state.scene !== 'after-draw') return state;
      return {
        ...state,
        scene: 'pong-dimension',
        revealedAll: true, // 教學模式揭開維度，方便玩家看牌選維度
        selectedIds: [],
        chosenDim: null,
        feedback: { tone: 'info', text: '自摸碰要先選定一個人格維度。提示：手牌裏有 4 張「情緒穩定性」，選它。' },
      };
    case 'choose-dim': {
      if (state.scene !== 'pong-dimension') return state;
      const name = DIMENSION_META[action.dim].name;
      return {
        ...state,
        scene: 'pong-picking',
        chosenDim: action.dim,
        selectedIds: [],
        feedback: { tone: 'info', text: `已選擇「${name}」。現在從手牌精確選擇 4 張「${name}」的牌。` },
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
        // 成功：4 張情緒穩定性從手牌移除，drawnCard 也消耗
        const remaining = state.hand.filter((c) => !state.selectedIds.includes(c.id));
        const drawnUsed = state.drawnCard && state.selectedIds.includes(state.drawnCard.id);
        return {
          ...state,
          scene: 'pong-success',
          hand: remaining,
          drawnCard: drawnUsed ? null : state.drawnCard,
          selectedIds: [],
          declared: true,
          feedback: { tone: 'success', text: '歸檔成功。4 張進入公開歸檔區，歸檔後必須立即棄 1 張牌。' },
        };
      }
      // 失敗
      const dimName = dim ? DIMENSION_META[dim].name : '該維度';
      const reason = !correctCount
        ? `選了 ${selected.length} 張，必須正好 4 張`
        : `選中的牌裏有非「${dimName}」（檔案註記不算任何維度）`;
      return {
        ...state,
        scene: 'pong-failed',
        feedback: {
          tone: 'fail',
          text: `自摸碰失敗：${reason}。真實遊戲會罰停一回合（下次輪到你時自動跳過），並公開你剛剛押錯的牌。`,
        },
        failCount: state.failCount + 1,
        penaltyShown: true,
      };
    }
    case 'continue-after-fail': {
      if (state.scene !== 'pong-failed') return state;
      const name = state.chosenDim ? DIMENSION_META[state.chosenDim].name : '同維度';
      return {
        ...state,
        scene: 'pong-picking',
        selectedIds: [],
        feedback: { tone: 'info', text: `試試這次只選 4 張「${name}」（高亮的牌）。` },
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
          text: '出牌完成。現在切到別人棄牌時，你如何響應「碰 / 食胡」。',
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
      const name = DIMENSION_META[claimDim].name;
      return {
        ...state,
        scene: 'claim-window',
        selectedIds: [],
        claimDim,
        feedback: { tone: 'info', text: `對手棄出一張「${name}」線索牌。從手牌選 2 張「${name}」，加這張棄牌湊成一組。` },
      };
    }
    case 'commit-claim': {
      if (state.scene !== 'claim-window' || !state.claimDim) return state;
      const dim = state.claimDim;
      const picked = state.hand.filter((c) => state.selectedIds.includes(c.id));
      const ok = picked.length === 2 && picked.every((c) => !c.isDummy && 'dimension' in c && c.dimension === dim);
      if (!ok) {
        const name = DIMENSION_META[dim].name;
        return {
          ...state,
          feedback: {
            tone: 'fail',
            text: `截胡碰需要正好 2 張「${name}」手牌（已選 ${picked.length}）。真實遊戲選錯會判失敗並罰停一回合。`,
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
        feedback: { tone: 'success', text: '截胡碰成功。你用手裏 2 張同類牌 + 對手棄牌完成了一組公開歸檔。' },
      };
    }
    case 'show-hu':
      if (state.scene !== 'claim-window' && state.scene !== 'claim-success') return state;
      return {
        ...state,
        scene: 'hu-demo',
        feedback: { tone: 'success', text: '食胡用於宣佈勝利：當 5 個維度全部完成時按下。誤按會公開整副手牌並罰停。' },
      };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

function InteractiveSandbox({ onClose }: { onClose: () => void }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const N = DIMENSION_META.N;
  const archived = state.chosenDim ? DIMENSION_META[state.chosenDim] : N;
  const claimed = state.claimDim ? DIMENSION_META[state.claimDim] : DIMENSION_META.A;

  const chosenName = state.chosenDim ? DIMENSION_META[state.chosenDim].name : '';
  const captionByScene: Record<Scene, string> = {
    start: '這是你的開局：手牌裏有多種人格描述和 1 張檔案註記。你需要先抽牌，再決定要查看、歸檔還是棄牌。',
    viewing: '每回合可以查看 2 張手牌的真實維度。點擊「查看 2 張」後，再繼續進入歸檔判斷。',
    'after-draw': '你現在擁有足夠完成一組的線索。下一步點高亮的「自摸碰」試試。',
    'pong-dimension': '自摸碰要先選定一個人格維度。在下方五個維度裏選擇高亮的「情緒穩定性」（手牌裏正好有 4 張）。',
    'pong-picking':
      state.selectedIds.length === 4
        ? `已選 4 張「${chosenName}」。點高亮的「自摸歸檔」完成歸檔。`
        : `從手牌精確選擇 4 張「${chosenName}」的牌（高亮的牌就是，已選 ${state.selectedIds.length}/4）。`,
    'pong-failed': '失敗會公開你押錯的牌並罰停一回合（下次輪到你時自動跳過）。點「繼續」回到選牌模式。',
    'pong-success': '歸檔成功！現在必須棄 1 張牌結束回合。點下方高亮的手牌中任意一張棄掉。',
    'claim-window': state.claimDim
      ? `別人棄牌後的判讀窗口：從手牌選 2 張高亮的「${DIMENSION_META[state.claimDim].name}」，加那張棄牌湊一組，再點「碰」（已選 ${state.selectedIds.length}/2）。`
      : '現在是別人棄牌後的判讀窗口。你可以截胡碰，也可以在已經滿足全部目標時食胡。',
    'claim-success': '截胡碰也會形成公開歸檔。這個記錄會出現在玩家頭像下和歸檔記錄裏。',
    'hu-demo': '食胡是勝利按鈕，只在所有目標完成時使用。失敗成本很高，所以不要拿它試錯。',
    'discard-picking': '點擊要棄的牌。',
    done: '你的回合結束。下一步模擬別人棄牌後的「碰 / 食胡」窗口。',
  };

  const renderHand = () => {
    const all: GameCard[] = [...state.hand, ...(state.drawnCard ? [state.drawnCard] : [])];
    if (all.length === 0) {
      return <div className="py-4 text-center text-xs text-[var(--psy-muted)]">（手牌已清空）</div>;
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
                <Card
                  card={c}
                  compact
                  revealedDimension={(state.revealedAll || state.revealedIds.includes(c.id)) && dimension ? dimension : null}
                  revealedAsKnowledge={(state.revealedAll || state.revealedIds.includes(c.id)) && isDummy}
                  selected={isSelected}
                />
                {isDrawn && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--psy-accent)] px-2 py-0.5 text-[8px] font-bold text-black">
                    剛抽到
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
          交互式沙盒
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'reset' })}
            className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            重置
          </button>
          <button
            onClick={onClose}
            className="text-xs text-[var(--psy-muted)] underline underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            退出沙盒
          </button>
        </div>
      </div>

      {/* 牌桌 */}
      <div className="space-y-4 rounded-[1.4rem] border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-4">
        {/* 歸檔區 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--psy-muted)]">公開歸檔：</span>
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
              {archived.name} 4 張
            </span>
          ) : (
            <span className="text-[var(--psy-muted)]">（暫無）</span>
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
              {claimed.name} 3 張
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
              {state.scene === 'start' ? '點擊抽牌 ↓' : '牌堆'}
            </span>
            <div className={state.scene === 'start' ? 'tut-spotlight' : ''}>
              <Card card={PC(999, 'N', '')} faceUp={false} compact />
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
            食胡
          </button>
          <button
            disabled={state.scene !== 'viewing' || state.revealedIds.length > 0}
            onClick={() => dispatch({ type: 'view-two' })}
            className={`psy-btn psy-btn-ghost px-4 py-1.5 text-xs font-bold ${
              state.scene === 'viewing' && state.revealedIds.length === 0 ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            查看 2 張
          </button>
          <button
            disabled={state.scene !== 'viewing' || state.revealedIds.length === 0}
            onClick={() => dispatch({ type: 'finish-view' })}
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold ${
              state.scene === 'viewing' && state.revealedIds.length > 0 ? 'tut-spotlight' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            繼續判斷
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
            自摸碰
          </button>
        </div>

        {/* 自摸碰第一步：選人格維度 */}
        {state.scene === 'pong-dimension' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-3 text-xs text-[var(--psy-accent)]"
          >
            <span>🎯 第一步 · 選擇要歸檔的人格維度</span>
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
                    {meta.name}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => dispatch({ type: 'cancel-pong' })}
              className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]"
            >
              取消
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
            <span>
              🎯 第二步 · 自摸碰 ·{' '}
              <span style={{ color: state.chosenDim ? DIMENSION_META[state.chosenDim].colorHex : N.colorHex }}>
                {chosenName}
              </span>{' '}
              · 請精確選擇 4 張（已選 {state.selectedIds.length}/4）
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => dispatch({ type: 'cancel-pong' })}
                className="psy-btn psy-btn-ghost px-3 py-1 text-[10px]"
              >
                取消
              </button>
              <button
                onClick={() => dispatch({ type: 'commit-pong' })}
                className={`psy-btn psy-btn-accent px-3 py-1 text-[10px] font-bold ${state.selectedIds.length === 4 ? 'tut-spotlight' : ''}`}
              >
                自摸歸檔
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
              繼續 →
            </button>
          </div>
        )}

        {state.penaltyShown && state.scene === 'pong-failed' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-300">
            罰停一回合演示：本輪不能參與別人棄牌的判讀窗口，下次輪到你時自動跳過。
          </div>
        )}

        {state.scene === 'claim-window' && state.claimDim && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.06)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="flex justify-center">
              <Card card={CLAIM_CARDS[state.claimDim]} compact revealedDimension={state.claimDim} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="psy-serif text-sm text-[var(--psy-ink)]">小明棄出了一張線索牌</div>
              <div className="mt-1 leading-6">
                從下方手牌選 <b style={{ color: DIMENSION_META[state.claimDim].colorHex }}>2 張「{DIMENSION_META[state.claimDim].name}」</b>（高亮的牌），加這張棄牌湊成一組。已選 {state.selectedIds.length}/2。
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'commit-claim' })}
              className={`psy-btn psy-btn-accent self-center px-4 py-2 text-xs font-bold ${state.selectedIds.length === 2 ? 'tut-spotlight' : ''}`}
            >
              碰
            </button>
          </motion.div>
        )}

        {state.scene === 'claim-success' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'show-hu' })}
              className="psy-btn psy-btn-danger px-4 py-1.5 text-xs font-bold"
            >
              繼續看食胡
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
            食胡只在 5 個維度都完成時按。判定不成立會公開整副手牌並罰停，所以它是確認勝利，不是試探按鈕。
          </div>
        )}

        {/* 手牌 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">
              {state.scene === 'pong-success' ? '出 1 張牌結束回合 ↓' : '你的手牌'}
            </span>
            <span className="text-[10px] text-[var(--psy-muted)]">
              {state.hand.length + (state.drawnCard ? 1 : 0)} 張
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
              模擬別人棄牌
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'reset' })}
              className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
            >
              再來一遍
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
          <span className="psy-eyebrow mt-0.5 shrink-0 text-[10px] text-[var(--psy-accent)]">指引</span>
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

function FlowScreenshot({ mode, index }: { mode: 'pvp' | 'solo'; index: number }) {
  const frameTitle = mode === 'pvp' ? '聯機流程截圖示意' : '單機流程截圖示意';

  const homeChoice = (
    <div className="space-y-3">
      <div className="psy-serif text-sm text-[var(--psy-ink)]">人格麻將</div>
      <div className="grid gap-2">
        <div className={`${mode === 'pvp' ? 'bg-[rgba(200,155,93,0.28)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.04)] text-[var(--psy-muted)]'} rounded-full border border-[rgba(200,155,93,0.24)] px-4 py-2 text-center text-sm`}>
          聯機對戰
        </div>
        <div className={`${mode === 'solo' ? 'bg-[rgba(200,155,93,0.28)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.04)] text-[var(--psy-muted)]'} rounded-full border border-[rgba(200,155,93,0.24)] px-4 py-2 text-center text-sm`}>
          單機對戰
        </div>
      </div>
    </div>
  );

  const identityForm = (
    <div className="space-y-3">
      <div className="psy-serif text-sm text-[var(--psy-ink)]">玩家信息</div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-3 py-2">
        <div className="text-[9px] text-[var(--psy-muted)]">學號</div>
        <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">請輸入學號</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-3 py-2">
        <div className="text-[9px] text-[var(--psy-muted)]">確認學號</div>
        <div className="mt-1 text-xs text-[var(--psy-ink-soft)]">再次輸入學號確認</div>
      </div>
    </div>
  );

  const assessmentCheck = (
    <div className="grid gap-2">
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
        <div className="text-xs font-semibold text-emerald-300">已完成測評</div>
        <div className="mt-1 text-[10px] leading-5 text-[var(--psy-ink-soft)]">直接生成本局目標張數。</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.08)] px-3 py-2">
        <div className="text-xs font-semibold text-[var(--psy-accent)]">未完成測評</div>
        <div className="mt-1 text-[10px] leading-5 text-[var(--psy-ink-soft)]">先去答題，再回到大廳。</div>
      </div>
    </div>
  );

  const roomPanel = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] p-3">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">創建房間</div>
        <div className="mt-2 rounded-lg bg-[rgba(200,155,93,0.12)] px-3 py-2 text-center text-sm text-[var(--psy-accent)]">房間碼 4821</div>
      </div>
      <div className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] p-3">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">加入房間</div>
        <div className="mt-2 rounded-lg border border-[rgba(200,155,93,0.2)] px-3 py-2 text-center text-xs text-[var(--psy-muted)]">輸入 4 位房間碼</div>
      </div>
    </div>
  );

  const startGame = (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {['你', '11', '12', '13'].map((name, i) => (
          <div key={name} className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.03)] px-2 py-3 text-center">
            <div className="text-xs text-[var(--psy-ink)]">{name}</div>
            <div className="mt-1 text-[9px] text-[var(--psy-muted)]">{i === 0 ? '房主' : '已就緒'}</div>
          </div>
        ))}
      </div>
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">開始遊戲</div>
    </div>
  );

  const soloSetup = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {['簡單', '中等', '困難'].map((label, i) => (
          <div key={label} className={`${i === Math.min(index, 2) ? 'bg-[rgba(200,155,93,0.22)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.03)] text-[var(--psy-muted)]'} rounded-xl border border-[rgba(200,155,93,0.18)] px-2 py-3 text-center text-xs`}>
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['5輪', '10輪', '15輪', '無限'].map((label, i) => (
          <div key={label} className={`${i === 1 ? 'bg-[rgba(200,155,93,0.18)] text-[var(--psy-ink)]' : 'bg-[rgba(255,255,255,0.03)] text-[var(--psy-muted)]'} rounded-xl border border-[rgba(200,155,93,0.16)] px-2 py-2 text-center text-[10px]`}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );

  const soloOpponents = (
    <div className="grid grid-cols-3 gap-2">
      {['小明', '林教授', '老陳'].map((name) => (
        <div key={name} className="rounded-xl border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.035)] px-2 py-4 text-center">
          <div className="text-sm text-[var(--psy-ink)]">{name}</div>
          <div className="mt-2 text-[9px] leading-4 text-[var(--psy-muted)]">AI 對手</div>
        </div>
      ))}
    </div>
  );

  const soloStart = (
    <div className="space-y-3">
      {soloSetup}
      <div className="rounded-full bg-[rgba(200,155,93,0.28)] px-4 py-2 text-center text-sm font-semibold text-[var(--psy-ink)]">開始對戰</div>
    </div>
  );

  const pvpFrames = [homeChoice, identityForm, assessmentCheck, roomPanel, startGame];
  const soloFrames = [homeChoice, assessmentCheck, soloSetup, soloOpponents, soloStart];
  const frame = mode === 'pvp' ? pvpFrames[index] : soloFrames[index];

  return (
    <div className="rounded-[1.2rem] border border-[rgba(200,155,93,0.16)] bg-[radial-gradient(circle_at_top,rgba(200,155,93,0.10),transparent_42%),rgba(9,15,23,0.68)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="psy-serif text-[10px] text-[var(--psy-accent)]">{frameTitle}</span>
        <span className="rounded-full border border-[rgba(200,155,93,0.18)] px-2 py-0.5 text-[9px] text-[var(--psy-muted)]">靜態示意</span>
      </div>
      <div className="min-h-[12rem] rounded-[1rem] border border-[rgba(200,155,93,0.12)] bg-[linear-gradient(180deg,rgba(18,31,45,0.76),rgba(9,15,23,0.86))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
        {frame}
      </div>
    </div>
  );
}

function StartFlowGuide() {
  const [mode, setMode] = useState<'pvp' | 'solo'>('pvp');
  const [index, setIndex] = useState(0);
  const steps = mode === 'pvp' ? PVP_FLOW : SOLO_FLOW;
  const current = steps[index];

  const switchMode = (next: 'pvp' | 'solo') => {
    setMode(next);
    setIndex(0);
  };

  return (
    <div className="psy-panel psy-etched rounded-[1.6rem] p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="psy-eyebrow text-[10px]">開始遊戲流程</p>
          <h2 className="psy-serif mt-2 text-2xl text-[var(--psy-ink)]">從首頁到開局</h2>
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
            聯機對戰
          </button>
          <button
            onClick={() => switchMode('solo')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'solo'
                ? 'bg-[rgba(200,155,93,0.24)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            單機對戰
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
            <FlowScreenshot mode={mode} index={index} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0}
              className="psy-btn psy-btn-ghost px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一步
            </button>
            <button
              onClick={() => setIndex(Math.min(steps.length - 1, index + 1))}
              disabled={index === steps.length - 1}
              className="psy-btn psy-btn-accent px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一步
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

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="psy-serif text-[11px] uppercase tracking-[0.42em] text-[var(--psy-ink-soft)] sm:text-xs">
              Tutorial
            </p>
            <h1 className="psy-serif text-3xl text-[var(--psy-ink)] sm:text-5xl">
              人格麻將 · 教學
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/rules')}
              className="psy-btn flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
            >
              規則 Hardcopy
            </button>
            <button
              onClick={() => router.push('/')}
              className="psy-btn psy-btn-ghost flex-1 px-3.5 py-2 text-xs sm:flex-none sm:text-sm"
            >
              返回首頁
            </button>
          </div>
        </div>

        {mode === 'list' && (
          <>
            {/* 主 CTA */}
            <div className="psy-panel psy-etched rounded-[1.6rem] p-6 text-center sm:p-7">
              <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">
                先看流程，再進沙盒打一回合
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--psy-ink-soft)]">
                教學覆蓋：聯機 / 單機開局、答題檢查、房間流程、查看手牌、碰、食胡、失敗懲罰。
              </p>
              <button
                onClick={() => setMode('sandbox')}
                className="psy-btn psy-btn-accent psy-serif mt-4 px-7 py-3 text-base font-semibold"
              >
                ▶ 進入交互沙盒
              </button>
            </div>

            <StartFlowGuide />

            {/* 概念卡片 */}
            <div>
              <p className="psy-eyebrow mb-3 text-[10px]">規則要點</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {STEPS.map((s, i) => (
                  <div key={s.title} className="psy-panel psy-etched rounded-[1.4rem] p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="psy-serif text-xs text-[var(--psy-accent)]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="psy-serif text-lg text-[var(--psy-ink)]">{s.title}</h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--psy-ink-soft)]">
                      {s.body}
                    </p>
                    {s.hint && (
                      <p className="mt-3 rounded-lg border border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.06)] px-3 py-2 text-xs text-[var(--psy-accent)]">
                        💡 {s.hint}
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
                直接開始測評
              </button>
              <button
                onClick={() => router.push('/')}
                className="psy-btn psy-btn-ghost px-6 py-3 text-sm"
              >
                返回首頁
              </button>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {mode === 'sandbox' && <InteractiveSandbox onClose={() => setMode('list')} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
