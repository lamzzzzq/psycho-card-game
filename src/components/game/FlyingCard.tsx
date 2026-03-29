'use client';

import { motion } from 'framer-motion';

interface FlyingCardProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  text: string;
  onComplete: () => void;
}

export function FlyingCard({ from, to, text, onComplete }: FlyingCardProps) {
  return (
    <motion.div
      className="fixed z-50 w-24 h-36 rounded-xl border-2 border-gray-600 bg-gray-900 flex items-center justify-center p-2 shadow-2xl pointer-events-none"
      initial={{
        left: from.x - 48,
        top: from.y - 72,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        left: to.x - 48,
        top: to.y - 72,
        scale: 0.8,
        opacity: 0.6,
      }}
      transition={{
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onAnimationComplete={onComplete}
    >
      <p className="text-[9px] leading-tight text-gray-400 text-center">{text}</p>
    </motion.div>
  );
}
