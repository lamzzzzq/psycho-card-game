'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { GameAction, PlayerId } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { STRINGS, type Locale } from '@/lib/i18n';

type AnimationControls = ReturnType<typeof useAnimationControls>;
type MinimalPlayer = { id: string; name: string };

// 语义反馈色：固定、且刻意避开 5 个人格维度色（紫O/蓝C/黄E/绿A/红N），
// 否则「碰成功(N)=红」和「失败=红」会混淆。
const FB_SUCCESS = '#2dd4bf'; // teal — 碰成功
const FB_HU = '#d4a056';      // 金 — 胡牌(庆祝，区别于纯黄E)
const FB_FAIL = '#9f1239';    // 深玫红 — 失败(区别于 N 的浅珊瑚红)
const FB_NOTICE = '#c89b5d';  // 金褐 — 轮到你等中性提示(区别于紫O)

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
export function useGameFeedback(actions: GameAction[], players: MinimalPlayer[], locale: Locale = 'zh') {
  const t = STRINGS[locale].game;
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

    const nameOf = (id: PlayerId) => players.find((p) => p.id === id)?.name ?? t.playerWord;
    const dimNameOf = (meta: typeof DIMENSION_META[keyof typeof DIMENSION_META] | null) =>
      meta ? (locale === 'en' ? meta.nameEn : meta.name) : '';

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
          text: `${t.popPong}${dimNameOf(meta)}`,
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
          text: t.popHu,
          playerName: nameOf(latest.playerId),
          kind: 'hu',
        },
      ]);
    } else if (latest.type === 'hu-fail') {
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          text: t.popHuFail,
          playerName: nameOf(latest.playerId),
          kind: 'hu-fail',
        },
      ]);
    } else if (latest.type === 'pong-fail') {
      setPops((p) => [
        ...p,
        {
          id: ++popIdRef.current,
          // 重複碰已歸檔維度 → 明確提示「重複碰」，其餘失敗統一「碰失敗」。
          text: latest.failReason === 'already-declared' ? t.popPongDupe : t.popPongFail,
          playerName: nameOf(latest.playerId),
          kind: 'pong-fail',
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.length, actions, players, shakeControls, flashControls, locale]);

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
 * prominent "輪到你了!" banner. Silent for opponent turns.
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

export function YourTurnBanner({ bannerKey, locale = 'zh' }: { bannerKey: number | null; locale?: Locale }) {
  const t = STRINGS[locale].game;
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
              {t.yourTurnBanner}
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
                // 固定语义色，不再用维度色（避免红色既=情绪稳定维度又=成功/失败）
                backgroundColor:
                  pop.kind === 'hu'
                    ? FB_HU
                    : pop.kind === 'pong'
                    ? FB_SUCCESS
                    : pop.kind === 'your-turn'
                    ? FB_NOTICE
                    : FB_FAIL,
                color:
                  pop.kind === 'hu-fail' || pop.kind === 'pong-fail'
                    ? '#fff'
                    : '#0c1622',
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
