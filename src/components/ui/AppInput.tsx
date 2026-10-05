import type { ReactNode } from 'react';
import { StyleSheet, type TextInputProps, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/i18n/AppTextInput';
import { AppText as Text } from '@/components/i18n/AppText';

import { notifySessionActivity } from '@/services/session-activity.service';
import { appTheme } from '@/theme/appTheme';

type Props = TextInputProps & {
  label: string;
  accessory?: ReactNode;
};

export function AppInput({ label, accessory, style, onChangeText, ...props }: Props) {
  function handleChangeText(value: string) {
    notifySessionActivity();
    onChangeText?.(value);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputShell}>
        <TextInput
          {...props}
          onChangeText={handleChangeText}
          placeholderTextColor="#9AABB7"
          style={[styles.input, style]}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 7,
    color: appTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  inputShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: appTheme.radius.md,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: '#F9FCFD',
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 15,
    color: appTheme.colors.text,
    fontSize: 15,
  },
  accessory: {
    paddingRight: 14,
    paddingLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
