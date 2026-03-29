'use client';

import { GameAction, Player } from '@/types';
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
              <div key={`${action.timestamp}-${action.type}`} className="text-xs text-gray-500 flex gap-1">
                <span className="text-gray-400">{player.avatar}</span>
                {action.type === 'draw' ? (
                  <span>抽了一张牌</span>
                ) : (
                  <span>
                    弃了{' '}
                    {action.card ? (
                      <span style={{ color: DIMENSION_META[action.card.dimension].colorHex }}>
                        [{DIMENSION_META[action.card.dimension].name}]
                      </span>
                    ) : (
                      '一张牌'
                    )}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
