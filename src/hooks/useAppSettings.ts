import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  appName: string;
  companyName?: string;
  showLogo: boolean;
}

const defaultSettings: AppSettings = {
  appName: 'IT',
  companyName: '',
  showLogo: true,
};

export function useAppSettings(): [AppSettings, (settings: Partial<AppSettings>) => void] {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') return defaultSettings;
    try {
      const saved = localStorage.getItem('it-manager-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const setSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('it-manager-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return [settings, setSettings];
}
