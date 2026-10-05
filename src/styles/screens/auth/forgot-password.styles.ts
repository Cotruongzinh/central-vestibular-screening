import { StyleSheet } from 'react-native';
import { appTheme } from '@/theme/appTheme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: appTheme.colors.background },
  content: { paddingBottom: 28 },
  sheet: {
    marginTop: -28,
    marginHorizontal: 18,
    padding: 20,
    borderRadius: appTheme.radius.xl,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  sheetTitle: { marginBottom: 18, color: appTheme.colors.text, fontSize: 21, fontWeight: '800' },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: appTheme.radius.sm, backgroundColor: appTheme.colors.dangerSoft },
  errorText: { color: appTheme.colors.danger, fontSize: 13, lineHeight: 19 },
  successBox: { marginBottom: 18, padding: 16, borderRadius: appTheme.radius.lg, backgroundColor: appTheme.colors.successSoft, borderWidth: 1, borderColor: '#BFE2CA' },
  successTitle: { color: appTheme.colors.success, fontSize: 15, fontWeight: '900' },
  successText: { marginTop: 7, color: appTheme.colors.text, fontSize: 14, lineHeight: 21 },
});
