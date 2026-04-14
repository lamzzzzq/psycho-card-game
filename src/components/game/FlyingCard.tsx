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
      className="fixed z-[80] w-24 h-36 rounded-xl border-2 border-amber-400/60 bg-gray-900/95 flex items-center justify-center p-2 shadow-[0_20px_40px_rgba(251,191,36,0.35)] pointer-events-none"
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
      <p className="text-[10px] leading-tight text-gray-200 text-center font-medium">{text}</p>
    </motion.div>
  );
}
