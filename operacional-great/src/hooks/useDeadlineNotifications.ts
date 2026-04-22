import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreference } from '@/hooks/useUserPreference';

interface MyDayItemWithDeadline {
  id: string;
  title: string;
  deadline_time: string | null;
  deadline_notified: boolean;
  status: string;
}

interface ActiveAlarm {
  itemId: string;
  title: string;
  deadline: string;
}

const DEFAULT_ALARM_SOUND = '/sounds/alarm-iphone.mp3';
const CHECK_INTERVAL_MS = 60000;
const ALERT_BEFORE_MINUTES = 60;
const ALARM_REPEAT_INTERVAL_MS = 3000;

export function useDeadlineNotifications() {
  const { user } = useAuth();
  const {
    value: alarmSoundUrl,
    setValue: setAlarmSoundUrl,
    removeValue: clearAlarmSoundUrl,
  } = useUserPreference<string>('deadline_alarm_sound', DEFAULT_ALARM_SOUND);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const getAlarmSoundUrl = useCallback(() => {
    return alarmSoundUrl || DEFAULT_ALARM_SOUND;
  }, [alarmSoundUrl]);

  const setCustomAlarmSound = useCallback(async (url: string) => {
    await setAlarmSoundUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
    }
  }, [setAlarmSoundUrl]);

  const clearCustomAlarmSound = useCallback(async () => {
    await clearAlarmSoundUrl();
    if (audioRef.current) {
      audioRef.current.src = DEFAULT_ALARM_SOUND;
    }
  }, [clearAlarmSoundUrl]);

  const playAlarmOnce = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(getAlarmSoundUrl());
      audioRef.current.volume = 0.8;
    }
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(console.error);
  }, [getAlarmSoundUrl]);

  const startRepeatingAlarm = useCallback(() => {
    if (isAlarmPlaying) return;

    setIsAlarmPlaying(true);
    playAlarmOnce();

    alarmIntervalRef.current = setInterval(() => {
      playAlarmOnce();
    }, ALARM_REPEAT_INTERVAL_MS);
  }, [isAlarmPlaying, playAlarmOnce]);

  const stopAlarm = useCallback(async (itemId?: string) => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsAlarmPlaying(false);

    if (itemId) {
      setActiveAlarms(prev => prev.filter(a => a.itemId !== itemId));

      await supabase
        .from('my_day_items')
        .update({ deadline_notified: true })
        .eq('id', itemId);
    } else {
      const alarmIds = activeAlarms.map(a => a.itemId);
      setActiveAlarms([]);

      for (const id of alarmIds) {
        await supabase
          .from('my_day_items')
          .update({ deadline_notified: true })
          .eq('id', id);
      }
    }
  }, [activeAlarms]);

  const checkDeadlines = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    try {
      const { data: items, error } = await supabase
        .from('my_day_items')
        .select('id, title, deadline_time, deadline_notified, status')
        .eq('user_id', user.id)
        .eq('date', today)
        .not('deadline_time', 'is', null)
        .neq('status', 'CONCLUIDO')
        .eq('deadline_notified', false);

      if (error) throw error;

      const newAlarms: ActiveAlarm[] = [];

      for (const item of (items || []) as MyDayItemWithDeadline[]) {
        if (!item.deadline_time) continue;

        const [hours, minutes] = item.deadline_time.split(':').map(Number);
        const deadlineInMinutes = hours * 60 + minutes;
        const minutesUntilDeadline = deadlineInMinutes - currentTimeInMinutes;

        if (minutesUntilDeadline > 0 && minutesUntilDeadline <= ALERT_BEFORE_MINUTES) {
          const alreadyActive = activeAlarms.some(a => a.itemId === item.id);
          if (!alreadyActive) {
            newAlarms.push({
              itemId: item.id,
              title: item.title,
              deadline: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            });
          }
        }
      }

      if (newAlarms.length > 0) {
        setActiveAlarms(prev => [...prev, ...newAlarms]);
        startRepeatingAlarm();
      }
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }, [user, activeAlarms, startRepeatingAlarm]);

  useEffect(() => {
    if (!user) return;

    checkDeadlines();
    intervalRef.current = setInterval(checkDeadlines, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [user, checkDeadlines]);

  return {
    activeAlarms,
    isAlarmPlaying,
    stopAlarm,
    checkDeadlines,
    setCustomAlarmSound,
    clearCustomAlarmSound,
    getAlarmSoundUrl,
  };
}
