import { StyleSheet } from 'react-native';

import { appTheme } from '@/theme/appTheme';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: appTheme.colors.background },
  page: { flex: 1, backgroundColor: appTheme.colors.background },
  content: { paddingBottom: 34 },
  blueHeader: {
    backgroundColor: appTheme.colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 58,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#D8F0FC',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  headerTitle: {
    marginTop: 6,
    color: appTheme.colors.white,
    fontSize: 27,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 12,
    maxWidth: 330,
    color: '#E8F5FB',
    fontSize: 14,
    lineHeight: 20,
  },
  sheet: {
    marginTop: -28,
    marginHorizontal: 18,
    padding: 20,
    borderRadius: appTheme.radius.xl,
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  sheetTitle: {
    color: appTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sheetSubtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: appTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  deletedCard: {
    marginBottom: 10,
    padding: 15,
    borderRadius: appTheme.radius.lg,
    backgroundColor: '#FFF9F9',
    borderWidth: 1,
    borderColor: '#EBCFD2',
  },
  deletedName: {
    color: appTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  deletedMeta: {
    marginTop: 4,
    marginBottom: 12,
    color: appTheme.colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  empty: {
    padding: 17,
    borderRadius: appTheme.radius.md,
    backgroundColor: '#F8FBFC',
    color: appTheme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonGap: { height: 10 },
  errorBox: {
    marginBottom: 12,
    padding: 13,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.dangerSoft,
  },
  errorText: {
    color: appTheme.colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: 18,
    color: appTheme.colors.muted,
    textAlign: 'center',
  },
});
