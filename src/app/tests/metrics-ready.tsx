import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testPersistHref } from '@/navigation/test-routes';
import { metricsStyles as styles } from '@/styles/screens/tests/metrics.styles';
import { getEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { getSmoothPursuitMetrics } from '@/tracking/signal/metrics-store';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function SmoothPursuitMetricsReadyScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const traceId = firstParam(params.traceId as string | string[] | undefined);
  const metricsId = firstParam(params.metricsId as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const trace = getEyeTrace(traceId);
  const metrics = getSmoothPursuitMetrics(metricsId);

  const matches = Boolean(
    patientId &&
      test?.id === 'smooth-pursuit' &&
      trace &&
      metrics &&
      metrics.technicalReady &&
      metrics.patientId === patientId &&
      metrics.mode === mode &&
      metrics.batteryIndex === batteryIndex &&
      metrics.traceId === trace.id,
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>KẾT QUẢ</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Smooth Pursuit</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>Kết quả đã được tính.</LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip
            items={[{ requirement: 'FR-23', value: 'Kết quả chỉ số tự động' }]}
          />

          {matches && metrics ? (
            <>
              <View style={styles.primaryMetricCard}>
                <LocalizedPipelineText language={language} style={styles.metricEyebrow}>PURSUIT GAIN</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.gainValue}>{metrics.pursuitGain.toFixed(3)}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.metricCaption}>
                  Tín hiệu sử dụng được {(metrics.usableRatio * 100).toFixed(1)}%
                </LocalizedPipelineText>
              </View>

              <Pressable
                onPress={() =>
                  router.push(
                    testPersistHref({
                      patientId: patientId!,
                      testId: 'smooth-pursuit',
                      mode,
                      batteryIndex,
                      traceId: trace!.id,
                      metricsId: metrics.id,
                    }),
                  )
                }
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>LƯU KẾT QUẢ</LocalizedPipelineText>
              </Pressable>
            </>
          ) : (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Kết quả chưa sẵn sàng</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>Hãy quay lại và thử lại.</LocalizedPipelineText>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryText}>QUAY LẠI</LocalizedPipelineText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
