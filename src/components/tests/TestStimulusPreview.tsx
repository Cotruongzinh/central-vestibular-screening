import { View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';

import { testStimulusPreviewStyles as styles } from '@/styles/components/test-stimulus-preview.styles';
import type { AppLanguage } from '@/types/app-language';
import type { ClinicalTestId } from '@/types/test-administration';

type Props = {
  testId: ClinicalTestId;
  language?: AppLanguage;
};

function Dot({ active = false }: { active?: boolean }) {
  return <View style={[styles.dot, active && styles.dotActive]} />;
}

function Bar() {
  return <View style={styles.oknBar} />;
}

export function TestStimulusPreview({ testId, language = 'vi' }: Props) {
  const en = language === 'en';

  if (testId === 'smooth-pursuit') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>{en ? 'SMOOTH MOTION' : 'DI CHUYỂN MƯỢT'}</Text>
        <View style={styles.horizontalTrack}>
          <Dot />
          <View style={styles.trackLine} />
          <Dot active />
          <View style={styles.trackLine} />
          <Dot />
        </View>
        <Text style={styles.hint}>←  ●  →</Text>
      </View>
    );
  }

  if (testId === 'horizontal-saccades') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>{en ? 'HORIZONTAL JUMPS' : 'NHẢY NGANG'}</Text>
        <View style={styles.horizontalDots}><Dot active /><Dot /><Dot active /></View>
        <Text style={styles.hint}>{en ? 'LEFT · CENTER · RIGHT' : 'TRÁI · GIỮA · PHẢI'}</Text>
      </View>
    );
  }

  if (testId === 'vertical-saccades') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>{en ? 'VERTICAL JUMPS' : 'NHẢY DỌC'}</Text>
        <View style={styles.verticalDots}>
          <Dot active /><View style={styles.verticalLine} /><Dot /><View style={styles.verticalLine} /><Dot active />
        </View>
        <Text style={styles.hint}>{en ? 'UP · CENTER · DOWN' : 'TRÊN · GIỮA · DƯỚI'}</Text>
      </View>
    );
  }

  if (testId === 'anti-saccade') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>ANTI-SACCADE</Text>
        <View style={styles.antiRow}>
          <Text style={styles.arrow}>←</Text><Dot active /><Text style={styles.centerLabel}>{en ? 'LOOK AWAY' : 'NHÌN NGƯỢC'}</Text><Dot active /><Text style={styles.arrow}>→</Text>
        </View>
        <Text style={styles.hint}>{en ? 'Target on one side · look to the opposite side' : 'Kích thích ở một bên · mắt nhìn về phía đối diện'}</Text>
      </View>
    );
  }

  if (testId === 'gaze-evoked-nystagmus') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>{en ? 'HOLD GAZE' : 'GIỮ ÁNH NHÌN'}</Text>
        <View style={styles.gazeGrid}>
          <View style={styles.gazeCell} /><View style={styles.gazeCell}><Dot /></View><View style={styles.gazeCell} />
          <View style={styles.gazeCell}><Dot /></View><View style={styles.gazeCell}><Dot active /></View><View style={styles.gazeCell}><Dot /></View>
          <View style={styles.gazeCell} /><View style={styles.gazeCell}><Dot /></View><View style={styles.gazeCell} />
        </View>
        <Text style={styles.hint}>{en ? 'CENTER · LEFT · RIGHT · UP · DOWN' : 'GIỮA · TRÁI · PHẢI · TRÊN · DƯỚI'}</Text>
      </View>
    );
  }

  if (testId === 'okn') {
    return (
      <View style={styles.preview}>
        <Text style={styles.caption}>OKN STRIPES</Text>
        <View style={styles.oknRow}><Bar /><Bar /><Bar /><Bar /><Bar /><Bar /><Bar /></View>
        <Text style={styles.hint}>{en ? '→ → →   then   ← ← ←' : '→ → →   sau đó   ← ← ←'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.preview}>
      <Text style={styles.caption}>CONVERGENCE / NPC</Text>
      <View style={styles.npcRow}><View style={styles.npcFar}><Dot /></View><View style={styles.npcLine} /><View style={styles.npcNear}><Dot active /></View></View>
      <Text style={styles.hint}>{en ? 'FAR → NEAR NOSE' : 'XA → GẦN MŨI'}</Text>
    </View>
  );
}
