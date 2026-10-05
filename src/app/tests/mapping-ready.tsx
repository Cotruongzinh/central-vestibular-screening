import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testValidationHref } from '@/navigation/test-routes';
import { mappingStyles as styles } from '@/styles/screens/tests/mapping.styles';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { getGazeMappingResult } from '@/tracking/mapping/mapping-store';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestMappingReadyScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const calibrationId = firstParam(params.calibrationId as string | string[] | undefined);
  const mappingId = firstParam(params.mappingId as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const dataset = getCalibrationDataset(calibrationId);
  const mapping = getGazeMappingResult(mappingId);

  const matches = Boolean(
    dataset &&
      mapping &&
      patientId &&
      test &&
      mapping.calibrationId === dataset.id &&
      mapping.patientId === patientId &&
      mapping.testId === test.id &&
      mapping.mode === mode &&
      mapping.batteryIndex === batteryIndex,
  );

  const continueToValidation = () => {
    if (!matches || !patientId || !test || !dataset || !mapping) return;
    router.push(
      testValidationHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId: dataset.id,
        mappingId: mapping.id,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>HIỆU CHỈNH</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Hiệu chỉnh sẵn sàng</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Còn một bước kiểm tra độ chính xác trước khi bắt đầu.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={[styles.statusBadge, !matches && styles.statusBadgeError]}>
            <LocalizedPipelineText
              language={language}
              style={[styles.statusBadgeText, !matches && styles.statusBadgeTextError]}
            >
              {matches ? 'SẴN SÀNG' : 'CẦN THỬ LẠI'}
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>
            {test?.nameVi ?? 'Bài kiểm tra'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            {matches
              ? 'Ứng dụng sẽ kiểm tra nhanh độ chính xác của hướng nhìn bằng 5 điểm.'
              : 'Dữ liệu hiệu chỉnh không còn trong phiên hiện tại.'}
          </LocalizedPipelineText>

          {matches ? (
            <Pressable
              onPress={continueToValidation}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                KIỂM TRA ĐỘ CHÍNH XÁC
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
