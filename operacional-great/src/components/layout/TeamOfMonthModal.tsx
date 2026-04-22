import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useUserPreference } from '@/hooks/useUserPreference';

interface TeamStat {
  teamName: string;
  count: number;
}

function isEndOfMonth(): boolean {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 4; // Ãºltimos 5 dias do mÃªs
}

function getStorageKey(): string {
  const d = new Date();
  return `team_of_month_seen_${d.getFullYear()}_${d.getMonth()}`;
}

export function TeamOfMonthModal() {
  const { user, isAdmin } = useAuth();
  const [visible, setVisible] = useState(false);
  const [best, setBest] = useState<TeamStat | null>(null);
  const storageKey = getStorageKey();
  const { value: hasSeenThisMonth, setValue: setHasSeenThisMonth } = useUserPreference<boolean>(
    storageKey,
    false,
  );

  useEffect(() => {
    if (!user || isAdmin) return;
    if (!isEndOfMonth()) return;
    if (hasSeenThisMonth) return;

    async function load() {
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name');

      if (!teams || teams.length === 0) return;

      const { data: clients } = await supabase
        .from('operational_clients')
        .select('team_id')
        .eq('status_operacional', 'ATIVO');

      if (!clients || clients.length === 0) return;

      const counts: Record<string, number> = {};
      clients.forEach((c: any) => {
        if (c.team_id) counts[c.team_id] = (counts[c.team_id] || 0) + 1;
      });

      let bestId = '';
      let bestCount = 0;
      Object.entries(counts).forEach(([id, count]) => {
        if (count > bestCount) { bestCount = count; bestId = id; }
      });

      if (!bestId || bestCount === 0) return;

      const team = teams.find((t: any) => t.id === bestId);
      if (!team) return;

      setBest({ teamName: team.name, count: bestCount });
      setVisible(true);
    }

    load();
  }, [hasSeenThisMonth, isAdmin, user]);

  useEffect(() => {
    if (!visible) return;

    const fire = () => {
      confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#E10600', '#fff', '#ff9999'] });
      confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#E10600', '#fff', '#ff9999'] });
    };

    fire();
    const t1 = setTimeout(fire, 800);
    const t2 = setTimeout(fire, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  async function handleClose() {
    await setHasSeenThisMonth(true);
    setVisible(false);
  }

  if (!best) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="relative bg-card border border-border rounded-3xl shadow-2xl px-12 py-14 flex flex-col items-center text-center max-w-xl w-full mx-4"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="h-20 w-20 rounded-2xl bg-warning/10 flex items-center justify-center mb-6"
            >
              <Trophy className="h-10 w-10 text-warning" />
            </motion.div>

            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-2">
              Melhor equipe do mÃªs
            </p>

            <motion.h1
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-5xl font-extrabold text-foreground leading-tight mb-4"
            >
              {best.teamName}
            </motion.h1>

            <p className="text-xl text-muted-foreground mb-8">
              ParabÃ©ns{' '}
              <span className="font-bold text-foreground">{best.teamName}</span>
              {' '}pelas{' '}
              <span className="font-bold text-primary">{best.count}</span>
              {' '}conquistas este mÃªs! ðŸŽ‰
            </p>

            <Button onClick={handleClose} size="lg" className="px-10 rounded-full text-base">
              Fechar
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
