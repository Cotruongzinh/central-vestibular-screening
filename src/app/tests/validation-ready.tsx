import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { FULL_BATTERY_TESTS, getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testRuntimeHref } from '@/navigation/test-routes';
import { validationStyles as styles } from '@/styles/screens/tests/validation.styles';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { getGazeMappingResult } from '@/tracking/mapping/mapping-store';
import { getFixationValidation } from '@/tracking/validation/validation-store';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestValidationReadyScreen() {
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

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;

  const calibration = getCalibrationDataset(calibrationId);
  const mapping = getGazeMappingResult(mappingId);
  const validation = getFixationValidation(validationId);

  const matches = Boolean(
    patientId &&
      test &&
      calibration &&
      mapping &&
      validation &&
      validation.technicalQualityPass &&
      validation.patientId === patientId &&
      validation.testId === test.id &&
      validation.mode === mode &&
      validation.batteryIndex === batteryIndex &&
      validation.calibrationId === calibration.id &&
      validation.mappingId === mapping.id,
  );

  const runtimeSupported = Boolean(
    test && FULL_BATTERY_TESTS.some((item) => item.id === test.id),
  );

  const continueToRuntime = () => {
    if (!matches || !runtimeSupported || !patientId || !test || !calibration || !mapping || !validation) return;

    router.push(
      testRuntimeHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId: calibration.id,
        mappingId: mapping.id,
        validationId: validation.id,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>CHUẨN BỊ</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Sẵn sàng kiểm tra</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            {test?.nameVi ?? 'Bài kiểm tra'}
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>
              {matches ? 'ĐỘ CHÍNH XÁC ĐẠT' : 'CẦN KIỂM TRA LẠI'}
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>
            {matches ? 'Có thể bắt đầu' : 'Chưa sẵn sàng'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            {matches
              ? 'Giữ điện thoại và đầu ổn định trong suốt bài kiểm tra.'
              : 'Hãy quay lại bước kiểm tra độ chính xác và thử lại.'}
          </LocalizedPipelineText>

          {matches && runtimeSupported ? (
            <Pressable
              onPress={continueToRuntime}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                BẮT ĐẦU BÀI KIỂM TRA
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>
              QUAY LẠI
            </LocalizedPipelineText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
