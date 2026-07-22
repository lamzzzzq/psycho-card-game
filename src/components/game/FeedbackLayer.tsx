'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { GameAction, PlayerId } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { STRINGS, playerLabel, type Locale } from '@/lib/i18n';

type AnimationControls = ReturnType<typeof useAnimationControls>;
type MinimalPlayer = { id: string; name: string; nameEn?: string };

/**
 * "輪到你 / 該行動了" 的提醒振動：屏幕抖一下 + 设备震动（移动端）。
 * 单人 & 多人共用，确保两端体验一致。navigator.vibrate 在桌面/不支持的浏览器
 * 上是 no-op，安全调用。
 */
export function turnNudge(shakeControls: AnimationControls) {
  shakeControls.start({
    x: [0, -9, 9, -7, 7, -4, 4, -2, 2, 0],
    transition: { duration: 0.55, ease: 'easeInOut' },
  });
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([55, 45, 55]);
  }
}

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

    const nameOf = (id: PlayerId) => {
      const p = players.find((pl) => pl.id === id);
      return p ? playerLabel(p, locale) : t.playerWord;
    };
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

    // Only fire when the turn actually changed AND became the viewer's turn.
    // 延迟 ~1.2s 再出「輪到你了」：让「歸檔成功 / 碰牌成功」等结算类 toast 先播完，
    // 避免两个提示同屏叠着（用户反馈：同时弹出很乱、因果不清）。若期间回合又变则取消。
    if (viewerIsCurrent && !prevIsCurrent && prevIdx !== currentPlayerIndex) {
      const id = ++nextIdRef.current;
      const timer = setTimeout(() => setBanner(id), 1200);
      return () => clearTimeout(timer);
    }
  }, [currentPlayerIndex, viewerIsCurrent]);

  useEffect(() => {
    if (banner == null) return;
    const t = setTimeout(() => setBanner(null), 1500);
    return () => clearTimeout(t);
  }, [banner]);

  return banner;
}

export function TurnNoticeToast({
  eyebrow,
  title,
  icon = '⏰',
  tone = 'neutral',
}: {
  eyebrow?: string;
  title: string;
  icon?: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const styles = tone === 'success'
    ? 'border-[rgba(111,143,85,0.55)] bg-[linear-gradient(180deg,#fbfdf8,#e8f1e1)] shadow-[0_18px_42px_rgba(83,111,66,0.2)]'
    : tone === 'danger'
    ? 'border-[rgba(190,83,62,0.5)] bg-[linear-gradient(180deg,#fffaf5,#f8e3d8)] shadow-[0_18px_42px_rgba(150,74,54,0.18)]'
    : 'border-[rgba(154,116,72,0.28)] bg-[linear-gradient(180deg,#fdf8f1,#f8f1e4)] shadow-[0_18px_42px_rgba(96,72,38,0.2)]';
  const accent = tone === 'success' ? 'text-[var(--psy-success)]' : tone === 'danger' ? 'text-[var(--psy-danger)]' : 'text-[var(--psy-accent-strong)]';
  return (
    <div className={`psy-etched rounded-[1.35rem] border px-5 py-3 text-center sm:px-7 sm:py-4 ${styles}`}>
      {eyebrow && (
        <div className={`psy-serif text-[10px] uppercase tracking-[0.28em] ${accent}`}>
          {eyebrow}
        </div>
      )}
      <div className={`${eyebrow ? 'mt-1 ' : ''}flex items-center justify-center gap-2 text-base font-bold sm:text-2xl ${tone === 'success' ? 'text-[var(--psy-success)]' : tone === 'danger' ? 'text-[var(--psy-danger)]' : 'text-[var(--psy-ink)]'}`}>
        <span aria-hidden>{icon}</span>
        <span>{title}</span>
      </div>
    </div>
  );
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
          className="pointer-events-none fixed left-1/2 top-[28%] z-[75] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 text-center"
        >
          <TurnNoticeToast title={t.yourTurnBanner} icon="✦" />
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
      {/* 反馈闪光：用软边径向渐变而非纯白矩形——纯白 fixed 矩形只盖到视口底，
          硬下缘会在牌桌上形成一条横向「两截色」缝（用户反馈）。渐变边缘渐隐无硬边。 */}
      <motion.div
        animate={flashControls}
        initial={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.55), rgba(255,255,255,0) 78%)' }}
      />
      <div className="pointer-events-none fixed left-1/2 top-20 z-[70] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
        <AnimatePresence>
          {pops.slice(0, 1).map((pop) => (
            <motion.div
              key={pop.id}
              initial={{ opacity: 0, y: 24, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            >
              <TurnNoticeToast
                eyebrow={pop.playerName}
                title={pop.text}
                icon={pop.kind === 'hu' || pop.kind === 'pong' ? '✦' : '×'}
                tone={pop.kind === 'hu' || pop.kind === 'pong' ? 'success' : 'danger'}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
