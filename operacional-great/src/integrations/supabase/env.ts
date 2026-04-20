const env = import.meta.env;

const FALLBACK_SUPABASE_URL = 'https://jcvmilqtmjyjynczwmlu.supabase.co';
const FALLBACK_SUPABASE_KEY = 'mock_key';

export const SUPABASE_URL =
  env.VITE_SUPABASE_URL?.trim() ||
  FALLBACK_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  env.VITE_SUPABASE_ANON_KEY?.trim() ||
  FALLBACK_SUPABASE_KEY;

export const isMockSupabase =
  !SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY === FALLBACK_SUPABASE_KEY;

export const hasSupabaseConfig =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);
