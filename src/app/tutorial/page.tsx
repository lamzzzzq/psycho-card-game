'use client';

import { useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/game/Card';
import { DIMENSION_META } from '@/data/dimensions';
import type { GameCard, PersonalityCard, DummyCard, Dimension } from '@/types';

// ─── Static doc: 概念分组 ────────────────────────────────────────────────
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
    title: '进入联机对战',
    body: '从首页点「联机对战」。这里不是直接进牌桌，而是先进入联机大厅。',
  },
  {
    title: '填写身份信息',
    body: '输入姓名和学号。学号用于防止同一个人同时占两个活动房间的座位。',
  },
  {
    title: '检查是否完成测评',
    body: '已测评：系统会用你的五维分数生成本局目标张数。未测评：会先引导去测评，否则你的目标张数没有依据。',
    note: '测评结果会影响每个维度需要归档几张，所以不同玩家的胡牌路线不同。',
  },
  {
    title: '创建房间 / 加入房间',
    body: '房主创建房间后拿到房间码并等待其他玩家；非房主输入房间码加入。4 个真实玩家坐齐后才适合开始。',
  },
  {
    title: '开始游戏',
    body: '房主负责点开始。进入牌桌后，所有人的手牌维度默认不公开，只能靠描述、记忆和每回合查看能力判断。',
  },
];

const SOLO_FLOW: FlowStep[] = [
  {
    title: '进入单机对战',
    body: '从首页点「单机对战」。如果没有测评结果，会先去测评；如果已经测评，直接进入单机设置大厅。',
  },
  {
    title: '选择 AI 难度',
    body: '简单偏随机，中等会做基础归档判断，困难会更积极推测你的牌。',
  },
  {
    title: '选择轮数',
    body: '5 / 10 / 15 / 无限都可以。无限会一直打到有人食胡或牌局自然结束。',
  },
  {
    title: '确认对手阵容',
    body: '单机固定是你 + 3 个 AI。AI 会按自己的策略抽牌、弃牌、碰牌和食胡。',
  },
  {
    title: '开始游戏',
    body: '进入牌桌后流程和联机一致：抽牌、查看、归档、弃牌、响应别人弃牌。',
  },
];

