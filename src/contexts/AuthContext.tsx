import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/supabase-models';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type AppRole = Database['public']['Enums']['app_role'];

// Custom TimeoutError class for distinction
class TimeoutError extends Error {
  constructor(message: string, public readonly duration: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Call result interface for measurement
interface CallResult<T> {
  result: T | null;
  duration: number;
  success: boolean;
  error: {
    name: string;
    message: string;
    status?: number;
    code?: string;
    details?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  userRole: AppRole | null;
  authError: string | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: 'admin' | 'employee') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Measure call duration and capture errors
  const measureCall = async <T,>(
    name: string,
    fn: () => Promise<T>
  ): Promise<CallResult<T>> => {
    const start = performance.now();
    console.log(`[Auth Timing] ${name} - START`);
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`[Auth Timing] ${name} - OK in ${duration.toFixed(0)}ms`);
      return { result, duration, success: true, error: null };
    } catch (err: any) {
      const duration = performance.now() - start;
      const errorInfo = {
        name: err?.name || 'Error',
        message: err?.message || 'Unknown error',
        status: err?.status,
        code: err?.code,
        details: err?.details,
      };
      console.error(`[Auth Timing] ${name} - FAILED in ${duration.toFixed(0)}ms`, errorInfo);
      return { result: null, duration, success: false, error: errorInfo };
    }
  };

  // Clear auth cache when session is null
  const clearAuthCache = () => {
    const cachedUserId = sessionStorage.getItem('current_user_id');
    if (cachedUserId) {
      sessionStorage.removeItem(`profile_${cachedUserId}`);
      sessionStorage.removeItem(`user_role_${cachedUserId}`);
    }
    sessionStorage.removeItem('current_user_id');
    console.log('[Auth] Cache cleared');
  };

