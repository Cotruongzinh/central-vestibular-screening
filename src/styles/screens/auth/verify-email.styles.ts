import { StyleSheet } from 'react-native';
import { appTheme } from '@/theme/appTheme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
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
  statusCard: { padding: 16, borderRadius: appTheme.radius.lg, borderWidth: 1, marginBottom: 16 },
  statusReady: { backgroundColor: appTheme.colors.successSoft, borderColor: '#BFE2CA' },
  statusPending: { backgroundColor: appTheme.colors.warningSoft, borderColor: '#EED18B' },
  statusLabel: { color: appTheme.colors.text, fontSize: 14, fontWeight: '900' },
  statusEmail: { marginTop: 8, color: appTheme.colors.text, fontSize: 16, lineHeight: 22 },
  stepsCard: { padding: 15, borderRadius: appTheme.radius.md, backgroundColor: '#F8FBFC', borderWidth: 1, borderColor: appTheme.colors.border, marginBottom: 16 },
  stepsTitle: { marginBottom: 8, color: appTheme.colors.text, fontSize: 16, fontWeight: '800' },
  step: { marginTop: 5, color: appTheme.colors.text, fontSize: 13.5, lineHeight: 20 },
  messageBox: { marginBottom: 14, padding: 12, borderRadius: appTheme.radius.sm, backgroundColor: appTheme.colors.primarySoft },
  messageText: { color: appTheme.colors.primaryDark, fontSize: 13, lineHeight: 19 },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: appTheme.radius.sm, backgroundColor: appTheme.colors.dangerSoft },
  errorText: { color: appTheme.colors.danger, fontSize: 13, lineHeight: 19 },
  buttonGap: { height: 10 },
});
