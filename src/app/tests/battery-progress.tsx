import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { FULL_BATTERY_TESTS } from '@/constants/clinical-tests';
import {
  testBatterySummaryHref,
  testInstructionsHref,
} from '@/navigation/test-routes';
import {
  getFullBatteryErrorMessage,
  getFullBatteryRun,
} from '@/services/full-battery.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { batteryStyles as styles } from '@/styles/screens/tests/battery.styles';
import type { FullBatteryRun } from '@/types/full-battery';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function BatteryProgressScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const batteryRunId = firstParam(params.batteryRunId as string | string[] | undefined);

  const [run, setRun] = useState<FullBatteryRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified || !patientId || !batteryRunId) {
          if (active) {
            setErrorMessage('Thiếu phiên làm việc hoặc thông tin bộ 6 bài.');
          }
          return;
        }

        const loaded = await getFullBatteryRun(user.uid, batteryRunId);
        if (active) {
          if (!loaded || loaded.patientId !== patientId) {
            setErrorMessage('Không tìm thấy bộ 6 bài đã lưu.');
          } else {
            setRun(loaded);
          }
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getFullBatteryErrorMessage(error));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [batteryRunId, patientId]);

  const entriesByIndex = useMemo(() => {
    const map = new Map<number, FullBatteryRun['entries'][number]>();
    run?.entries.forEach((entry) => map.set(entry.batteryIndex, entry));
    return map;
  }, [run]);

  const nextIndex = run ? Math.min(run.completedCount, FULL_BATTERY_TESTS.length) : 0;
  const nextTest = nextIndex < FULL_BATTERY_TESTS.length ? FULL_BATTERY_TESTS[nextIndex] : undefined;
  const complete = run?.status === 'completed' && run.completedCount >= FULL_BATTERY_TESTS.length;

  function continueBattery() {
    if (!run || !patientId) {
      return;
    }

    if (complete) {
      router.replace(testBatterySummaryHref(patientId, run.id));
      return;
    }

    if (!nextTest) {
      return;
    }

    router.replace(
      testInstructionsHref({
        patientId,
        testId: nextTest.id,
        mode: 'battery',
        batteryIndex: nextIndex,
      }),
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>KẾT QUẢ KIỂM TRA · BỘ KIỂM TRA ĐẦY ĐỦ</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Tiến độ 6 bài kiểm tra</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Bài 1 dùng quy trình đầy đủ. Bài 2–6 dùng quy trình nhanh 03L: hướng dẫn → hiệu chỉnh 5 điểm + ánh xạ/kiểm tra tự động → kích thích thị giác → chỉ số → lưu.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>{complete ? 'BỘ 6 BÀI HOÀN TẤT' : 'BỘ 6 BÀI ĐANG CHẠY'}</LocalizedPipelineText>
          </View>

          {loading ? <LocalizedPipelineText language={language} style={styles.loading}>Đang tải tiến độ bộ 6 bài...</LocalizedPipelineText> : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Không thể mở tiến độ</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {run ? (
            <>
              <View style={styles.progressCard}>
                <LocalizedPipelineText language={language} style={styles.progressEyebrow}>TIẾN ĐỘ BỘ 6 BÀI</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.progressValue}>{run.completedCount}/6</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.progressMeta}>
                  {complete
                    ? 'Đã hoàn tất và lưu đủ 6 bài kiểm tra.'
                    : `Tiếp theo: ${nextTest?.nameVi ?? 'đang xác định'}`}
                </LocalizedPipelineText>
              </View>

              <LocalizedPipelineText language={language} style={styles.sectionTitle}>Các bài trong bộ kiểm tra</LocalizedPipelineText>
              {FULL_BATTERY_TESTS.map((test, index) => {
                const entry = entriesByIndex.get(index);
                const isNext = !complete && index === nextIndex;
                const status = entry ? 'HOÀN TẤT' : isNext ? 'TIẾP THEO' : 'CHỜ';

                return (
                  <View
                    key={test.id}
                    style={[
                      styles.testCard,
                      entry && styles.testCardDone,
                      isNext && styles.testCardNext,
                    ]}
                  >
                    <View style={styles.testRow}>
                      <LocalizedPipelineText language={language} style={styles.testIndex}>{index + 1}.</LocalizedPipelineText>
                      <View style={styles.testTextWrap}>
                        <LocalizedPipelineText language={language} style={styles.testName}>{test.nameVi}</LocalizedPipelineText>
                        <LocalizedPipelineText language={language} style={styles.testMeta}>
                          {entry
                            ? `${entry.headlineLabel}: ${entry.headlineValue}`
                            : test.durationLabel}
                        </LocalizedPipelineText>
                      </View>
                      <LocalizedPipelineText language={language}
                        style={
                          entry
                            ? styles.statusDone
                            : isNext
                              ? styles.statusNext
                              : styles.statusPending
                        }
                      >
                        {status}
                      </LocalizedPipelineText>
                    </View>
                  </View>
                );
              })}

              <View style={styles.infoBox}>
                <LocalizedPipelineText language={language} style={styles.infoTitle}>Bộ kiểm tra đầy đủ</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.infoBody}>
                  Bài đầu dùng hiệu chỉnh đầy đủ; các bài tiếp theo dùng hiệu chỉnh nhanh trước khi bắt đầu.
                </LocalizedPipelineText>
              </View>

              <Pressable
                onPress={continueBattery}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>
                  {complete
                    ? 'XEM TỔNG KẾT 6 BÀI'
                    : nextIndex === 0
                      ? 'MỞ HƯỚNG DẪN BÀI 1/6 · QUY TRÌNH ĐẦY ĐỦ'
                      : `MỞ TEST ${nextIndex + 1}/6 · TIẾP TỤC`}
                </LocalizedPipelineText>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.replace({
                    pathname: '/patients/[id]',
                    params: { id: run.patientId },
                  } as never)
                }
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryText}>VỀ HỒ SƠ BỆNH NHÂN</LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          <LocalizedPipelineText language={language} style={styles.footnote}>
            Nếu bắt đầu bộ 6 bài mới từ bài 1, lần chạy đang dở trước đó sẽ được đóng ở trạng thái đã hủy để tránh trộn dữ liệu của hai lần chạy.
          </LocalizedPipelineText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
