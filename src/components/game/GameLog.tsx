'use client';

import { GameAction, Player, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface GameLogProps {
  actions: GameAction[];
  players: Player[];
}

export function GameLog({ actions, players }: GameLogProps) {
  const recentActions = actions.slice(-8).reverse();
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
      <span className="text-sm font-medium text-gray-300">行动记录</span>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {recentActions.length === 0 ? (
          <p className="text-xs text-gray-700">暂无记录</p>
        ) : (
          recentActions.map((action, i) => {
            const player = getPlayer(action.playerId);
            if (!player) return null;
            return (
              <div key={`${action.timestamp}-${action.type}-${i}`} className="text-xs text-gray-500 flex gap-1">
                <span className="text-gray-400">{player.avatar}</span>
                {action.type === 'draw' && <span>抽了一张牌</span>}
                {action.type === 'discard' && (
                  <span>
                    弃了{' '}
                    {action.card && isPersonalityCard(action.card) ? (
                      <span style={{ color: DIMENSION_META[action.card.dimension].colorHex }}>
                        [{DIMENSION_META[action.card.dimension].name}]
                      </span>
                    ) : (
                      '一张牌'
                    )}
                  </span>
                )}
                {action.type === 'hu-success' && (
                  <span className="text-emerald-400 font-bold">胡了！🀄 游戏结束</span>
                )}
                {action.type === 'hu-fail' && (
                  <span className="text-red-400">胡失败！手牌公开，跳过下轮</span>
                )}
                {action.type === 'pong-success' && action.dimension && (
                  <span style={{ color: DIMENSION_META[action.dimension].colorHex }}>
                    碰！{DIMENSION_META[action.dimension].name} ({action.cardCount}张)
                  </span>
                )}
                {action.type === 'pong-fail' && action.dimension && (
                  <span className="text-red-400">
                    碰失败！{DIMENSION_META[action.dimension].name} 手牌公开
                  </span>
                )}
                {action.type === 'skip' && (
                  <span className="text-gray-600">跳过本轮</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
