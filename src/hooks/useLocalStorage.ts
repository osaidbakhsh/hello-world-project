import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Get from local storage then parse stored json or return initialValue
  const readValue = useCallback((): T => {
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
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  return [storedValue, setValue];
}

// Specialized hooks for each data type
export const useServers = () => useLocalStorage<import('@/types').Server[]>('it-manager-servers', []);
export const useNetworks = () => useLocalStorage<import('@/types').Network[]>('it-manager-networks', []);
export const useEmployees = () => useLocalStorage<import('@/types').Employee[]>('it-manager-employees', []);
export const useLicenses = () => useLocalStorage<import('@/types').License[]>('it-manager-licenses', []);
export const useTasks = () => useLocalStorage<import('@/types').Task[]>('it-manager-tasks', []);
