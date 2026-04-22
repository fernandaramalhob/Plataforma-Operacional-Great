import { motion } from 'framer-motion';
import { Trophy, Medal } from 'lucide-react';
import { ChampionshipTeam } from '@/hooks/useChampionshipData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import confetti from 'canvas-confetti';

interface ChampionshipPodiumProps {
  teams: ChampionshipTeam[];
}

export function ChampionshipPodium({ teams }: ChampionshipPodiumProps) {
  const sortedTeams = [...teams].sort((a, b) => (a.current_rank || 99) - (b.current_rank || 99));
  const top3 = sortedTeams.slice(0, 3);
  
  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  
  if (podiumOrder.length < 2) {
    return null; // Need at least 2 teams for podium
  }

  const triggerChampionConfetti = () => {
    // Center explosion
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FFEC8B', '#F0E68C', '#DAA520'],
      disableForReducedMotion: true,
    });

    // Left side
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.3, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#2563EB', '#DC2626'],
      });
    }, 150);

    // Right side
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.7, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FFEC8B', '#2563EB', '#DC2626'],
      });
    }, 300);

    // Star burst from top
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 270,
        spread: 100,
        origin: { x: 0.5, y: 0 },
        colors: ['#FFD700', '#FFFFFF', '#FFA500'],
        gravity: 0.8,
      });
    }, 450);
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-32';
      case 2: return 'h-24';
      case 3: return 'h-16';
      default: return 'h-16';
    }
  };

  const getPodiumDelay = (rank: number) => {
    switch (rank) {
      case 1: return 0.4;
      case 2: return 0.2;
      case 3: return 0.6;
      default: return 0.6;
    }
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-gray-400';
    }
  };

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-b from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-b from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-b from-amber-500 to-amber-700';
      default: return 'bg-gray-400';
    }
  };

  const getPodiumBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-t from-yellow-600 via-yellow-500 to-yellow-400';
      case 2: return 'bg-gradient-to-t from-gray-500 via-gray-400 to-gray-300';
      case 3: return 'bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <TooltipProvider>
      <div className="mb-8">
        <div className="flex items-end justify-center gap-2 sm:gap-4 py-8">
          {podiumOrder.map((team, index) => {
            if (!team) return null;
            const rank = team.current_rank || (index === 1 ? 1 : index === 0 ? 2 : 3);
            
            const podiumContent = (
              <motion.div
                key={team.team_id}
                className={`flex flex-col items-center ${rank === 1 ? 'cursor-pointer' : ''}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: getPodiumDelay(rank),
                  ease: "easeOut"
                }}
                onClick={rank === 1 ? triggerChampionConfetti : undefined}
                whileHover={rank === 1 ? { scale: 1.05 } : {}}
                whileTap={rank === 1 ? { scale: 0.98 } : {}}
              >
                {/* Team Badge & Info */}
                <motion.div 
                  className="flex flex-col items-center mb-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: getPodiumDelay(rank) + 0.3,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  {/* Medal */}
                  <motion.div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${getMedalBg(rank)} flex items-center justify-center shadow-lg mb-2`}
                    animate={rank === 1 ? {
                      boxShadow: [
                        '0 0 10px rgba(234, 179, 8, 0.4)',
                        '0 0 25px rgba(234, 179, 8, 0.7)',
                        '0 0 10px rgba(234, 179, 8, 0.4)'
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {rank === 1 ? (
                      <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    ) : (
                      <Medal className={`h-5 w-5 sm:h-6 sm:w-6 text-white`} />
                    )}
                  </motion.div>

                  {/* Team Badge */}
                  <div 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-background shadow-xl flex items-center justify-center text-white font-bold text-sm sm:text-base"
                    style={{ backgroundColor: team.badge_color }}
                  >
                    {team.label.substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Team Name */}
                  <p className="text-xs sm:text-sm font-semibold text-foreground mt-2 text-center max-w-[80px] sm:max-w-[100px] truncate">
                    {team.label}
                  </p>
                  
                  {/* Points */}
                  <motion.p 
                    className="text-lg sm:text-xl font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: getPodiumDelay(rank) + 0.5 }}
                  >
                    {team.total_points}
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </motion.p>
                </motion.div>

                {/* Podium Block */}
                <motion.div
                  className={`w-20 sm:w-28 ${getPodiumHeight(rank)} ${getPodiumBg(rank)} rounded-t-lg flex items-start justify-center pt-3 shadow-lg`}
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  transition={{ 
                    duration: 0.5, 
                    delay: getPodiumDelay(rank),
                    ease: "easeOut"
                  }}
                >
                  <span className="text-2xl sm:text-3xl font-black text-white/90">
                    {rank}º
                  </span>
                </motion.div>
              </motion.div>
            );

            // Wrap champion (rank 1) with tooltip
            if (rank === 1) {
              return (
                <Tooltip key={team.team_id}>
                  <TooltipTrigger asChild>
                    {podiumContent}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-yellow-500 text-white border-yellow-600">
                    <p className="font-medium">🎉 Clique para celebrar!</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return podiumContent;
          })}
        </div>
        
        {/* Base */}
        <motion.div 
          className="h-2 bg-gradient-to-r from-transparent via-muted to-transparent mx-auto max-w-md rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        />
      </div>
    </TooltipProvider>
  );
}
