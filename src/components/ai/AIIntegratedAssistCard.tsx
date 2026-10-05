import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText as Text } from '@/components/i18n/AppText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { buildFullBatteryAIFeatureVector } from '@/services/ai-full-battery-features.service';
import { getAIIntegratedPrediction } from '@/services/ai-integrated-result.service';
import { styles } from '@/styles/components/ai-integrated-assist-card.styles';
import type { AIIntegratedLabel } from '@/types/ai-integrated-result';
import type { PersistedTestSession } from '@/types/test-session';

const copy = {
  vi: {
    pill: 'AI HỖ TRỢ PHÂN LOẠI',
    title: 'Kết quả AI',
    confidence: 'Độ tin cậy',
    distribution: 'Phân bố dự đoán',
    labels: {
      normal: 'Bình thường',
      peripheral: 'Ngoại biên',
      central: 'Trung ương',
    },
    assessments: {
      normal: 'Kết quả của 6 bài phù hợp nhất với nhóm bình thường.',
      peripheral: 'Kết quả của 6 bài phù hợp nhất với nhóm rối loạn tiền đình ngoại biên.',
      central: 'Kết quả của 6 bài phù hợp nhất với nhóm rối loạn tiền đình trung ương.',
    },
  },
  en: {
    pill: 'AI CLASSIFICATION SUPPORT',
    title: 'AI result',
    confidence: 'Confidence',
    distribution: 'Prediction distribution',
    labels: {
      normal: 'Normal',
      peripheral: 'Peripheral',
      central: 'Central',
    },
    assessments: {
      normal: 'The six-test result pattern is most consistent with the normal group.',
      peripheral: 'The six-test result pattern is most consistent with the peripheral vestibular group.',
      central: 'The six-test result pattern is most consistent with the central vestibular group.',
    },
  },
} as const;

const labelOrder: AIIntegratedLabel[] = ['normal', 'peripheral', 'central'];

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function AIIntegratedAssistCard({
  sessions,
}: {
  sessions: readonly PersistedTestSession[];
}) {
  const language = useAppLanguage();
  const t = copy[language];

  const prediction = useMemo(() => {
    const input = buildFullBatteryAIFeatureVector(sessions);
    if (!input) return null;

    try {
      return getAIIntegratedPrediction(input);
    } catch {
      return null;
    }
  }, [sessions]);

  if (!prediction) {
    return null;
  }

  return (
    <View style={styles.card} testID="ai-integrated-result-battery-summary">
      <View style={styles.pill}>
        <Text style={styles.pillText}>{t.pill}</Text>
      </View>

      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.result}>{t.labels[prediction.predictedLabel]}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>{t.confidence}</Text>
        <Text style={styles.confidenceValue}>{percent(prediction.confidence)}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t.distribution}</Text>
      <View style={styles.probabilityList}>
        {labelOrder.map((label) => {
          const value = prediction.probabilities[label];
          return (
            <View key={label} style={styles.probabilityItem}>
              <View style={styles.probabilityHeader}>
                <Text style={styles.probabilityLabel}>{t.labels[label]}</Text>
                <Text style={styles.probabilityValue}>{percent(value)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(2, value * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.assessment}>{t.assessments[prediction.predictedLabel]}</Text>
    </View>
  );
}
