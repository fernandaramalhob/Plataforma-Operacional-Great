import { motion } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface KpiTile3DProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  color: 'cyan' | 'violet' | 'red' | 'emerald';
  index?: number;
}

export function KpiTile3D({ icon: Icon, label, value, suffix, color, index = 0 }: KpiTile3DProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });

  const colorConfig = {
    cyan: {
      gradient: 'from-cyan-500/20 via-cyan-400/10 to-transparent',
      iconBg: 'from-cyan-500 to-cyan-600',
      text: 'text-cyan-600',
      glow: 'shadow-cyan-500/20',
      border: 'border-cyan-500/20',
    },
    violet: {
      gradient: 'from-violet-500/20 via-violet-400/10 to-transparent',
      iconBg: 'from-violet-500 to-violet-600',
      text: 'text-violet-600',
      glow: 'shadow-violet-500/20',
      border: 'border-violet-500/20',
    },
    red: {
      gradient: 'from-red-500/20 via-red-400/10 to-transparent',
      iconBg: 'from-red-500 to-red-600',
      text: 'text-red-600',
      glow: 'shadow-red-500/20',
      border: 'border-red-500/20',
    },
    emerald: {
      gradient: 'from-emerald-500/20 via-emerald-400/10 to-transparent',
      iconBg: 'from-emerald-500 to-emerald-600',
      text: 'text-emerald-600',
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/20',
    },
  };

  const config = colorConfig[color];

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!tileRef.current) return;
    const rect = tileRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    const mouseX = (x / rect.width) * 100;
    const mouseY = (y / rect.height) * 100;
    setTilt({ rotateX, rotateY, mouseX, mouseY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, mouseX: 50, mouseY: 50 });
  }, []);

  return (
    <motion.div
      ref={tileRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="perspective-1200"
      style={{ perspective: '1200px' }}
    >
      <motion.div
        className={cn(
          "relative p-6 rounded-2xl glass-surface overflow-hidden",
          "border transition-all duration-200",
          config.border,
          `hover:shadow-xl ${config.glow}`
        )}
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(10px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Gradient background */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          config.gradient
        )} />
        
        {/* Specular highlight */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${tilt.mouseX}% ${tilt.mouseY}%, rgba(255,255,255,0.6), transparent 55%)`,
            mixBlendMode: 'overlay',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-3xl font-bold tabular-nums", config.text)}>
                {value}
              </span>
              {suffix && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}
            </div>
          </div>
          
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg",
            config.iconBg
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Holo border on hover */}
        <div className="absolute inset-0 rounded-2xl holo-border pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}
