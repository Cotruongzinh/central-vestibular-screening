import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testNystagmusMetricsReadyHref } from '@/navigation/test-routes';
import { nystagmusMetricsStyles as styles } from '@/styles/screens/tests/nystagmus-metrics.styles';
import { getEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { computeNystagmusMetrics } from '@/tracking/signal/nystagmus-metrics';
import {
  getNystagmusMetrics,
  saveNystagmusMetrics,
} from '@/tracking/signal/nystagmus-metrics-store';
import type { NystagmusMetricTestId } from '@/types/nystagmus-metrics';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isNystagmusMetricTestId(
  value: string | undefined,
): value is NystagmusMetricTestId {
  return value === 'gaze-evoked-nystagmus' || value === 'okn';
}

export default function NystagmusMetricsScreen() {
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
  const metricTestId = isNystagmusMetricTestId(testIdParam) ? testIdParam : undefined;
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
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
    return computeNystagmusMetrics(trace);
  }, [batteryIndex, metricTestId, mode, patientId, trace]);

  const [result] = useState(() => {
    if (!draft) return undefined;
    const existing = getNystagmusMetrics(
      firstParam(params.metricsId as string | string[] | undefined),
    );
    return existing ?? saveNystagmusMetrics(draft);
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
            {test?.nameVi ?? 'Nystagmus'}
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

          {result?.kind === 'gaze-evoked' ? (
            <>
              <View style={styles.primaryMetricCard}>
                <LocalizedPipelineText language={language} style={styles.metricEyebrow}>
                  VẬN TỐC PHA CHẬM
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.primaryValue}>
                  {result.meanAbsoluteSlowPhaseVelocity.toFixed(3)} /s
                </LocalizedPipelineText>
              </View>

              <View style={styles.grid}>
                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Giá trị lớn nhất
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {result.maxAbsoluteSlowPhaseVelocity.toFixed(3)} /s
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
          ) : result?.kind === 'okn' ? (
            <>
              <View style={styles.primaryMetricCard}>
                <LocalizedPipelineText language={language} style={styles.metricEyebrow}>
                  BẤT ĐỐI XỨNG HƯỚNG
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.primaryValue}>
                  {(result.directionalAsymmetryRatio * 100).toFixed(1)}%
                </LocalizedPipelineText>
              </View>

              <View style={styles.grid}>
                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Đáp ứng sang phải
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {result.rightward.slowPhaseVelocityMagnitude.toFixed(3)} /s
                  </LocalizedPipelineText>
                </View>

                <View style={styles.metricCard}>
                  <LocalizedPipelineText language={language} style={styles.metricLabel}>
                    Đáp ứng sang trái
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.metricValue}>
                    {result.leftward.slowPhaseVelocityMagnitude.toFixed(3)} /s
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
                testNystagmusMetricsReadyHref({
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
