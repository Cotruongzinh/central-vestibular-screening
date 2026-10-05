import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getAppLanguage } from '@/services/app-language.service';
import type { AppLanguage } from '@/types/app-language';

type AppLanguageContextValue = {
  language: AppLanguage;
  ready: boolean;
  setLanguage: (language: AppLanguage) => void;
  refreshLanguage: () => Promise<void>;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('vi');
  const [ready, setReady] = useState(false);

  const refreshLanguage = useCallback(async () => {
    try {
      setLanguageState(await getAppLanguage());
    } catch {
      setLanguageState('vi');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshLanguage();
  }, [refreshLanguage]);

  const value = useMemo<AppLanguageContextValue>(
    () => ({ language, ready, setLanguage: setLanguageState, refreshLanguage }),
    [language, ready, refreshLanguage],
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguageContext() {
  const value = useContext(AppLanguageContext);
  if (!value) throw new Error('useAppLanguageContext must be used inside AppLanguageProvider');
  return value;
}
