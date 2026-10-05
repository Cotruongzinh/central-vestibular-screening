import { useAppLanguageContext } from '@/providers/AppLanguageProvider';
import type { AppLanguage } from '@/types/app-language';

export function useAppLanguage(): AppLanguage {
  return useAppLanguageContext().language;
}
