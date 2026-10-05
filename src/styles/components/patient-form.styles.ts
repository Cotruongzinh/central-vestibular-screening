import { StyleSheet } from 'react-native';

import { appTheme } from '@/theme/appTheme';

export const patientFormStyles = StyleSheet.create({
  sexLabel: {
    marginBottom: 8,
    color: appTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  sexChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    backgroundColor: '#F8FBFC',
  },
  sexChipSelected: {
    borderColor: appTheme.colors.primary,
    backgroundColor: appTheme.colors.primarySoft,
  },
  sexChipText: {
    color: appTheme.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  sexChipTextSelected: {
    color: appTheme.colors.primaryDark,
  },
  notesInput: {
    minHeight: 94,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  helper: {
    marginTop: -3,
    marginBottom: 15,
    color: appTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorBox: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.dangerSoft,
  },
  errorText: {
    color: appTheme.colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  buttonGap: {
    height: 10,
  },
});
