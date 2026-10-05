import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { FULL_BATTERY_TESTS, getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { buildUnifiedTechnicalResult } from '@/results/unified-result';
import {
  testBatteryProgressHref,
  testBatterySummaryHref,
  testInstructionsHref,
  testStoredSessionHref,
} from '@/navigation/test-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getFullBatteryErrorMessage,
  recordCompletedBatteryTest,
} from '@/services/full-battery.service';
import {
  getTestSessionErrorMessage,
  persistCompletedTestSession,
} from '@/services/test-session.service';
import {
  ensureTrainingMode,
  isTrainingPatientId,
  stopTrainingMode,
} from '@/services/training-mode.service';
import { sessionPersistenceStyles as styles } from '@/styles/screens/tests/session-persistence.styles';
import { getEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { getSmoothPursuitMetrics } from '@/tracking/signal/metrics-store';
import { getNystagmusMetrics } from '@/tracking/signal/nystagmus-metrics-store';
import { getSaccadeMetrics } from '@/tracking/signal/saccade-metrics-store';
import type { FullBatteryRun } from '@/types/full-battery';
import type { UnifiedMetricSource } from '@/results/unified-result';
import type { PersistedTestSession, UnifiedTechnicalResult } from '@/types/test-session';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveMetric(testId: string | undefined, metricsId: string | undefined): UnifiedMetricSource | undefined {
  if (!metricsId) {
    return undefined;
  }

  if (testId === 'smooth-pursuit') {
    return getSmoothPursuitMetrics(metricsId);
  }

  if (
    testId === 'horizontal-saccades' ||
    testId === 'vertical-saccades' ||
    testId === 'anti-saccade'
  ) {
    return getSaccadeMetrics(metricsId);
  }

  if (testId === 'gaze-evoked-nystagmus' || testId === 'okn') {
    return getNystagmusMetrics(metricsId);
  }

  return undefined;
}

export default function SessionSaveScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const traceId = firstParam(params.traceId as string | string[] | undefined);
  const metricsId = firstParam(params.metricsId as string | string[] | undefined);

  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const trace = getEyeTrace(traceId);
  const metric = resolveMetric(testIdParam, metricsId);

  const [saving, setSaving] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [batteryError, setBatteryError] = useState('');
  const [session, setSession] = useState<PersistedTestSession | null>(null);
  const [batteryRun, setBatteryRun] = useState<FullBatteryRun | null>(null);
  const [trainingResult, setTrainingResult] = useState<UnifiedTechnicalResult | null>(null);
  const trainingMode = isTrainingPatientId(patientId);

  const contextReady = useMemo(
    () =>
      Boolean(
        patientId &&
          test &&
          trace &&
          metric &&
          trace.patientId === patientId &&
          trace.testId === test.id &&
          metric.patientId === patientId &&
          metric.testId === test.id &&
          metric.traceId === trace.id,
      ),
    [metric, patientId, test, trace],
  );

  useEffect(() => {
    let active = true;

    async function save() {
      if (!contextReady || !trace || !metric) {
        if (active) {
          setErrorMessage('Thiếu dữ liệu theo dõi mắt hoặc chỉ số của phiên hiện tại.');
          setSaving(false);
        }
        return;
      }

      if (trainingMode) {
        ensureTrainingMode();
        try {
          const result = buildUnifiedTechnicalResult(trace, metric);
          if (active) {
            setTrainingResult(result);
            setSaving(false);
          }
        } catch {
          if (active) {
            setErrorMessage('Không thể tạo tóm tắt kỹ thuật cho lần chạy đào tạo.');
            setSaving(false);
          }
        }
        return;
      }

      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        if (active) {
          setErrorMessage('Cần phiên làm việc đã xác minh để lưu dữ liệu bệnh nhân.');
          setSaving(false);
        }
        return;
      }

      try {
        const persisted = await persistCompletedTestSession({
          clinicianUid: user.uid,
          trace,
          metric,
        });

        if (active) {
          setSession(persisted);
        }

        if (trace.mode === 'battery') {
          try {
            const run = await recordCompletedBatteryTest({
              clinicianUid: user.uid,
              batteryIndex: trace.batteryIndex,
              session: persisted,
            });
            if (active) {
              setBatteryRun(run);
            }
          } catch (batteryFailure) {
            if (active) {
              setBatteryError(getFullBatteryErrorMessage(batteryFailure));
            }
          }
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getTestSessionErrorMessage(error));
        }
      } finally {
        if (active) {
          setSaving(false);
        }
      }
    }

    void save();

    return () => {
      active = false;
    };
  }, [contextReady, metric, trace, trainingMode]);

  const batteryComplete =
    batteryRun?.status === 'completed' &&
    batteryRun.completedCount >= FULL_BATTERY_TESTS.length;

  const nextBatteryIndex = batteryRun
    ? Math.min(batteryRun.completedCount, FULL_BATTERY_TESTS.length)
    : 0;
  const nextBatteryTest =
    nextBatteryIndex < FULL_BATTERY_TESTS.length
      ? FULL_BATTERY_TESTS[nextBatteryIndex]
      : undefined;

  const continueBatteryDirectly = () => {
    if (!session || !batteryRun) {
      return;
    }

    if (batteryComplete) {
      router.replace(testBatterySummaryHref(session.patientId, batteryRun.id));
      return;
    }

    if (!nextBatteryTest) {
      router.replace(testBatteryProgressHref(session.patientId, batteryRun.id));
      return;
    }

    router.replace(
      testInstructionsHref({
        patientId: session.patientId,
        testId: nextBatteryTest.id,
        mode: 'battery',
        batteryIndex: nextBatteryIndex,
      }),
    );
  };

  const trainingNextIndex = trace?.mode === 'battery'
    ? Math.min(trace.batteryIndex + 1, FULL_BATTERY_TESTS.length)
    : 0;
  const trainingNextTest = trainingNextIndex < FULL_BATTERY_TESTS.length
    ? FULL_BATTERY_TESTS[trainingNextIndex]
    : undefined;
  const trainingBatteryComplete = Boolean(
    trainingMode && trace?.mode === 'battery' && !trainingNextTest,
  );

  const continueTraining = () => {
    if (!trainingMode || !trace) {
      return;
    }

    if (trace.mode === 'battery' && trainingNextTest) {
      router.replace(
        testInstructionsHref({
          patientId: trace.patientId,
          testId: trainingNextTest.id,
          mode: 'battery',
          batteryIndex: trainingNextIndex,
        }),
      );
      return;
    }

    stopTrainingMode();
    router.replace('/auth/session');
  };

  const chooseAnotherTrainingTest = () => {
    if (!trainingMode || !trace) {
      return;
    }

    ensureTrainingMode();
    router.replace({
      pathname: '/tests/select',
      params: { patientId: trace.patientId },
    } as never);
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>
            {trainingMode ? 'ĐÀO TẠO · KHÔNG LƯU' : 'LƯU KẾT QUẢ'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>
            {trainingMode ? 'Kết quả đào tạo' : 'Hoàn tất bài kiểm tra'}
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            {trainingMode
              ? 'Kết quả chỉ dùng trong phiên đào tạo và không được lưu vào hồ sơ bệnh nhân.'
              : 'Kết quả sẽ được lưu vào hồ sơ bệnh nhân.'}
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={[styles.badge, Boolean(errorMessage) && styles.badgeError]}>
            <LocalizedPipelineText language={language} style={[styles.badgeText, Boolean(errorMessage) && styles.badgeTextError]}>
              {trainingResult
                ? 'ĐÀO TẠO · KHÔNG LƯU'
                : session
                  ? 'ĐÃ LƯU'
                  : errorMessage
                    ? trainingMode ? 'KHÔNG THỂ HOÀN TẤT' : 'LƯU KHÔNG THÀNH CÔNG'
                    : trainingMode ? 'ĐANG TỔNG HỢP' : 'ĐANG LƯU'}
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>{test?.nameVi ?? 'Test không xác định'}</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            {trainingMode ? 'Chế độ đào tạo' : `Hồ sơ/ca: ${patientId ?? 'không xác định'}`}
          </LocalizedPipelineText>

          {saving ? (
            <LocalizedPipelineText language={language} style={styles.loading}>
              {trainingMode ? 'Đang tổng hợp kết quả...' : 'Đang lưu kết quả...'}
            </LocalizedPipelineText>
          ) : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Không thể lưu phiên</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {trainingResult ? (
            <>
              <View style={styles.primaryCard}>
                <LocalizedPipelineText language={language} style={styles.eyebrow}>{trainingResult.headlineLabel.toUpperCase()}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headline}>{trainingResult.headlineValue}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headlineLabel}>
                  Kết quả đào tạo
                </LocalizedPipelineText>
              </View>

              <View style={styles.infoCard}>
                {trainingResult.details.map((item, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    style={index === trainingResult.details.length - 1 ? styles.rowLast : styles.row}
                  >
                    <LocalizedPipelineText language={language} style={styles.rowLabel}>{item.label}</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.rowValue}>{item.value}</LocalizedPipelineText>
                  </View>
                ))}
              </View>

              <View style={styles.infoBox}>
                <LocalizedPipelineText language={language} style={styles.infoTitle}>KHÔNG LƯU VÀO HỒ SƠ</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.infoBody}>
                  Kết quả đào tạo chỉ tồn tại trong phiên hiện tại.
                </LocalizedPipelineText>
              </View>

              {trace?.mode === 'battery' ? (
                <View style={styles.infoBox}>
                  <LocalizedPipelineText language={language} style={styles.infoTitle}>BỘ 6 BÀI ĐÀO TẠO</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.infoBody}>
                    {trainingBatteryComplete
                      ? 'Đã hoàn tất bài 6/6 trong bộ kiểm tra đào tạo. Không có bộ kiểm tra hoặc phiên nào được lưu.'
                      : `Đã hoàn tất test ${trace.batteryIndex + 1}/6 trong memory. Test kế tiếp: ${trainingNextTest?.nameVi ?? '—'}.`}
                  </LocalizedPipelineText>
                </View>
              ) : null}

              <Pressable
                onPress={continueTraining}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>
                  {trace?.mode === 'battery' && trainingNextTest
                    ? `TIẾP TỤC TRAINING TEST ${trainingNextIndex + 1}/6 · ${trainingNextTest.shortName.toUpperCase()}`
                    : 'KẾT THÚC ĐÀO TẠO · KHÔNG LƯU'}
                </LocalizedPipelineText>
              </Pressable>

              <Pressable
                onPress={chooseAnotherTrainingTest}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryText}>CHỌN BÀI ĐÀO TẠO KHÁC</LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          {session ? (
            <>
              <View style={styles.primaryCard}>
                <LocalizedPipelineText language={language} style={styles.eyebrow}>{session.result.headlineLabel.toUpperCase()}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headline}>{session.result.headlineValue}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headlineLabel}>
                  Kết quả
                </LocalizedPipelineText>
              </View>

              <View style={styles.infoCard}>
                <View style={styles.row}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Trạng thái</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>{session.id}</LocalizedPipelineText>
                </View>
                <View style={styles.row}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Lưu trữ trên thiết bị</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>Đã lưu an toàn</LocalizedPipelineText>
                </View>
                <View style={styles.row}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Dữ liệu bài kiểm tra</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>{session.traceSampleCount} mẫu</LocalizedPipelineText>
                </View>
                <View style={styles.rowLast}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Trạng thái lịch sử</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>ĐÃ LƯU VÀO HỒ SƠ</LocalizedPipelineText>
                </View>
              </View>

              {trace?.mode === 'battery' ? (
                <View style={styles.infoBox}>
                  <LocalizedPipelineText language={language} style={styles.infoTitle}>BỘ KIỂM TRA ĐÃ HOÀN TẤT</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.infoBody}>
                    {batteryRun
                      ? `Đã ghi nhận ${batteryRun.completedCount}/${FULL_BATTERY_TESTS.length} test trong battery run ${batteryRun.id}.`
                      : 'Phiên đã được lưu; đang chờ liên kết với bộ kiểm tra đầy đủ.'}
                  </LocalizedPipelineText>
                </View>
              ) : (
                <View style={styles.infoBox}>
                  <LocalizedPipelineText language={language} style={styles.infoTitle}>ĐÃ LƯU KẾT QUẢ</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.infoBody}>
                    Kết quả đã được lưu vào hồ sơ bệnh nhân trên thiết bị.
                  </LocalizedPipelineText>
                </View>
              )}

              {batteryError ? (
                <View style={styles.warningBox}>
                  <LocalizedPipelineText language={language} style={styles.warningTitle}>Phiên đã lưu nhưng tiến độ bộ 6 bài chưa cập nhật</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.warningBody}>{batteryError}</LocalizedPipelineText>
                </View>
              ) : null}

              {trace?.mode === 'battery' && batteryRun ? (
                <Pressable
                  onPress={continueBatteryDirectly}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <LocalizedPipelineText language={language} style={styles.buttonText}>
                    {batteryComplete
                      ? 'XEM TỔNG KẾT BỘ 6 BÀI · 6/6'
                      : nextBatteryTest
                        ? `TIẾP TỤC TEST ${nextBatteryIndex + 1}/6 · ${nextBatteryTest.shortName.toUpperCase()}`
                        : 'MỞ TIẾN ĐỘ BỘ 6 BÀI'}
                  </LocalizedPipelineText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push(testStoredSessionHref(session.patientId, session.id))}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <LocalizedPipelineText language={language} style={styles.buttonText}>MỞ PHIÊN ĐÃ LƯU</LocalizedPipelineText>
                </Pressable>
              )}

              {trace?.mode === 'battery' && batteryRun ? (
                <>
                  {!batteryComplete ? (
                    <Pressable
                      onPress={() =>
                        router.push(testBatteryProgressHref(session.patientId, batteryRun.id))
                      }
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    >
                      <LocalizedPipelineText language={language} style={styles.secondaryText}>XEM TIẾN ĐỘ BỘ 6 BÀI</LocalizedPipelineText>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={() => router.push(testStoredSessionHref(session.patientId, session.id))}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <LocalizedPipelineText language={language} style={styles.secondaryText}>MỞ PHIÊN VỪA LƯU</LocalizedPipelineText>
                  </Pressable>
                </>
              ) : null}

              <Pressable
                onPress={() =>
                  router.replace({
                    pathname: '/patients/[id]',
                    params: { id: session.patientId },
                  } as never)
                }
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryText}>VỀ HỒ SƠ BỆNH NHÂN</LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          <LocalizedPipelineText language={language} style={styles.footnote}>
            {trainingMode
              ? 'Chế độ đào tạo không lưu kết quả vào hồ sơ bệnh nhân.'
              : 'Kết quả bài kiểm tra được lưu vào hồ sơ bệnh nhân.'}
          </LocalizedPipelineText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
