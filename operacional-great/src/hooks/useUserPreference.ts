import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export function useUserPreference<T extends Json>(preferenceKey: string, defaultValue: T) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['user-preference', user?.id, preferenceKey];

  const { data = defaultValue, isLoading } = useQuery({
    queryKey,
    enabled: !!user,
    initialData: defaultValue,
    queryFn: async () => {
      const { data: preference, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', user!.id)
        .eq('preference_key', preferenceKey)
        .maybeSingle();

      if (error) throw error;

      return (preference?.preference_value as T | null) ?? defaultValue;
    },
  });

  const setMutation = useMutation({
    mutationFn: async (value: T) => {
      if (!user) return;

      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          preference_key: preferenceKey,
          preference_value: value,
        },
        { onConflict: 'user_id,preference_key' },
      );

      if (error) throw error;
    },
    onSuccess: (_, value) => {
      queryClient.setQueryData(queryKey, value);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('preference_key', preferenceKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, defaultValue);
    },
  });

  return {
    value: data,
    isLoading,
    isSaving: setMutation.isPending || removeMutation.isPending,
    setValue: setMutation.mutateAsync,
    removeValue: removeMutation.mutateAsync,
  };
}
