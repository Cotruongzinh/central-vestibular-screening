import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';

import { AppEmblem } from '@/components/ui/AppEmblem';
import { appTheme } from '@/theme/appTheme';

type Props = {
  title: string;
  subtitle: string;
  compact?: boolean;
};

export function AuthHero({ title, subtitle, compact = false }: Props) {
  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <AppEmblem compact={compact} />
      <Text style={[styles.kicker, compact && styles.kickerCompact]}>CENTRAL VESTIBULAR</Text>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 270,
    paddingTop: 18,
    paddingHorizontal: 28,
    paddingBottom: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.primary,
  },
  heroCompact: {
    minHeight: 210,
    paddingBottom: 42,
  },
  kicker: {
    marginTop: 14,
    color: '#D8F0FC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  kickerCompact: {
    marginTop: 10,
  },
  title: {
    marginTop: 8,
    color: appTheme.colors.white,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 7,
    maxWidth: 330,
    color: '#E8F5FB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  subtitleCompact: {
    fontSize: 13,
  },
});