const STEPS: Step[] = [
  {
    title: '你的目标',
    body: '5 个人格维度（开放性、尽责性、外向性、宜人性、神经质）全部完成「公开归档」，先达成的玩家获胜。每个维度的目标张数等于你测评出来的分数四舍五入，所以每人的「胡牌路线」都不一样。',
  },
  {
    title: '牌桌',
    body: '4 人对局（单机 = 你 + 3 个 AI，联机 = 4 个真实玩家）。牌堆由两类牌组成：带颜色标记的「人格描述牌」（属于某一维度），以及无维度归属的「档案注记 / 知识牌」（中立，可弃可观察对手风格）。',
    hint: '初始手牌张数 = 5 个维度目标张数之和 − 1。少的那张要靠「碰」或「食胡」补齐。',
  },
  {
    title: '抽牌',
    body: '轮到你时，先点击牌堆抽 1 张。如果你愿意，可以一次性开启「查看 2 张牌」的特权 —— 每回合最多 1 次，把任意 2 张未知的手牌真实人格揭开。用完即重置到下次回合。',
  },
  {
    title: '出牌',
    body: '抽完后选 1 张你不需要的丢到中间的弃牌堆。被弃出的牌进入「心理判读窗口」，其他 3 名玩家有几秒钟决定是否要「碰」（同维度归档）或「食胡」（直接胜利）。',
  },
  {
    title: '碰（公开归档）',
    body: '把同维度的牌凑齐目标张数即可归档。两种触发方式：\n• 自摸碰（你自己回合内，每回合最多 1 次）→ 从你的「手牌 + 刚抽到的牌」里挑选恰好「该维度目标张数」张同维度牌；\n• 截胡碰（claim 窗口内先点先得）→ 从手牌挑选「该维度目标张数 − 1」张同维度牌，加上那张弃牌正好凑齐；\n选错维度、混入其他人格牌、张数不对 → 视为「碰失败」，吃罚停一整轮。',
    hint: '系统不会告诉你「这个维度你够了」，5 个未归档维度全部让你选，需要自己判断。',
  },
  {
    title: '食胡（宣布胜利）',
    body: '当你的牌（已归档 + 手中 + 这张待判定牌）正好完成全部 5 个维度时，按下「食胡」。\n触发时机：\n• 你的回合中（自摸食胡）；\n• 任意人弃牌进入判读窗口时（截胡食胡）。\n判定不成立 → 食胡失败，整副手牌公开 + 罚停一整轮。',
  },
  {
    title: '罚停一整轮（失败的惩罚）',
    body: '「碰失败 / 自摸碰失败 / 食胡失败」都罚停一整轮：\n• 失败时押的那几张牌（碰）或整副手牌（食胡）立刻公开；\n• 下一个本应抽出的回合被完整跳过（不抽不出）；\n• 期间所有其他玩家弃牌的判读窗口你都不能参与；\n• 自摸碰失败更重 —— 因为你已经看过刚抽的牌再做错，期间错过的 claim 窗口约 6 个 + 跳 1 次自己回合，要再下下个回合抽出才解锁。\n所有玩家都会在你头像下看到「⛔ 罚停一轮」标识。',
    hint: '罚停期间也不能宣告食胡 —— 别想着低成本试错。',
  },
  {
    title: '查看 2 张牌（每回合 1 次）',
    body: '手牌人格默认不显示维度，必须靠记忆和推理。但你可以在自己回合开始抽完后，启用「🔍 查看 2 张牌」一次性把 2 张手牌的真实维度揭开。本回合内有效，下回合自动重置。\n用得好的玩家会优先看自己最不确定的牌，避免归档时混入错误。',
  },
  {
    title: '知识牌（档案注记）',
    body: '牌堆里有一类无人格归属的「档案注记 / 知识牌」 —— 内容是心理学常识。它们不能用于归档，但也不会"穿帮"成错误维度。\n用途：\n• 抽到就丢，腾出手牌空间；\n• 也是观察对手心理风格的趣味设计（看对手怎么挑这些中性牌可以暴露偏好）。',
  },
  {
    title: '联机 · 退出与轮转',
    body: '联机房 4 人，任何人点「退出对局」即从该桌退出 —— 不接管，剩下的玩家继续打到分胜负。\n• 退出者的座位永久跳过（看到「🚪 已退出对局」徽章）；\n• 仅剩 1 人即自动宣告该玩家胜利；\n• 你的回合超过 30 秒未操作会弹「请注意：现在是你的回合」提醒，每 30 秒重复一次直到你出牌。',
    hint: '同学号同时进入两个活动房间会被拒绝 —— 防止两个客户端共享同一座位。',
  },
  {
    title: '胜负与结算',
    body: '第一个完成全部 5 维度归档的玩家获胜。若牌堆抽完仍无人胜出，则按「已归档维度数 × 权重 − 剩余手牌惩罚」结算名次。',
  },
];

// ─── Interactive Sandbox ─────────────────────────────────────────────────
// 真正可点击的教学场景。固定 12 张牌的剧本，玩家按顺序：
//   1. 点牌堆抽牌
//   2. 点自摸碰 → 选牌
//   3. 故意选错 → 看失败演示 → 重置
//   4. 选对 → 归档成功
//   5. 出 1 张牌结束回合

const PC = (id: number, dim: Dimension, text: string, facet = 'demo'): PersonalityCard => ({
  id, dimension: dim, text, facet,
});
const DC = (id: number, text: string): DummyCard => ({ id, text, isDummy: true });

