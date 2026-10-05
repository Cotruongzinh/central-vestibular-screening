import { StyleSheet } from 'react-native';

import { appTheme } from '@/theme/appTheme';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  page: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  content: {
    paddingBottom: 34,
  },
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
  headerTextWrap: {
    flex: 1,
    paddingRight: 14,
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
    lineHeight: 34,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 12,
    maxWidth: 340,
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
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.warningSoft,
  },
  statusPillText: {
    color: '#9B6508',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 15,
    color: appTheme.colors.text,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: appTheme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  infoCard: {
    marginTop: 18,
    paddingHorizontal: 15,
    borderRadius: appTheme.radius.lg,
    backgroundColor: '#F8FBFC',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.border,
  },
  infoRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  infoLabel: {
    flex: 1,
    paddingRight: 12,
    color: appTheme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  infoValue: {
    maxWidth: '55%',
    color: appTheme.colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'right',
  },
  successValue: {
    color: appTheme.colors.success,
  },
  dangerValue: {
    color: appTheme.colors.danger,
  },
  infoNote: {
    marginTop: 18,
    padding: 15,
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.colors.primarySoft,
  },
  infoNoteTitle: {
    color: appTheme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  infoNoteText: {
    marginTop: 6,
    color: appTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  buttonBlock: {
    marginTop: 20,
  },
  buttonGap: {
    height: 10,
  },
  footerNote: {
    marginTop: 18,
    color: appTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
