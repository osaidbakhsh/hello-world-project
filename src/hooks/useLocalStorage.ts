import { useState, useCallback } from 'react';

/**
 * Generic localStorage hook for UI preferences ONLY.
 * 
 * ⚠️ IMPORTANT: Do NOT use this for entity data (Servers, Networks, Employees, etc.)
 * All entity data must be stored in the database (Supabase) as the single source of truth.
 * 
 * Allowed uses:
 * - Theme preferences
 * - Language settings
 * - Sidebar state
 * - View preferences
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get from local storage once during initial state
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

// ============================================================================
// DEPRECATED EXPORTS - DO NOT USE
// ============================================================================
// These hooks were previously used for localStorage-based data storage.
// All entity data is now stored in Supabase database.
// Use useSupabaseData hooks instead:
// - useServers() from useSupabaseData
// - useNetworks() from useSupabaseData
// - useProfiles() (for employees) from useSupabaseData
// - useLicenses() from useSupabaseData
// - useTasks() from useSupabaseData
// ============================================================================

/** @deprecated Use useServers() from useSupabaseData instead */
export const useServers = () => {
  console.warn('useServers from useLocalStorage is deprecated. Use useServers from useSupabaseData instead.');
  return [[], () => {}] as const;
};

/** @deprecated Use useNetworks() from useSupabaseData instead */
export const useNetworks = () => {
  console.warn('useNetworks from useLocalStorage is deprecated. Use useNetworks from useSupabaseData instead.');
  return [[], () => {}] as const;
};

/** @deprecated Use useProfiles() from useSupabaseData instead */
export const useEmployees = () => {
  console.warn('useEmployees from useLocalStorage is deprecated. Use useProfiles from useSupabaseData instead.');
  return [[], () => {}] as const;
};

/** @deprecated Use useLicenses() from useSupabaseData instead */
export const useLicenses = () => {
  console.warn('useLicenses from useLocalStorage is deprecated. Use useLicenses from useSupabaseData instead.');
  return [[], () => {}] as const;
};

/** @deprecated Use useTasks() from useSupabaseData instead */
export const useTasks = () => {
  console.warn('useTasks from useLocalStorage is deprecated. Use useTasks from useSupabaseData instead.');
  return [[], () => {}] as const;
};