const SANDBOX_HAND: GameCard[] = [
  PC(101, 'N', '我经常感到焦虑或忧虑'),
  PC(102, 'N', '我容易情绪波动'),
  PC(103, 'N', '我容易感到压力'),
  PC(104, 'C', '我会认真完成我承诺过的事'),
  PC(105, 'E', '我喜欢参加热闹的聚会和活动'),
  PC(106, 'A', '我会主动帮助遇到困难的人'),
  PC(107, 'O', '我对抽象的哲学问题很感兴趣'),
  PC(108, 'C', '我做事情之前总会制定计划'),
  DC(109, '颜色会影响食欲，蓝色会抑制饥饿感'),
];
const SANDBOX_DRAWN: PersonalityCard = PC(110, 'N', '我对批评比较敏感');
const SANDBOX_CLAIM_CARD: PersonalityCard = PC(111, 'A', '我愿意体谅别人的处境');

type Scene =
  | 'start'           // 等抽牌
  | 'viewing'         // 查看 2 张
  | 'after-draw'      // 抽完，等点自摸碰
  | 'pong-picking'    // 选牌中
  | 'pong-failed'     // 演示失败，等点「重置」
  | 'pong-success'    // 归档成功，等出牌
  | 'claim-window'    // 对手弃牌，等碰/食胡
  | 'claim-success'   // 截胡碰成功
  | 'hu-demo'         // 食胡演示
  | 'discard-picking' // 选要弃的牌
  | 'done';           // 完成本回合

interface SandboxState {
  scene: Scene;
  hand: GameCard[];
  drawnCard: GameCard | null;
  selectedIds: number[];
  revealedIds: number[];
  revealedAll: boolean;          // 自摸碰激活后揭开所有牌的维度（便于教学，真实游戏不会）
  declared: boolean;             // 神经质是否已归档
  claimDeclared: boolean;
  penaltyShown: boolean;
  feedback: { tone: 'success' | 'fail' | 'info'; text: string } | null;
  failCount: number;             // 失败次数（用于切换 caption）
}

