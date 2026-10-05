import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testMappingReadyHref } from '@/navigation/test-routes';
import { mappingStyles as styles } from '@/styles/screens/tests/mapping.styles';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { buildGazeMappingResult } from '@/tracking/mapping/gaze-mapper';
import { saveGazeMappingResult } from '@/tracking/mapping/mapping-store';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestMappingScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const calibrationId = firstParam(params.calibrationId as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const dataset = getCalibrationDataset(calibrationId);

  const contextMatches = Boolean(
    dataset &&
      patientId &&
      test &&
      dataset.id === calibrationId &&
      dataset.patientId === patientId &&
      dataset.testId === test.id &&
      dataset.mode === mode &&
      dataset.batteryIndex === batteryIndex &&
      dataset.points.length === 9,
  );

  const mapping = useMemo(
    () => (dataset && contextMatches ? buildGazeMappingResult(dataset) : null),
    [contextMatches, dataset],
  );

  useEffect(() => {
    if (mapping) saveGazeMappingResult(mapping);
  }, [mapping]);

  const continueReady = () => {
    if (!mapping || !patientId || !test || !calibrationId) return;
    router.push(
      testMappingReadyHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId,
        mappingId: mapping.id,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>HIỆU CHỈNH</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Xử lý hiệu chỉnh</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Ứng dụng đang chuẩn bị dữ liệu hướng nhìn cho bài kiểm tra.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={[styles.statusBadge, !mapping && styles.statusBadgeError]}>
            <LocalizedPipelineText
              language={language}
              style={[styles.statusBadgeText, !mapping && styles.statusBadgeTextError]}
            >
              {mapping ? 'ĐÃ XỬ LÝ' : 'CHƯA SẴN SÀNG'}
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>
            {test?.nameVi ?? 'Bài kiểm tra'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            {mapping
              ? 'Dữ liệu hiệu chỉnh đã được xử lý tự động.'
              : 'Không tìm thấy dữ liệu hiệu chỉnh hợp lệ. Hãy quay lại hiệu chỉnh.'}
          </LocalizedPipelineText>

          {mapping ? (
            <Pressable
              onPress={continueReady}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                TIẾP TỤC
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>
              QUAY LẠI HIỆU CHỈNH
            </LocalizedPipelineText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
