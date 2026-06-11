import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const debugEnabled = import.meta.env.VITE_SUPABASE_DEBUG === 'true';

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://');

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.error(
    '[SellerSync] Missing Supabase config. Copy .env.local.example to .env, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server.'
  );
}

const authDebug = (...args) => {
  if (debugEnabled) {
    console.debug('[AUTH DEBUG]', ...args);
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'sellersync-auth',
        flowType: 'pkce',
      },
    })
  : null;

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    authDebug('getCurrentUser error', error.message);
    throw error;
  }
  authDebug('getCurrentUser', user?.id ? `user=${user.id}` : 'no user');
  return user ?? null;
}

export function getAuthRedirectUrl(path = '/dashboard') {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
