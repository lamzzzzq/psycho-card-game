'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { GameAction, PlayerId } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

type AnimationControls = ReturnType<typeof useAnimationControls>;
type MinimalPlayer = { id: string; name: string };

interface Pop {
  id: number;
  text: string;
  playerName: string;
  kind: 'pong' | 'hu' | 'hu-fail' | 'pong-fail' | 'your-turn';
  colorHex?: string;
}

/**
 * Watches the action log and drives feedback: screen-shake on pong/hu success,
 * white flash on hu, and floating pop labels for all success/fail outcomes.
 * Return the controls and pops so the caller can attach them to their own
 * top-level layout node (keeps us out of the layout system).
 */
export function useGameFeedback(actions: GameAction[], players: MinimalPlayer[]) {
  const shakeControls = useAnimationControls();
  const flashControls = useAnimationControls();
  const [pops, setPops] = useState<Pop[]>([]);
  const prevLenRef = useRef(actions.length);
  const popIdRef = useRef(0);

  useEffect(() => {
    if (actions.length <= prevLenRef.current) {
      prevLenRef.current = actions.length;
      return;
    }
    const latest = actions[actions.length - 1];
    prevLenRef.current = actions.length;
    if (!latest) return;

    const nameOf = (id: PlayerId) => players.find((p) => p.id === id)?.name ?? '玩家';

    if (latest.type === 'pong-success') {
      shakeControls.start({
        x: [0, -4, 4, -3, 3, -2, 2, 0],
        transition: { duration: 0.35, ease: 'easeInOut' },
      });
      const meta = latest.dimension ? DIMENSION_META[latest.dimension] : null;
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          text: `碰！+${meta?.name ?? ''}`,
          playerName: nameOf(latest.playerId),
          kind: 'pong',
          colorHex: meta?.colorHex,
        },
      ]);
    } else if (latest.type === 'hu-success') {
      shakeControls.start({
        x: [0, -12, 12, -10, 10, -6, 6, -3, 3, 0],
        transition: { duration: 0.7, ease: 'easeInOut' },
      });
      flashControls.start({
        opacity: [0, 0.55, 0],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          text: '🏆 食胡！',
          playerName: nameOf(latest.playerId),
          kind: 'hu',
        },
      ]);
    } else if (latest.type === 'hu-fail') {
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          text: '💥 食胡失败',
          playerName: nameOf(latest.playerId),
          kind: 'hu-fail',
        },
      ]);
    } else if (latest.type === 'pong-fail') {
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          text: '💥 碰失败',
          playerName: nameOf(latest.playerId),
          kind: 'pong-fail',
        },
      ]);
    }
  }, [actions.length, actions, players, shakeControls, flashControls]);

  useEffect(() => {
    if (pops.length === 0) return;
    const timeout = setTimeout(() => {
      setPops((p) => p.slice(1));
    }, 1600);
    return () => clearTimeout(timeout);
  }, [pops]);

  return { shakeControls, flashControls, pops };
}

/**
 * Watches currentPlayerIndex. When it flips TO the viewer, flashes a
 * prominent "轮到你了!" banner. Silent for opponent turns.
 */
export function useYourTurnNotifier(
  currentPlayerIndex: number | undefined,
  viewerIsCurrent: boolean
) {
  const [banner, setBanner] = useState<number | null>(null);
  const prevIsCurrentRef = useRef<boolean>(false);
  const prevIdxRef = useRef<number | undefined>(currentPlayerIndex);
  const nextIdRef = useRef(0);

  useEffect(() => {
    const prevIdx = prevIdxRef.current;
    const prevIsCurrent = prevIsCurrentRef.current;
    prevIdxRef.current = currentPlayerIndex;
    prevIsCurrentRef.current = viewerIsCurrent;

    // Only fire when the turn actually changed AND became the viewer's turn
    if (viewerIsCurrent && !prevIsCurrent && prevIdx !== currentPlayerIndex) {
      setBanner(++nextIdRef.current);
    }
  }, [currentPlayerIndex, viewerIsCurrent]);

  useEffect(() => {
    if (banner == null) return;
    const t = setTimeout(() => setBanner(null), 1500);
    return () => clearTimeout(t);
  }, [banner]);

  return banner;
}

export function YourTurnBanner({ bannerKey }: { bannerKey: number | null }) {
  return (
    <AnimatePresence>
      {bannerKey != null && (
        <motion.div
          key={bannerKey}
          initial={{ opacity: 0, scale: 0.4, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 22 }}
          className="pointer-events-none fixed top-1/3 left-1/2 -translate-x-1/2 z-[75] text-center"
        >
          <div
            className="psy-etched rounded-[1.5rem] px-8 py-4"
            style={{
              background: 'linear-gradient(180deg, rgba(23,34,49,0.96), rgba(11,19,29,0.98))',
              border: '1px solid rgba(200,155,93,0.38)',
              boxShadow: '0 0 40px rgba(77, 53, 21, 0.28)',
            }}
          >
            <div className="psy-serif text-[11px] tracking-[0.3em] text-[var(--psy-accent)]">
              Your Turn
            </div>
            <div className="mt-1 psy-serif text-3xl font-black text-[var(--psy-ink)]">
              轮到你了！
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FeedbackOverlays({
  flashControls,
  pops,
}: {
  flashControls: AnimationControls;
  pops: Pop[];
}) {
  return (
    <>
      <motion.div
        animate={flashControls}
        initial={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[60] bg-white"
      />
      <div className="pointer-events-none fixed top-20 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {pops.map((pop) => (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, y: 24, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="rounded-full px-5 py-2 text-sm font-bold shadow-2xl backdrop-blur"
              style={{
                backgroundColor:
                  pop.kind === 'hu'
                    ? 'rgba(251, 191, 36, 0.95)'
                    : pop.kind === 'pong'
                    ? (pop.colorHex ?? '#f97316') + 'ee'
                    : pop.kind === 'your-turn'
                    ? 'rgba(168, 85, 247, 0.95)'
                    : 'rgba(239, 68, 68, 0.9)',
                color:
                  pop.kind === 'hu-fail' || pop.kind === 'pong-fail' || pop.kind === 'your-turn'
                    ? '#fff'
                    : '#111',
              }}
            >
              <span className="mr-1 opacity-70">{pop.playerName}</span>
              {pop.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
