import { TextInput as NativeTextInput, type TextInputProps } from 'react-native';

import { useAppLanguage } from '@/hooks/use-app-language';
import { translateUiText } from '@/i18n/global-ui-copy';

export function AppTextInput({ placeholder, ...props }: TextInputProps) {
  const language = useAppLanguage();
  return (
    <NativeTextInput
      {...props}
      placeholder={placeholder ? translateUiText(language, placeholder) : placeholder}
    />
  );
}
