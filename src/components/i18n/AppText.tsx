import { Fragment, type ReactNode } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';

import { useAppLanguage } from '@/hooks/use-app-language';
import { translateUiText } from '@/i18n/global-ui-copy';

function localizeNode(language: 'vi' | 'en', node: ReactNode): ReactNode {
  if (typeof node === 'string') return translateUiText(language, node);
  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <Fragment key={index}>{localizeNode(language, child)}</Fragment>
    ));
  }
  return node;
}

export function AppText({ children, ...props }: TextProps) {
  const language = useAppLanguage();
  return <NativeText {...props}>{localizeNode(language, children)}</NativeText>;
}
