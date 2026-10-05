import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Text, type TextProps } from 'react-native';

import { translateUiText } from '@/i18n/global-ui-copy';
import type { AppLanguage } from '@/types/app-language';

type Props = TextProps & {
  language: AppLanguage;
  children?: ReactNode;
};

function isPrimitiveNode(node: ReactNode): boolean {
  return (
    node === null ||
    node === undefined ||
    typeof node === 'string' ||
    typeof node === 'number'
  );
}

function translateNode(language: AppLanguage, node: ReactNode): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return translateUiText(language, String(node));
  }

  if (Array.isArray(node)) {
    if (node.every(isPrimitiveNode)) {
      return translateUiText(
        language,
        node.map((child) => (child === null || child === undefined ? '' : String(child))).join(''),
      );
    }

    return node.map((child, index) => (
      <Fragment key={index}>{translateNode(language, child)}</Fragment>
    ));
  }

  return node;
}

export function LocalizedPipelineText({ language, children, ...props }: Props) {
  return <Text {...props}>{translateNode(language, children)}</Text>;
}
