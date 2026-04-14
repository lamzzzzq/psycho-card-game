'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { usePvpStore } from '@/stores/usePvpStore';
import { upsertPlayer, createRoom, joinRoom } from '@/lib/room-api';
import { PlayerInfo } from '@/types/pvp';
import { BigFiveScores, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';


type Tab = 'create' | 'join';

export default function PvpLobbyPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { player, setPlayer } = usePlayerStore();
  const { bigFiveScores, setManualScores } = useAssessmentStore();

  const [tab, setTab] = useState<Tab>('create');
  const [studentId, setStudentId] = useState(player?.studentId ?? '');
  const [studentIdConfirm, setStudentIdConfirm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [totalRounds, setTotalRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScoresInput, setManualScoresInput] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });

  // Arriving at the lobby means "starting fresh". Drop any persisted PVP
  // state from a previous session so we don't bounce back into a stale
  // game via the room-page subscribe effect.
  useEffect(() => {
    usePvpStore.getState().reset();
  }, []);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  async function ensurePlayer() {
    const sid = studentId.trim();
    const info: PlayerInfo = {
      id: sid,
      studentId: sid,
      bigFive: bigFiveScores,
    };
    await upsertPlayer(info);
    setPlayer(info);
    return info;
  }

  async function handleCreate() {
    if (!studentId.trim()) { setError('请输入学号'); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError('两次输入的学号不一致'); return; }
    setLoading(true);
    setError('');
    try {
      const info = await ensurePlayer();
      const room = await createRoom(info.id, { maxPlayers, totalRounds });
      router.push(`/pvp/room/${room.code}`);
    } catch (e: any) {
      setError(e.message ?? '创建失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!studentId.trim()) { setError('请输入学号'); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError('两次输入的学号不一致'); return; }
    if (joinCode.length !== 4) { setError('请输入 4 位房间码'); return; }
    setLoading(true);
    setError('');
    try {
      const info = await ensurePlayer();
      await joinRoom(joinCode, info.id);
      router.push(`/pvp/room/${joinCode}`);
    } catch (e: any) {
      setError(e.message ?? '加入失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-1 relative">
          <button
            onClick={() => router.push('/')}
            className="absolute left-0 top-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← 首页
          </button>
          <h1 className="text-3xl font-bold text-white">⚔️ 联机对战</h1>
          <p className="text-gray-400 text-sm">创建或加入房间，与真实玩家博弈</p>
        </div>

        {/* Player info */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">玩家信息</h2>
          <input
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            placeholder="请输入学号"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            maxLength={20}
          />
          <input
            className={`w-full rounded-lg bg-gray-800 border px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 ${
              studentIdConfirm && studentIdConfirm !== studentId ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="再次输入学号确认"
            value={studentIdConfirm}
            onChange={e => setStudentIdConfirm(e.target.value)}
            maxLength={20}
          />
          {studentIdConfirm && studentIdConfirm !== studentId && (
            <p className="text-xs text-red-400">两次输入的学号不一致</p>
          )}
          {bigFiveScores ? (
            <p className="text-xs text-green-400">✅ 已完成人格测评</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-yellow-400">⚠️ 未完成测评，将使用随机人格数据参与游戏</p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/assessment')}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                >
                  🧠 完整测评 (60题)
                </button>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
                >
                  ✏️ 手动输入分数
                </button>
              </div>
              {showManualInput && (
                <div className="space-y-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4 mt-2">
                  <h3 className="text-xs font-medium text-gray-300">Big Five 分数 (1.0 - 5.0)</h3>
                  <div className="space-y-2">
                    {DIMENSIONS.map((d) => {
                      const meta = DIMENSION_META[d];
                      return (
                        <div key={d} className="flex items-center gap-2">
                          <span className="text-xs w-14" style={{ color: meta.colorHex }}>{meta.name}</span>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={rawInputs[d]}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setRawInputs(prev => ({ ...prev, [d]: raw }));
                              const val = parseFloat(raw);
                              if (!isNaN(val)) setManualScoresInput(prev => ({ ...prev, [d]: val }));
                            }}
                            onBlur={() => {
                              const val = parseFloat(rawInputs[d]);
                              const clamped = isNaN(val) ? 3 : Math.min(5, Math.max(1, val));
                              setManualScoresInput(prev => ({ ...prev, [d]: clamped }));
                              setRawInputs(prev => ({ ...prev, [d]: String(clamped) }));
                            }}
                            className="w-16 rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 text-center"
                          />
                          <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${((manualScoresInput[d] - 1) / 4) * 100}%`, backgroundColor: meta.colorHex }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setManualScores(manualScoresInput);
                      setShowManualInput(false);
                    }}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
                  >
                    确认分数
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-900 border border-gray-800 p-1">
          {(['create', 'join'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'create' ? '🏠 创建房间' : '🔑 加入房间'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'create' ? (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">最多玩家数</label>
                <div className="flex gap-2">
                  {[3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        maxPlayers === n
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {n} 人
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">游戏轮数（0 = 无限）</label>
                <div className="flex gap-2">
                  {[0, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setTotalRounds(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        totalRounds === n
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {n === 0 ? '∞' : n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {loading ? '创建中…' : '创建房间'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">4 位房间码</label>
              <input
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-3 text-white text-center text-2xl tracking-widest font-bold placeholder-gray-600 focus:outline-none focus:border-purple-500"
                placeholder="0000"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {loading ? '加入中…' : '加入房间'}
            </button>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 text-sm">{error}</p>
        )}
      </motion.div>
    </div>
  );
}
