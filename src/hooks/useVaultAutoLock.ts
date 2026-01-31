import { useEffect, useCallback, useState, useRef } from 'react';
import { useVaultSettings } from './useVaultData';

export function useVaultAutoLock() {
  const { data: settings } = useVaultSettings();
  const [isLocked, setIsLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoLockMinutes = settings?.auto_lock_minutes ?? 5;

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isLocked) {
      // Don't auto-unlock, require manual unlock
    }
  }, [isLocked]);

  const unlock = useCallback(() => {
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    sessionStorage.setItem('vault_unlocked', 'true');
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
    sessionStorage.removeItem('vault_unlocked');
  }, []);

  useEffect(() => {
    // Check session storage on mount
    const wasUnlocked = sessionStorage.getItem('vault_unlocked') === 'true';
    setIsLocked(!wasUnlocked);
  }, []);

  useEffect(() => {
    if (autoLockMinutes === 0 || autoLockMinutes === null) {
      // Auto-lock disabled
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveMs = now - lastActivityRef.current;
      const lockAfterMs = autoLockMinutes * 60 * 1000;

      if (inactiveMs >= lockAfterMs && !isLocked) {
        lock();
      }
    };

    // Activity listeners
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Check every 30 seconds
    lockTimeoutRef.current = setInterval(checkInactivity, 30000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      
      if (lockTimeoutRef.current) {
        clearInterval(lockTimeoutRef.current);
      }
    };
  }, [autoLockMinutes, isLocked, lock]);

  return {
    isLocked,
    lock,
    unlock,
    resetActivity,
  };
}

// Clipboard security utility
export function useSecureClipboard() {
  const clipboardTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback(async (text: string, clearAfterSeconds = 30) => {
    try {
      await navigator.clipboard.writeText(text);

      // Clear any existing timeout
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }

      // Schedule clipboard clear
      clipboardTimeoutRef.current = setTimeout(async () => {
        try {
          // Write empty string to clear clipboard
          await navigator.clipboard.writeText('');
        } catch {
          // Clipboard clear failed, ignore
        }
      }, clearAfterSeconds * 1000);

      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
    };
  }, []);

  return { copyToClipboard };
}
