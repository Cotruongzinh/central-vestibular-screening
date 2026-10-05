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
  sessionNotice: {
    marginBottom: 16,
    padding: 13,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.warningSoft,
    borderWidth: 1,
    borderColor: '#F1D69A',
  },
  sessionNoticeTitle: {
    color: '#9B6508',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  sessionNoticeText: {
    marginTop: 5,
    color: appTheme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  accessoryText: { color: appTheme.colors.primary, fontSize: 13, fontWeight: '800' },
  forgotRow: { alignItems: 'flex-end', marginTop: -3, marginBottom: 16 },
  linkText: { color: appTheme.colors.primary, fontSize: 13.5, fontWeight: '700' },
  errorBox: { marginBottom: 14, padding: 12, borderRadius: appTheme.radius.sm, backgroundColor: appTheme.colors.dangerSoft },
  errorText: { color: appTheme.colors.danger, fontSize: 13, lineHeight: 19 },
  registerRow: { marginTop: 17, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  registerText: { color: appTheme.colors.muted, fontSize: 13.5 },
  registerLink: { color: appTheme.colors.primary, fontSize: 13.5, fontWeight: '800' },
});
