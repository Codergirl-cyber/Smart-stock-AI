import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const debugEnabled = import.meta.env.VITE_SUPABASE_DEBUG === 'true';

const missingVars = [];
if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://');

if (!isSupabaseConfigured && import.meta.env.DEV) {
  if (missingVars.length) {
    console.error(
      `[SellerSync] Supabase not configured. Missing env: ${missingVars.join(', ')}. Copy .env.local.example to .env.local and set these variables (do not commit). Restart the dev server.`
    );
  } else if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.error(
      "[SellerSync] Supabase URL looks invalid or placeholder. Ensure VITE_SUPABASE_URL is set to your project's URL (https://<project>.supabase.co)."
    );
  } else {
    console.error('[SellerSync] Supabase configuration invalid. Check environment variables.');
  }
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
