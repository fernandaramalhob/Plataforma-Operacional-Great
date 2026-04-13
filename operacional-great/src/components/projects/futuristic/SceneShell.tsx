import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SceneShellProps {
  children: ReactNode;
}

export function SceneShell({ children }: SceneShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden projects-scene-bg">
      {/* Noise texture overlay */}
      <div className="projects-noise" />
      
      {/* Animated gradient orbs - Red theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(225, 6, 0, 0.12) 0%, transparent 65%)',
            top: '-8%',
            left: '-3%',
          }}
          animate={{
            x: [0, 25, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(225, 6, 0, 0.08) 0%, transparent 60%)',
            top: '15%',
            right: '-5%',
          }}
          animate={{
            x: [0, -20, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.06) 0%, transparent 55%)',
            bottom: '15%',
            left: '25%',
          }}
          animate={{
            x: [0, 15, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
