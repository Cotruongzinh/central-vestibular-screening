import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testMappingHref } from '@/navigation/test-routes';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { testAdministrationStyles as styles } from '@/styles/screens/tests/test-administration.styles';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestReadyScreen() {
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

  const calibrationMatches = Boolean(
    dataset &&
      patientId &&
      test &&
      dataset.patientId === patientId &&
      dataset.testId === test.id &&
      dataset.mode === mode &&
      dataset.batteryIndex === batteryIndex &&
      dataset.points.length === 9,
  );

  const openMapping = () => {
    if (!calibrationMatches || !patientId || !test || !calibrationId) return;

    router.push(
      testMappingHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>HIỆU CHỈNH</Text>
          <Text style={styles.heroTitle}>Hiệu chỉnh hoàn tất</Text>
          <Text style={styles.heroSubtitle}>{test?.nameVi ?? 'Bài kiểm tra'}</Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {calibrationMatches ? 'SẴN SÀNG' : 'CẦN HIỆU CHỈNH LẠI'}
            </Text>
          </View>

          <Text style={styles.readyTitle}>
            {calibrationMatches ? 'Đã ghi nhận đủ 9 điểm' : 'Dữ liệu hiệu chỉnh chưa đầy đủ'}
          </Text>
          <Text style={styles.readyBody}>
            {calibrationMatches
              ? 'Ứng dụng sẽ tự xử lý dữ liệu hiệu chỉnh trước khi bắt đầu bài kiểm tra.'
              : 'Hãy quay lại và thực hiện lại hiệu chỉnh.'}
          </Text>

          <Pressable
            disabled={!calibrationMatches}
            onPress={openMapping}
            style={({ pressed }) => [
              styles.button,
              !calibrationMatches && styles.disabled,
              pressed && calibrationMatches && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>TIẾP TỤC</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>HIỆU CHỈNH LẠI</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
