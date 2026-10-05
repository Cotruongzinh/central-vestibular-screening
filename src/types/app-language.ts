export type AppLanguage = 'vi' | 'en';

export type AppLanguageOption = {
  code: AppLanguage;
  nativeLabel: string;
  englishLabel: string;
};

export const APP_LANGUAGE_OPTIONS: readonly AppLanguageOption[] = [
  { code: 'vi', nativeLabel: 'Tiếng Việt', englishLabel: 'Vietnamese' },
  { code: 'en', nativeLabel: 'English', englishLabel: 'English' },
] as const;
