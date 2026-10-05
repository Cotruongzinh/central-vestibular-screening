import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useAppLanguage } from '@/hooks/use-app-language';
import { translateUiText } from '@/i18n/global-ui-copy';
import { appTheme } from '@/theme/appTheme';

export function AppEmblem({ compact = false }: { compact?: boolean }) {
  const language = useAppLanguage();
  const size = compact ? 58 : 84;
  const iconSize = compact ? 42 : 62;

  return (
    <View
      accessibilityLabel={translateUiText(language, 'Biểu tượng y khoa Central Vestibular')}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: compact ? 17 : 24,
        },
      ]}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 84 84">
        <Defs>
          <LinearGradient id="medicalRibbon" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#D65B64" />
            <Stop offset="0.48" stopColor={appTheme.colors.medicalRed} />
            <Stop offset="1" stopColor={appTheme.colors.medicalRedDark} />
          </LinearGradient>
          <LinearGradient id="ribbonFold" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#F07B82" stopOpacity="0.78" />
            <Stop offset="1" stopColor="#9C2D39" stopOpacity="0.20" />
          </LinearGradient>
        </Defs>

        {/* Một silhouette duy nhất, bo cong như dải ruy-băng thay vì ghép 2 hình chữ nhật. */}
        <Path
          d="M35 7
             C31.4 7 28.8 9.8 28.8 13.4
             L28.8 27.7
             C28.8 30.0 27.0 31.8 24.7 31.8
             L13.4 31.8
             C9.7 31.8 7 34.5 7 38.1
             L7 45.9
             C7 49.5 9.7 52.2 13.4 52.2
             L24.8 52.2
             C27.1 52.2 28.9 54.0 28.9 56.3
             L28.9 70.6
             C28.9 74.2 31.6 77 35.2 77
             L48.8 77
             C52.4 77 55.1 74.2 55.1 70.6
             L55.1 56.2
             C55.1 53.9 56.9 52.1 59.2 52.1
             L70.6 52.1
             C74.3 52.1 77 49.4 77 45.8
             L77 38.0
             C77 34.4 74.3 31.7 70.6 31.7
             L59.2 31.7
             C56.9 31.7 55.1 29.9 55.1 27.6
             L55.1 13.4
             C55.1 9.8 52.4 7 48.8 7
             Z"
          fill="url(#medicalRibbon)"
        />

        {/* Vệt gấp cong tạo cảm giác ruy-băng uốn và có chiều sâu. */}
        <Path
          d="M28.8 27.7
             C35.4 22.9 45.6 23.8 55.1 29.6
             L55.1 37.0
             C45.9 31.4 36.4 31.1 28.8 36.2
             Z"
          fill="url(#ribbonFold)"
        />
        <Path
          d="M29.2 52.0
             C36.3 56.7 45.8 57.1 54.8 52.5"
          fill="none"
          stroke="#7F202A"
          strokeOpacity="0.26"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <Path
          d="M31.8 10.8
             C38.7 13.0 46.0 13.0 52.2 10.8"
          fill="none"
          stroke="#F58C91"
          strokeOpacity="0.45"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appTheme.colors.white,
    borderWidth: 1,
    borderColor: '#D7E5EB',
    shadowColor: '#12334A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
});