  const withTimeout = async <T,>(promiseLike: PromiseLike<T>, ms = 10000): Promise<T> => {
    let timeoutId: number | undefined;
    
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new TimeoutError(`Request timed out after ${ms}ms`, ms));
      }, ms);
    });

    try {
      return await Promise.race([Promise.resolve(promiseLike), timeout]);
    } catch (error) {
      throw error; // Rethrow as-is (TimeoutError or original error)
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const cacheKey = `profile_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data as Profile;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const { data, error } = await withTimeout(
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      8000
    );
    
    if (error) {
      throw error; // Propagate error
    }
    
    if (data) {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    }
    
    return data as Profile | null;
  };

  // Fetch user role - NO silent fallback
  const fetchUserRoleWithError = async (userId: string): Promise<AppRole> => {
    const cacheKey = `user_role_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.role as AppRole;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    const { data, error } = await withTimeout(
      supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      8000
    );

    if (error) {
      throw error; // No silent fallback
    }

    const role = data?.role ?? 'employee';
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      role,
      timestamp: Date.now(),
    }));

    return role;
  };

  const ensureProfile = async (u: User): Promise<Profile | null> => {
    // Check cache first
    const cacheKey = `profile_${u.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data as Profile;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    // Fetch with timeout
    const { data: existing, error: fetchError } = await withTimeout(
      supabase.from('profiles').select('*').eq('user_id', u.id).maybeSingle(),
      8000
    );

    if (fetchError) {
      throw fetchError; // Propagate error
    }

    if (existing) {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: existing,
        timestamp: Date.now(),
      }));
      return existing as Profile;
    }

    // Create profile if not exists (also with timeout)
    const fullName = (u.user_metadata as any)?.full_name || 
                     (u.email ? u.email.split('@')[0] : 'User');

    const { error: insertError } = await withTimeout(
      supabase.from('profiles').insert({
        user_id: u.id,
        email: u.email ?? '',
        full_name: fullName,
      }),
      8000
    );

    if (insertError) {
      throw insertError;
    }

    // Re-fetch after insert
    const { data: newProfile, error: refetchError } = await withTimeout(
      supabase.from('profiles').select('*').eq('user_id', u.id).maybeSingle(),
      8000
    );

    if (refetchError) {
      throw refetchError;
    }

    if (newProfile) {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: newProfile,
        timestamp: Date.now(),
      }));
    }

    return newProfile as Profile | null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  let isMounted = true;

  const initializeAuth = async () => {
    console.log('[Auth] === initializeAuth START ===');
    const results: Array<{call: string; duration: string; status: string; errorName?: string; errorCode?: string}> = [];
    
    const safetyTimeout = window.setTimeout(() => {
      if (isMounted) {
        console.error('[Auth] Safety timeout hit - forcing isLoading=false');
        setIsLoading(false);
        setAuthError('Connection timeout. Please retry.');
      }
    }, 15000);

    try {
      // 1. getSession with measurement
      const sessionResult = await measureCall('getSession', () => 
        withTimeout(supabase.auth.getSession(), 8000)
      );
      results.push({
        call: 'getSession',
        duration: `${sessionResult.duration.toFixed(0)}ms`,
        status: sessionResult.success ? 'OK' : 'FAIL',
        errorName: sessionResult.error?.name || '-',
        errorCode: sessionResult.error?.code || sessionResult.error?.status?.toString() || '-',
      });
      
      if (!isMounted) return;
      
      // Handle no session or failed getSession
      if (!sessionResult.success || !sessionResult.result?.data?.session?.user) {
        // Clear stale cache when no session
        clearAuthCache();
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserRole(null);
        
        if (!sessionResult.success) {
          setAuthError('Failed to connect. Please retry.');
        }
        
        console.table(results);
        console.log('[Auth] === initializeAuth COMPLETE (no session) ===');
        return;
      }
      
      const initialSession = sessionResult.result.data.session;
      setSession(initialSession);
      setUser(initialSession.user);
      
      // Save user_id for cache management
      sessionStorage.setItem('current_user_id', initialSession.user.id);
      
      // 2. ensureProfile with measurement and timeout
      const profileResult = await measureCall('ensureProfile', () => 
        ensureProfile(initialSession.user)
      );
      results.push({
        call: 'ensureProfile',
        duration: `${profileResult.duration.toFixed(0)}ms`,
        status: profileResult.success ? 'OK' : 'FAIL',
        errorName: profileResult.error?.name || '-',
        errorCode: profileResult.error?.code || '-',
      });
      
      if (!profileResult.success) {
        setAuthError('Failed to load profile. Please retry.');
        console.table(results);
        return;
      }
      
      if (isMounted) {
        setProfile(profileResult.result);
      }
      
      // 3. fetchUserRole with measurement
      const roleResult = await measureCall('fetchUserRole', () => 
        fetchUserRoleWithError(initialSession.user.id)
      );
      results.push({
        call: 'fetchUserRole',
        duration: `${roleResult.duration.toFixed(0)}ms`,
        status: roleResult.success ? 'OK' : 'FAIL',
        errorName: roleResult.error?.name || '-',
        errorCode: roleResult.error?.code || '-',
      });
      
      if (!roleResult.success) {
        setAuthError('Failed to load permissions. Please retry.');
        setUserRole(null); // No silent fallback
        console.table(results);
        return;
      }
      
      if (isMounted) {
        setUserRole(roleResult.result);
      }
      
      // Print results table
      console.table(results);
      console.log('[Auth] === initializeAuth COMPLETE ===');
      
    } catch (error) {
      console.error('[Auth] Unexpected error:', error);
      setAuthError('An unexpected error occurred. Please retry.');
    } finally {
      window.clearTimeout(safetyTimeout);
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  const retryAuth = async () => {
    if (isLoading) return; // Prevent duplicate calls
    
    console.log('[Auth] Retry requested');
    setAuthError(null);
    setIsLoading(true);
    await initializeAuth();
  };

  useEffect(() => {
    isMounted = true;

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);

        setIsLoading(true);
        setAuthError(null);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        try {
          if (currentSession?.user) {
            sessionStorage.setItem('current_user_id', currentSession.user.id);
            
            // Fetch profile and role in parallel
            const [profileData, role] = await Promise.all([
              ensureProfile(currentSession.user),
              fetchUserRoleWithError(currentSession.user.id)
            ]);
            if (isMounted) {
              setProfile(profileData);
              setUserRole(role);
            }
          } else {
            clearAuthCache();
            setProfile(null);
            setUserRole(null);
          }
        } catch (e) {
          console.error('Auth state handler error:', e);
          setAuthError('Failed to load user data. Please retry.');
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe = true) => {
    try {
      if (!rememberMe) {
        sessionStorage.setItem('session-only', 'true');
      } else {
        sessionStorage.removeItem('session-only');
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'admin' | 'employee' = 'employee') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    clearAuthCache();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setUserRole(null);
    setAuthError(null);
  };

  // Use role from secure user_roles table
  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isEmployee = userRole === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isEmployee,
        userRole,
        authError,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
