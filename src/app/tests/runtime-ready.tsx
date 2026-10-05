import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import {
  testMetricsHref,
  testNystagmusMetricsHref,
  testSaccadeMetricsHref,
} from '@/navigation/test-routes';
import { runtimeStyles as styles } from '@/styles/screens/tests/runtime.styles';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { getGazeMappingResult } from '@/tracking/mapping/mapping-store';
import { getEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { getFixationValidation } from '@/tracking/validation/validation-store';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestRuntimeReadyScreen() {
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

  const calibration = getCalibrationDataset(calibrationId);
  const mapping = getGazeMappingResult(mappingId);
  const validation = getFixationValidation(validationId);
  const trace = getEyeTrace(traceId);

  const matches = Boolean(
    patientId &&
      test &&
      calibration &&
      mapping &&
      validation &&
      trace &&
      trace.completed &&
      trace.patientId === patientId &&
      trace.testId === test.id &&
      trace.mode === mode &&
      trace.batteryIndex === batteryIndex &&
      trace.calibrationId === calibration.id &&
      trace.mappingId === mapping.id &&
      trace.validationId === validation.id,
  );

  const totalSamples = trace?.samples.length ?? 0;
  const usableRatio =
    trace && totalSamples > 0
      ? ((trace.qualityCounts.green + trace.qualityCounts.yellow) / totalSamples) * 100
      : 0;

  const openAnalysis = () => {
    if (!matches || !patientId || !test || !calibration || !mapping || !validation || !trace) return;

    const common = {
      patientId,
      testId: test.id,
      mode,
      batteryIndex,
      calibrationId: calibration.id,
      mappingId: mapping.id,
      validationId: validation.id,
      traceId: trace.id,
    };

    if (test.id === 'smooth-pursuit') {
      router.push(testMetricsHref({ ...common, testId: 'smooth-pursuit' }));
      return;
    }

    if (test.id === 'horizontal-saccades' || test.id === 'vertical-saccades' || test.id === 'anti-saccade') {
      router.push(testSaccadeMetricsHref(common));
      return;
    }

    if (test.id === 'gaze-evoked-nystagmus' || test.id === 'okn') {
      router.push(testNystagmusMetricsHref(common));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>HOÀN TẤT</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Đã ghi nhận bài kiểm tra</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            {test?.nameVi ?? 'Bài kiểm tra'}
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>
              {matches ? 'DỮ LIỆU SẴN SÀNG' : 'THIẾU DỮ LIỆU'}
            </LocalizedPipelineText>
          </View>

          {matches && trace ? (
            <>
              <View style={styles.summaryCard}>
                <LocalizedPipelineText language={language} style={styles.summaryLabel}>TÓM TẮT</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.summaryValue}>
                  {usableRatio.toFixed(0)}% tín hiệu sử dụng được
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.summaryMetric}>
                  Thời gian kiểm tra {(trace.activeDurationMs / 1000).toFixed(0)} giây
                </LocalizedPipelineText>
              </View>

              <RequirementEvidenceStrip
                items={[
                  { requirement: 'FR-21', value: `Tín hiệu sử dụng được ${usableRatio.toFixed(0)}%` },
                  { requirement: 'FR-23', value: 'Tự động tính chỉ số sau bài kiểm tra' },
                ]}
              />

              <Pressable
                onPress={openAnalysis}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>
                  XEM KẾT QUẢ
                </LocalizedPipelineText>
              </Pressable>
            </>
          ) : (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Chưa có kết quả</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>
                Hãy quay lại và thực hiện lại bài kiểm tra.
              </LocalizedPipelineText>
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