const initialState: SandboxState = {
  scene: 'start',
  hand: SANDBOX_HAND,
  drawnCard: null,
  selectedIds: [],
  revealedIds: [],
  revealedAll: false,
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
        feedback: { tone: 'success', text: '抽到一张线索牌。现在选择很多，先演示「查看 2 张牌」。' },
      };
    case 'view-two':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        revealedIds: [104, 110],
        feedback: { tone: 'info', text: '本回合查看了 2 张牌：一张尽责性，一张神经质。真实牌局里只会揭开你选的 2 张。' },
      };
    case 'finish-view':
      if (state.scene !== 'viewing') return state;
      return {
        ...state,
        scene: 'after-draw',
        feedback: { tone: 'success', text: '现在你知道刚抽到的牌能补齐一组。下一步演示自摸碰。' },
      };
    case 'open-pong':
      if (state.scene !== 'after-draw') return state;
      return {
        ...state,
        scene: 'pong-picking',
        revealedAll: true, // 教学模式揭开
        selectedIds: [],
        feedback: { tone: 'info', text: '选恰好 4 张同人格描述的牌。教学模式揭开维度，真实游戏不会直接告诉你。' },
      };
    case 'toggle-select':
      if (state.scene !== 'pong-picking') return state;
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
      const allNeuro = selected.every((c) => !c.isDummy && 'dimension' in c && c.dimension === 'N');
      const correctCount = selected.length === 4;
      if (allNeuro && correctCount) {
        // 成功：4 张神经质从手牌移除，drawnCard 也消耗
        const remaining = state.hand.filter((c) => !state.selectedIds.includes(c.id));
        const drawnUsed = state.drawnCard && state.selectedIds.includes(state.drawnCard.id);
        return {
          ...state,
          scene: 'pong-success',
          hand: remaining,
          drawnCard: drawnUsed ? null : state.drawnCard,
          selectedIds: [],
          declared: true,
          feedback: { tone: 'success', text: '归档成功。4 张进入公开归档区，归档后必须立即弃 1 张牌。' },
        };
      }
      // 失败
      const reason = !correctCount
        ? `选了 ${selected.length} 张，必须正好 4 张`
        : '选中的牌里有非神经质（档案注记不算神经质）';
      return {
        ...state,
        scene: 'pong-failed',
        feedback: {
          tone: 'fail',
          text: `自摸碰失败：${reason}。真实游戏会罚停一整轮，并公开你刚刚押错的牌。`,
        },
        failCount: state.failCount + 1,
        penaltyShown: true,
      };
    }
    case 'continue-after-fail':
      if (state.scene !== 'pong-failed') return state;
      return {
        ...state,
        scene: 'pong-picking',
        selectedIds: [],
        feedback: { tone: 'info', text: '试试这次只选神经质（绿色标记的 4 张）。' },
      };
    case 'cancel-pong':
      if (state.scene !== 'pong-picking') return state;
      return {
        ...state,
        scene: 'after-draw',
        selectedIds: [],
        revealedAll: false,
        feedback: null,
      };
    case 'pick-discard': {
      if (state.scene !== 'pong-success' && state.scene !== 'discard-picking') return state;
      // 只允许丢手中的牌
      if (!state.hand.find((c) => c.id === action.id)) return state;
      return {
        ...state,
        scene: 'done',
        hand: state.hand.filter((c) => c.id !== action.id),
        feedback: {
          tone: 'success',
          text: '出牌完成。现在切到别人弃牌时，你如何响应「碰 / 食胡」。',
        },
      };
    }
    case 'open-claim':
      if (state.scene !== 'done') return state;
      return {
        ...state,
        scene: 'claim-window',
        selectedIds: [],
        feedback: { tone: 'info', text: '对手弃出一张线索牌。你可以尝试截胡碰，也可以判断是否已经能食胡。' },
      };
    case 'commit-claim':
      if (state.scene !== 'claim-window') return state;
      return {
        ...state,
        scene: 'claim-success',
        claimDeclared: true,
        feedback: { tone: 'success', text: '截胡碰成功。你用手里的同类牌 + 对手弃牌完成了一组公开归档。' },
      };
    case 'show-hu':
      if (state.scene !== 'claim-window' && state.scene !== 'claim-success') return state;
      return {
        ...state,
        scene: 'hu-demo',
        feedback: { tone: 'success', text: '食胡用于宣布胜利：当 5 个维度全部完成时按下。误按会公开整副手牌并罚停。' },
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

  const captionByScene: Record<Scene, string> = {
    start: '这是你的开局：手牌里有多种人格描述和 1 张档案注记。你需要先抽牌，再决定要查看、归档还是弃牌。',
    viewing: '每回合可以查看 2 张手牌的真实维度。点击「查看 2 张」后，再继续进入归档判断。',
    'after-draw': '你现在拥有足够完成一组的线索。下一步点「自摸碰」试试。',
    'pong-picking':
      state.failCount === 0
        ? '从手牌 + 刚抽到的牌中精确选 4 张同类牌。先故意混入别的牌，看失败惩罚。'
        : '这次只选 4 张神经质描述牌，然后点「自摸归档」。',
    'pong-failed': '失败会公开你押错的牌并罚停一整轮。点「继续」回到选牌模式。',
    'pong-success': '归档完成后还需要弃 1 张牌。选择一张你不想保留的牌结束回合。',
    'claim-window': '现在是别人弃牌后的判读窗口。你可以截胡碰，也可以在已经满足全部目标时食胡。',
    'claim-success': '截胡碰也会形成公开归档。这个记录会出现在玩家头像下和归档记录里。',
    'hu-demo': '食胡是胜利按钮，只在所有目标完成时使用。失败成本很高，所以不要拿它试错。',
    'discard-picking': '点击要弃的牌。',
    done: '你的回合结束。下一步模拟别人弃牌后的「碰 / 食胡」窗口。',
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
            const canClickToSelect = state.scene === 'pong-picking';
            const canClickToDiscard = state.scene === 'pong-success' && !isDrawn;
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
                } ${(canClickToSelect || canClickToDiscard) ? 'cursor-pointer' : ''}`}
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
                    刚抽到
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      key="sandbox"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="psy-panel psy-etched rounded-[1.8rem] p-5 sm:p-7"
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
        {/* 归档区 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--psy-muted)]">公开归档：</span>
          {state.declared ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: N.colorHex,
                backgroundColor: N.colorHex + '20',
                border: `1px solid ${N.colorHex}55`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: N.colorHex }} />
              神经质 4 张
            </span>
          ) : (
            <span className="text-[var(--psy-muted)]">（暂无）</span>
          )}
          {state.claimDeclared && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: DIMENSION_META.A.colorHex,
                backgroundColor: DIMENSION_META.A.colorHex + '20',
                border: `1px solid ${DIMENSION_META.A.colorHex}55`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DIMENSION_META.A.colorHex }} />
              宜人性 3 张
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
              {state.scene === 'start' ? '点击抽牌 ↓' : '牌堆'}
            </span>
            <div className={state.scene === 'start' ? 'ring-2 ring-[var(--psy-accent)] rounded-[1.1rem]' : ''}>
              <Card card={PC(999, 'N', '')} faceUp={false} compact />
            </div>
          </button>
        </div>

        {/* 操作按钮 */}
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
              state.scene === 'viewing' && state.revealedIds.length === 0 ? 'ring-1 ring-[var(--psy-accent)]' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            查看 2 张
          </button>
          <button
            disabled={state.scene !== 'viewing' || state.revealedIds.length === 0}
            onClick={() => dispatch({ type: 'finish-view' })}
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold ${
              state.scene === 'viewing' && state.revealedIds.length > 0 ? 'animate-pulse' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            继续判断
          </button>
          <button
            disabled={state.scene !== 'after-draw'}
            onClick={() => dispatch({ type: 'open-pong' })}
            className={`psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold transition ${
              state.scene === 'after-draw'
                ? 'animate-pulse ring-2 ring-[var(--psy-accent)]'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            自摸碰
          </button>
        </div>

        {/* 选牌模式的 commit/cancel */}
        {state.scene === 'pong-picking' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.08)] px-3 py-2 text-xs text-[var(--psy-accent)]"
          >
            <span>
              🎯 自摸碰 · <span style={{ color: N.colorHex }}>神经质</span> · 请精确选择 4 张（已选 {state.selectedIds.length}）
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
                className="psy-btn psy-btn-accent px-3 py-1 text-[10px] font-bold"
              >
                自摸归档
              </button>
            </div>
          </motion.div>
        )}

        {/* 失败后的继续按钮 */}
        {state.scene === 'pong-failed' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'continue-after-fail' })}
              className="psy-btn psy-btn-accent animate-pulse px-4 py-1.5 text-xs font-bold"
            >
              继续 →
            </button>
          </div>
        )}

        {state.penaltyShown && state.scene === 'pong-failed' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-300">
            罚停演示：本轮不能参与别人弃牌的判读窗口，下个自己回合也会被跳过。
          </div>
        )}

        {state.scene === 'claim-window' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 rounded-xl border border-[rgba(200,155,93,0.28)] bg-[rgba(200,155,93,0.06)] p-3 text-xs text-[var(--psy-ink-soft)] sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="flex justify-center">
              <Card card={SANDBOX_CLAIM_CARD} compact revealedDimension="A" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="psy-serif text-sm text-[var(--psy-ink)]">小明弃出了一张线索牌</div>
              <div className="mt-1 leading-6">你判断它和手里的宜人性牌可以凑成一组。真实游戏里需要自己读描述，不会直接显示维度。</div>
            </div>
            <button
              onClick={() => dispatch({ type: 'commit-claim' })}
              className="psy-btn psy-btn-accent self-center px-4 py-2 text-xs font-bold"
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
              继续看食胡
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm leading-7 text-red-200">
            食胡只在 5 个维度都完成时按。判定不成立会公开整副手牌并罚停，所以它是确认胜利，不是试探按钮。
          </div>
        )}

        {/* 手牌 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--psy-muted)]">
              {state.scene === 'pong-success' ? '出 1 张牌结束回合 ↓' : '你的手牌'}
            </span>
            <span className="text-[10px] text-[var(--psy-muted)]">
              {state.hand.length + (state.drawnCard ? 1 : 0)} 张
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
              模拟别人弃牌
            </button>
          </div>
        )}

        {state.scene === 'hu-demo' && (
          <div className="flex justify-center">
            <button
              onClick={() => dispatch({ type: 'reset' })}
              className="psy-btn psy-btn-ghost px-4 py-1.5 text-xs"
            >
              再来一遍
            </button>
          </div>
        )}
      </div>

      {/* 旁注 */}
      <motion.p
        key={state.scene + '-' + state.failCount}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-4 rounded-xl border border-[rgba(200,155,93,0.22)] bg-[rgba(200,155,93,0.06)] px-4 py-3 text-sm leading-7 text-[var(--psy-ink-soft)]"
      >
        {captionByScene[state.scene]}
      </motion.p>

      {/* 反馈 banner */}
      <AnimatePresence>
        {state.feedback && (
          <motion.div
            key={state.feedback.text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`mt-3 rounded-xl border px-4 py-2 text-xs leading-6 ${
              state.feedback.tone === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : state.feedback.tone === 'fail'
                ? 'border-red-400/40 bg-red-500/10 text-red-300'
                : 'border-amber-400/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            {state.feedback.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
          <p className="psy-eyebrow text-[10px]">开始游戏流程</p>
          <h2 className="psy-serif mt-2 text-2xl text-[var(--psy-ink)]">从首页到开局</h2>
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
            联机对战
          </button>
          <button
            onClick={() => switchMode('solo')}
            className={`rounded-full px-4 py-2 text-sm transition ${
              mode === 'solo'
                ? 'bg-[rgba(200,155,93,0.24)] text-[var(--psy-ink)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            单机对战
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        <div className="space-y-2">
          {steps.map((step, i) => (
            <button
              key={step.title}
              onClick={() => setIndex(i)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition ${
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
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="psy-serif text-xs uppercase tracking-[0.42em] text-[var(--psy-ink-soft)]">
              Tutorial
            </p>
            <h1 className="psy-serif text-4xl text-[var(--psy-ink)] sm:text-5xl">
              人格麻将 · 教学
            </h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm"
          >
            返回首页
          </button>
        </div>

        {mode === 'list' && (
          <>
            {/* 主 CTA */}
            <div className="psy-panel psy-etched rounded-[1.6rem] p-6 text-center sm:p-7">
              <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">
                先看流程，再进沙盒打一回合
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--psy-ink-soft)]">
                教学覆盖：联机 / 单机开局、答题检查、房间流程、查看手牌、碰、食胡、失败惩罚。
              </p>
              <button
                onClick={() => setMode('sandbox')}
                className="psy-btn psy-btn-accent psy-serif mt-4 px-7 py-3 text-base font-semibold"
              >
                ▶ 进入交互沙盒
              </button>
            </div>

            <StartFlowGuide />

            {/* 概念卡片 */}
            <div>
              <p className="psy-eyebrow mb-3 text-[10px]">规则要点</p>
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
                直接开始测评
              </button>
              <button
                onClick={() => router.push('/')}
                className="psy-btn psy-btn-ghost px-6 py-3 text-sm"
              >
                返回首页
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
