import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testSaccadeMetricsReadyHref } from '@/navigation/test-routes';
import { saccadeMetricsStyles as styles } from '@/styles/screens/tests/saccade-metrics.styles';
import { getEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { computeSaccadeMetrics } from '@/tracking/signal/saccade-metrics';
import {
  getSaccadeMetrics,
  saveSaccadeMetrics,
} from '@/tracking/signal/saccade-metrics-store';
import type { SaccadeMetricTestId } from '@/types/saccade-metrics';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isSaccadeMetricTestId(value: string | undefined): value is SaccadeMetricTestId {
  return (
    value === 'horizontal-saccades' ||
    value === 'vertical-saccades' ||
    value === 'anti-saccade'
  );
}

export default function SaccadeMetricsScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const calibrationId = firstParam(params.calibrationId as string | string[] | undefined);
  const mappingId = firstParam(params.mappingId as string | string[] | undefined);
  const validationId = firstParam(params.validationId as string | string[] | undefined);
  const traceId = firstParam(params.traceId as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const metricTestId = isSaccadeMetricTestId(testIdParam) ? testIdParam : undefined;
  const trace = getEyeTrace(traceId);

  const draft = useMemo(() => {
    if (
      !patientId ||
      !metricTestId ||
      !trace ||
      trace.patientId !== patientId ||
      trace.testId !== metricTestId ||
      trace.mode !== mode ||
      trace.batteryIndex !== batteryIndex
    ) {
      return null;
    }
    return computeSaccadeMetrics(trace);
  }, [batteryIndex, metricTestId, mode, patientId, trace]);

  const [result] = useState(() => {
    if (!draft) return undefined;
    const existing = getSaccadeMetrics(
      firstParam(params.metricsId as string | string[] | undefined),
    );
    return existing ?? saveSaccadeMetrics(draft);
  });

  const canContinue = Boolean(
    result?.technicalReady &&
      patientId &&
      metricTestId &&
      calibrationId &&
      mappingId &&
      validationId &&
      traceId,
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>
            KẾT QUẢ
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>
            {test?.nameVi ?? 'Saccade'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Tóm tắt các chỉ số chính của bài kiểm tra.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip
            items={[{ requirement: 'FR-23', value: 'Chỉ số được tính tự động' }]}
          />

          <View style={[styles.badge, !canContinue && styles.badgeError]}>
            <LocalizedPipelineText
              language={language}
              style={[styles.badgeText, !canContinue && styles.badgeTextError]}
            >
              {canContinue ? 'KẾT QUẢ SẴN SÀNG' : 'CHƯA SẴN SÀNG'}
            </LocalizedPipelineText>
          </View>

          {result ? (
            <>
              <View style={styles.primaryMetricCard}>
                <LocalizedPipelineText language={language} style={styles.metricEyebrow}>
                  ĐỘ TRỄ TRUNG VỊ
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.gainValue}>
                  {Math.round(result.medianLatencyMs)} ms
                </LocalizedPipelineText>
              </View>

              <View style={styles.grid}>
                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Độ chính xác điểm cuối
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {(result.meanEndpointAccuracy * 100).toFixed(1)}%
                  </LocalizedPipelineText>
                </View>

                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Vận tốc đỉnh
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {result.medianPeakVelocity.toFixed(3)} /s
                  </LocalizedPipelineText>
                </View>

                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Đáp ứng đúng hướng
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {(result.directionCorrectRatio * 100).toFixed(1)}%
                  </LocalizedPipelineText>
                </View>

                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Tín hiệu sử dụng được
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {(result.usableRatio * 100).toFixed(1)}%
                  </LocalizedPipelineText>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>
                Chưa đủ dữ liệu
              </LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>
                Hãy thực hiện lại bài kiểm tra.
              </LocalizedPipelineText>
            </View>
          )}

          <Pressable
            disabled={!canContinue || !result}
            onPress={() => {
              if (
                !canContinue ||
                !result ||
                !patientId ||
                !metricTestId ||
                !calibrationId ||
                !mappingId ||
                !validationId ||
                !traceId
              ) {
                return;
              }

              router.push(
                testSaccadeMetricsReadyHref({
                  patientId,
                  testId: metricTestId,
                  mode,
                  batteryIndex,
                  calibrationId,
                  mappingId,
                  validationId,
                  traceId,
                  metricsId: result.id,
                }),
              );
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canContinue || !result) && styles.disabled,
              pressed && canContinue && styles.pressed,
            ]}
          >
            <LocalizedPipelineText language={language} style={styles.buttonText}>
              TIẾP TỤC
            </LocalizedPipelineText>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryText}>
              QUAY LẠI
            </LocalizedPipelineText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
