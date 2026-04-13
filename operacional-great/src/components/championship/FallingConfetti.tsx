import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  shape: 'circle' | 'square' | 'rectangle';
}

const CONFETTI_COLORS = [
  'bg-blue-500/30',
  'bg-red-500/30',
  'bg-green-500/30',
  'bg-yellow-500/40',
  'bg-purple-500/30',
  'bg-orange-500/30',
  'bg-pink-500/30',
  'bg-cyan-500/30',
];

const SHAPES = ['circle', 'square', 'rectangle'] as const;

export function FallingConfetti({ count = 40 }: { count?: number }) {
  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage across screen
      delay: Math.random() * 6, // faster stagger start times
      duration: 4 + Math.random() * 5, // 4-9 seconds to fall (faster)
      size: 5 + Math.random() * 10, // 5-15px (slightly bigger)
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    }));
  }, [count]);

  const getShapeClasses = (piece: ConfettiPiece) => {
    const base = `${piece.color} pointer-events-none`;
    switch (piece.shape) {
      case 'circle':
        return `${base} rounded-full`;
      case 'square':
        return `${base} rounded-sm`;
      case 'rectangle':
        return `${base} rounded-sm`;
      default:
        return base;
    }
  };

  const getSize = (piece: ConfettiPiece) => {
    if (piece.shape === 'rectangle') {
      return { width: piece.size * 1.5, height: piece.size * 0.6 };
    }
    return { width: piece.size, height: piece.size };
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiPieces.map((piece) => {
        const size = getSize(piece);
        return (
          <motion.div
            key={piece.id}
            className={getShapeClasses(piece)}
            style={{
              position: 'absolute',
              left: `${piece.x}%`,
              width: size.width,
              height: size.height,
            }}
            initial={{
              y: -20,
              rotate: piece.rotation,
              opacity: 0,
            }}
            animate={{
              y: ['0vh', '110vh'],
              rotate: [piece.rotation, piece.rotation + 360],
              opacity: [0, 0.6, 0.6, 0],
              x: [0, Math.sin(piece.id) * 30, 0, Math.cos(piece.id) * 20, 0],
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              repeat: Infinity,
              ease: 'linear',
              times: [0, 0.1, 0.9, 1],
            }}
          />
        );
      })}
    </div>
  );
}
