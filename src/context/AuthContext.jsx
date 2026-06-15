/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../supabase';

const debugEnabled = import.meta.env.VITE_SUPABASE_DEBUG === 'true';
const authDebug = (...args) => {
  if (debugEnabled) {
    console.debug('[AUTH DEBUG]', ...args);
  }
};

export const AuthContext = createContext(null);

function formatAuthError(error) {
  const message = error?.message || String(error || 'Authentication failed. Please try again.');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid password') || normalized.includes('invalid email')) {
    return 'Invalid email or password. Check your credentials and try again.';
  }
  if (normalized.includes('already registered') || normalized.includes('already exists') || normalized.includes('duplicate')) {
    return 'This email is already registered. Please log in or reset your password.';
  }
  if (normalized.includes('password should be at least') || normalized.includes('password must be at least') || normalized.includes('weak password')) {
    return 'Password must be at least 6 characters.';
  }
  if (normalized.includes('user not found')) {
    return 'No account found with this email.';
  }
  if (normalized.includes('email not confirmed') || normalized.includes('confirm your email')) {
    return 'Please confirm your email address before signing in.';
  }
  if (normalized.includes('network') || normalized.includes('failed to fetch') || normalized.includes('server')) {
    return 'Network issue. Check your connection and try again.';
  }
  if (normalized.includes('expired') || normalized.includes('token expired') || normalized.includes('invalid token')) {
    return 'Your session expired. Please sign in again.';
  }
  return message;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(!supabase);
  const [error, setError] = useState(null);
  const [sessionValid, setSessionValid] = useState(true);
  const initDone = useRef(false);
  const refreshIntervalRef = useRef(null);

  // Validate session against Supabase servers
  const validateSession = useCallback(async () => {
    if (!supabase || !session) {
      setSessionValid(true);
      return true;
    }

    try {
      const { error: validateError } = await supabase.auth.getUser();
      
      if (validateError) {
        authDebug('session validation failed', validateError.message);
        setSessionValid(false);
        // Force sign out if token is truly invalid
        if (validateError.message?.includes('invalid') || validateError.message?.includes('expired')) {
          setUser(null);
          setSession(null);
          setError('Your session expired. Please sign in again.');
        }
        return false;
      }

      authDebug('session validated successfully');
      setSessionValid(true);
      return true;
    } catch (err) {
      authDebug('session validation error', err.message);
      // Don't treat network errors as session invalid
      return false;
    }
  }, [session]);

  // Setup periodic session validation (every 15 minutes)
  useEffect(() => {
    if (!supabase || !user) return;

    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);

    refreshIntervalRef.current = setInterval(() => {
      validateSession();
    }, 15 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [user, validateSession]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const finishInit = (sessionData) => {
      if (!mounted) return;
      authDebug('auth initialized', sessionData?.user?.id ? `user=${sessionData.user.id}` : 'no session');
      setSession(sessionData ?? null);
      setUser(sessionData?.user ?? null);
      setSessionValid(true);
      if (!initDone.current) {
        initDone.current = true;
        setInitializing(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionData) => {
      if (!mounted) return;
      authDebug('auth state changed', event, sessionData?.user?.id ? `user=${sessionData.user.id}` : 'no user');

      setSession(sessionData ?? null);
      setUser(sessionData?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        authDebug('user signed in');
        setSessionValid(true);
        setError(null);
      }

      if (event === 'SIGNED_OUT') {
        authDebug('user signed out');
        setSessionValid(false);
      }

      if (event === 'TOKEN_REFRESHED') {
        authDebug('token refreshed successfully');
        setSessionValid(true);
        setError(null);
      }

      if (event === 'USER_UPDATED') {
        authDebug('user updated');
        setSessionValid(true);
      }

      if (!initDone.current) {
        initDone.current = true;
        setInitializing(false);
      }

      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        typeof window !== 'undefined' &&
        window.location.hash.includes('access_token')
      ) {
        authDebug('redirect triggered', window.location.pathname + window.location.search);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: sessionData }, error: sessionError }) => {
        if (sessionError) {
          console.error('[Auth] getSession failed:', sessionError.message);
          setSessionValid(false);
        } else if (sessionData) {
          setSessionValid(true);
        }
        finishInit(sessionData);
      })
      .catch((err) => {
        console.error('[Auth] getSession error:', err);
        if (mounted && !initDone.current) {
          initDone.current = true;
          setInitializing(false);
        }
      });

    return () => {
      mounted = false;
      authDebug('auth listener unsubscribed');
      subscription?.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const assertClient = () => {
    if (!supabase) {
      const msg =
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local (do NOT commit), then restart the dev server.';
      setError(msg);
      console.error('[Auth] Supabase not configured:', msg);
      return null;
    }
    return supabase;
  };

  const signUp = async (email, password) => {
    setError(null);
    const client = assertClient();
    if (!client) throw new Error('Supabase client not available. Check environment variables.');

    const { data, error: signUpError } = await client.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      const errorMessage = formatAuthError(signUpError);
      setError(errorMessage);
      setSessionValid(false);
      throw new Error(errorMessage);
    }

    const signedUser = data.session?.user ?? data.user ?? null;
    if (signedUser) {
      setSession(data.session ?? null);
      setUser(signedUser);
      setSessionValid(true);
      setError(null);
      authDebug('user signed in', `user=${signedUser.id}`);
    }

    return data;
  };

  const signInWithPassword = async (email, password) => {
    setError(null);
    const client = assertClient();
    if (!client) throw new Error('Supabase client not available. Check environment variables.');

    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const errorMessage = formatAuthError(signInError);
      setError(errorMessage);
      setSessionValid(false);
      throw new Error(errorMessage);
    }

    const signedUser = data.session?.user ?? data.user ?? null;
    setSession(data.session ?? null);
    setUser(signedUser);
    setSessionValid(true);
    setError(null);
    authDebug('user signed in', signedUser?.id ? `user=${signedUser.id}` : 'signed in without session');

    return data;
  };

  const signInWithGoogle = async () => {
    setError(null);
    const client = assertClient();
    if (!client) throw new Error('Supabase client not available. Check environment variables.');

    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/dashboard'),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError) {
      const errorMessage = formatAuthError(oauthError);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    authDebug('redirect triggered', 'Google OAuth');
  };

  const resetPassword = async (email) => {
    setError(null);
    const client = assertClient();
    if (!client) throw new Error('Supabase client not available. Check environment variables.');

    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/login'),
    });

    if (resetError) {
      const errorMessage = formatAuthError(resetError);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    authDebug('password reset requested', email);
  };

  const signOut = async () => {
    setError(null);
    const client = assertClient();
    if (!client) throw new Error('Supabase client not available. Check environment variables.');

    const { error: signOutError } = await client.auth.signOut();

    if (signOutError) {
      const errorMessage = formatAuthError(signOutError);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setUser(null);
    setSession(null);
    setSessionValid(false);
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    authDebug('user signed out');
  };

  const value = {
    user,
    session,
    initializing,
    loading: initializing,
    error,
    clearError,
    signUp,
    signInWithPassword,
    signInWithGoogle,
    resetPassword,
    signOut,
    isAuthenticated: !!user && sessionValid,
    isConfigured: isSupabaseConfigured,
    sessionValid,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
