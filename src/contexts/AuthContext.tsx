import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { Profile } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type AppRole = Database['public']['Enums']['app_role'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;  // true for super_admin OR admin
  isEmployee: boolean;  // true for employee only (view-only)
  userRole: AppRole | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role?: 'admin' | 'employee') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  const withTimeout = async <T,>(promiseLike: PromiseLike<T>, ms = 20000): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('Auth request timeout')), ms);
    });

    try {
      // supabase-js query builders are PromiseLike (thenable), not always typed as Promise.
      return await Promise.race([Promise.resolve(promiseLike as any), timeout]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const fetchProfile = async (userId: string) => {
    // Check sessionStorage cache first for faster loading
    const cacheKey = `profile_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data as Profile;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      // Cache the profile for faster subsequent loads
      if (data) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
      }
      
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Fetch user role from secure user_roles table (not profiles!)
  const fetchUserRole = async (userId: string): Promise<AppRole> => {
    const cacheKey = `user_role_${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Cache valid for 5 minutes
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.role as AppRole;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      );

      if (error) {
        console.error('Error fetching user role:', error);
        return 'employee'; // Safe default
      }

      const role = data?.role ?? 'employee';
      
      // Cache the role
      sessionStorage.setItem(cacheKey, JSON.stringify({
        role,
        timestamp: Date.now(),
      }));

      return role;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'employee'; // Safe default
    }
  };

  const ensureProfile = async (u: User) => {
    const existing = await fetchProfile(u.id);
    if (existing) return existing;

    try {
      const fullName =
        (u.user_metadata as any)?.full_name ||
        (u.email ? u.email.split('@')[0] : 'User');

      // If profile doesn't exist (e.g., no trigger created it), create it on first login.
      const { error } = await withTimeout(
        supabase.from('profiles').insert({
        user_id: u.id,
        email: u.email ?? '',
        full_name: fullName,
        // Keep defaults for department/position/role if DB has defaults.
        })
      );

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return await fetchProfile(u.id);
    } catch (e) {
      console.error('Error ensuring profile:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check initial session first
    const initializeAuth = async () => {
      // Never allow infinite loading on first paint.
      const safetyTimeout = window.setTimeout(() => {
        if (isMounted) {
          console.error('Auth init safety timeout hit — forcing isLoading=false');
          setIsLoading(false);
        }
      }, 20000); // Increased to 20s for better stability on slow connections

      try {
        const { data: { session: initialSession } } = await withTimeout(supabase.auth.getSession(), 12000);
        
        if (!isMounted) return;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Fetch profile and role in parallel for faster loading
          const [profileData, role] = await Promise.all([
            ensureProfile(initialSession.user),
            fetchUserRole(initialSession.user.id)
          ]);
          if (isMounted) {
            setProfile(profileData);
            setUserRole(role);
          }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        window.clearTimeout(safetyTimeout);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event);

        // IMPORTANT: avoid redirect flicker.
        // ProtectedRoute requires both user and profile, so we keep isLoading=true
        // until we finish fetching the profile for the new session.
        setIsLoading(true);
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        try {
          if (currentSession?.user) {
            // Fetch profile and role in parallel
            const [profileData, role] = await Promise.all([
              ensureProfile(currentSession.user),
              fetchUserRole(currentSession.user.id)
            ]);
            if (isMounted) {
              setProfile(profileData);
              setUserRole(role);
            }
          } else {
            setProfile(null);
            setUserRole(null);
          }
        } catch (e) {
          console.error('Auth state handler error:', e);
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
      // If not remembering, set session storage flag
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
    // Clear cached role
    if (user) {
      sessionStorage.removeItem(`user_role_${user.id}`);
      sessionStorage.removeItem(`profile_${user.id}`);
    }
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setUserRole(null);
  };

  // Use role from secure user_roles table (NOT from profiles!)
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
        signIn,
        signUp,
        signOut,
        refreshProfile,
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
