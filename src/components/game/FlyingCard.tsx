'use client';

import { motion } from 'framer-motion';

interface FlyingCardProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  text: string;
  onComplete: () => void;
}

export function FlyingCard({ from, to, text, onComplete }: FlyingCardProps) {
  // Arc up from source, then land on destination. More visible than a
  // straight linear fade.
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 80;

  return (
    <motion.div
      className="psy-panel psy-etched fixed z-[80] flex h-36 w-24 items-center justify-center rounded-[1.2rem] p-2 pointer-events-none"
      style={{ borderColor: 'var(--psy-border-strong)', boxShadow: '0 20px 40px rgba(200,155,93,0.32)' }}
      initial={{
        left: from.x - 48,
        top: from.y - 72,
        scale: 1.1,
        opacity: 1,
        rotate: 0,
      }}
      animate={{
        left: [from.x - 48, midX - 48, to.x - 48],
        top: [from.y - 72, midY - 72, to.y - 72],
        scale: [1.1, 1, 0.85],
        opacity: [1, 1, 0.9],
        rotate: [0, 12, 0],
      }}
      transition={{
        duration: 0.65,
        times: [0, 0.5, 1],
        ease: 'easeInOut',
      }}
      onAnimationComplete={onComplete}
    >
      <p className="psy-serif text-center text-[10px] leading-tight text-[var(--psy-ink)]">{text}</p>
    </motion.div>
  );
}
