import { Pressable, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';

import { notifySessionActivity } from '@/services/session-activity.service';
import { appTheme } from '@/theme/appTheme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'text';
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', disabled = false }: Props) {
  function handlePress() {
    notifySessionActivity();
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'text' && styles.textOnly,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: appTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: appTheme.colors.primary,
  },
  outline: {
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: appTheme.colors.primary,
  },
  textOnly: {
    minHeight: 42,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryLabel: {
    color: appTheme.colors.white,
  },
  secondaryLabel: {
    color: appTheme.colors.primary,
  },
});
