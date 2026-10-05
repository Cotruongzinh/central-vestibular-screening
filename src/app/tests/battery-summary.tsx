import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { FULL_BATTERY_TESTS } from '@/constants/clinical-tests';
import {
  getFullBatteryErrorMessage,
  getFullBatteryRunWithSessions,
} from '@/services/full-battery.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { getPatientById } from '@/services/patient.service';
import { getNormativeReferenceSetting } from '@/services/normative-reference.service';
import {
  ageAtTimestamp,
  assessSessionAgainstReference,
  buildBatteryScreeningAssessment,
} from '@/services/normative-assessment.service';
import type { NormativeReferencePopulationId } from '@/types/normative-reference';
import { batteryStyles as styles } from '@/styles/screens/tests/battery.styles';
import type { FullBatteryRunWithSessions } from '@/types/full-battery';
import { AIIntegratedAssistCard } from '@/components/ai/AIIntegratedAssistCard';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatSeconds(value: number): string {
  return `${Math.max(0, value).toFixed(1)} giây`;
}

export default function BatterySummaryScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const batteryRunId = firstParam(params.batteryRunId as string | string[] | undefined);

  const [run, setRun] = useState<FullBatteryRunWithSessions | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [populationId, setPopulationId] =
    useState<NormativeReferencePopulationId>('adult_western');

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

        const loaded = await getFullBatteryRunWithSessions(user.uid, batteryRunId);
        if (active) {
          if (!loaded || loaded.patientId !== patientId) {
            setErrorMessage('Không tìm thấy bộ 6 bài đã lưu.');
          } else {
            const [patient, referenceSetting] = await Promise.all([
              getPatientById(user.uid, loaded.patientId),
              getNormativeReferenceSetting(),
            ]);
            setRun(loaded);
            setPopulationId(referenceSetting.populationId);
            setAgeYears(
              patient?.isAnonymous
                ? null
                : ageAtTimestamp(
                    patient?.payload.dateOfBirth ?? '',
                    loaded.completedAt ?? Date.now(),
                  ),
            );
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

  const aggregate = useMemo(() => {
    if (!run) {
      return {
        totalSamples: 0,
        meanGreenRatio: 0,
        meanUsableRatio: 0,
        activeDurationMs: 0,
      };
    }

    const sessions = run.sessions;
    const count = Math.max(1, sessions.length);
    return {
      totalSamples: sessions.reduce((sum, session) => sum + session.traceSampleCount, 0),
      meanGreenRatio:
        sessions.reduce((sum, session) => sum + session.result.quality.greenRatio, 0) / count,
      meanUsableRatio:
        sessions.reduce((sum, session) => sum + session.result.quality.usableRatio, 0) / count,
      activeDurationMs: sessions.reduce(
        (sum, session) => sum + Math.max(0, session.completedAt - session.startedAt),
        0,
      ),
    };
  }, [run]);

  const entriesByIndex = useMemo(() => {
    const map = new Map<number, FullBatteryRunWithSessions['entries'][number]>();
    run?.entries.forEach((entry) => map.set(entry.batteryIndex, entry));
    return map;
  }, [run]);

  const complete = run?.status === 'completed' && run.completedCount === FULL_BATTERY_TESTS.length;

  const referenceAssessments = useMemo(
    () =>
      run?.sessions.map((session) =>
        assessSessionAgainstReference({
          session,
          populationId,
          ageYears,
        }),
      ) ?? [],
    [ageYears, populationId, run],
  );

  const screeningAssessment = useMemo(
    () => buildBatteryScreeningAssessment(referenceAssessments),
    [referenceAssessments],
  );

  const assessmentByTestId = useMemo(
    () => new Map(referenceAssessments.map((item) => [item.testId, item])),
    [referenceAssessments],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>KẾT QUẢ BỘ KIỂM TRA</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Tổng kết bộ kiểm tra đầy đủ</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Tổng hợp kết quả 6 bài kiểm tra và phân loại hỗ trợ bằng AI.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip
            items={[
              { requirement: 'FR-24', value: 'Đối chiếu dữ liệu tham chiếu + cờ màu' },
              { requirement: 'FR-25', value: 'Tóm tắt kết quả ngay sau bộ kiểm tra' },
            ]}
          />

          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>
              {complete ? 'BỘ KIỂM TRA ĐÃ HOÀN TẤT' : 'BỘ KIỂM TRA CHƯA HOÀN TẤT'}
            </LocalizedPipelineText>
          </View>

          {loading ? <LocalizedPipelineText language={language} style={styles.loading}>Đang tổng hợp sáu phiên kiểm tra...</LocalizedPipelineText> : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Không thể tạo tổng kết bộ 6 bài</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {run ? (
            <>
              <LocalizedPipelineText language={language} style={styles.title}>Kết quả tổng hợp</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.body}>Mã kiểm tra: {run.id.slice(-8).toUpperCase()}</LocalizedPipelineText>

              <View style={styles.progressCard}>
                <LocalizedPipelineText language={language} style={styles.progressEyebrow}>BỘ KIỂM TRA ĐẦY ĐỦ</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.progressValue}>{run.completedCount}/6 HOÀN TẤT</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.progressMeta}>
                  {complete
                    ? '6 bài đã hoàn tất và được lưu trong cùng một lần kiểm tra.'
                    : 'Bộ kiểm tra chưa đủ sáu bài; phần tổng kết chỉ hiển thị dữ liệu hiện có.'}
                </LocalizedPipelineText>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <LocalizedPipelineText language={language} style={styles.summaryLabel}>Tổng thời gian kiểm tra thực tế</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.summaryValue}>
                    {formatSeconds(aggregate.activeDurationMs / 1000)}
                  </LocalizedPipelineText>
                </View>
                <View style={styles.summaryRow}>
                  <LocalizedPipelineText language={language} style={styles.summaryLabel}>Số mẫu theo dõi mắt đã lưu</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.summaryValue}>{aggregate.totalSamples}</LocalizedPipelineText>
                </View>
                <View style={styles.summaryRow}>
                  <LocalizedPipelineText language={language} style={styles.summaryLabel}>Tín hiệu sử dụng được trung bình</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.summaryValue}>
                    {(aggregate.meanUsableRatio * 100).toFixed(1)}%
                  </LocalizedPipelineText>
                </View>
                <View style={styles.summaryRowLast}>
                  <LocalizedPipelineText language={language} style={styles.summaryLabel}>Tỷ lệ theo dõi tốt trung bình</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.summaryValue}>
                    {(aggregate.meanGreenRatio * 100).toFixed(1)}%
                  </LocalizedPipelineText>
                </View>
              </View>

              <View
                style={[
                  styles.screeningCard,
                  screeningAssessment.flag === 'green'
                    ? styles.screeningGreen
                    : screeningAssessment.flag === 'red'
                      ? styles.screeningRed
                      : styles.screeningYellow,
                ]}
              >
                <LocalizedPipelineText language={language} style={styles.screeningEyebrow}>
{language === 'vi'
                    ? 'TÓM TẮT THAM CHIẾU'
                    : 'REFERENCE SUMMARY'}
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.screeningTitle}>
                  {language === 'vi' ? screeningAssessment.titleVi : screeningAssessment.titleEn}
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.screeningBody}>
                  {language === 'vi' ? screeningAssessment.summaryVi : screeningAssessment.summaryEn}
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.screeningMeta}>
{language === 'vi'
                    ? `Đánh giá được ${screeningAssessment.evaluableTests}/6 bài · lệch tham chiếu ${screeningAssessment.deviationTests} · hạn chế ${screeningAssessment.limitedTests}`
                    : `Evaluable ${screeningAssessment.evaluableTests}/6 · reference deviations ${screeningAssessment.deviationTests} · limited ${screeningAssessment.limitedTests}`}
                </LocalizedPipelineText>
              </View>

              <LocalizedPipelineText language={language} style={styles.sectionTitle}>Kết quả từng bài</LocalizedPipelineText>
              {FULL_BATTERY_TESTS.map((test, index) => {
                const entry = entriesByIndex.get(index);
                return (
                  <View key={test.id} style={[styles.testCard, entry && styles.testCardDone]}>
                    <View style={styles.testRow}>
                      <LocalizedPipelineText language={language} style={styles.testIndex}>{index + 1}.</LocalizedPipelineText>
                      <View style={styles.testTextWrap}>
                        <LocalizedPipelineText language={language} style={styles.testName}>{test.nameVi}</LocalizedPipelineText>
                        <LocalizedPipelineText language={language} style={styles.testMeta}>
                          {entry
                            ? `${entry.headlineLabel}: ${entry.headlineValue} · tín hiệu tốt ${(entry.greenRatio * 100).toFixed(1)}% · ${assessmentByTestId.get(test.id)?.flag === 'green' ? 'trong tham chiếu' : assessmentByTestId.get(test.id)?.flag === 'red' ? 'lệch tham chiếu' : 'cần theo dõi'}`
                            : 'Chưa có phiên kiểm tra trong lần chạy này'}
                        </LocalizedPipelineText>
                      </View>
                      <LocalizedPipelineText language={language} style={entry ? styles.statusDone : styles.statusPending}>
                        {entry ? 'XONG' : 'CHƯA CÓ'}
                      </LocalizedPipelineText>
                    </View>
                  </View>
                );
              })}

              <Pressable
                onPress={() =>
                  router.replace({
                    pathname: '/patients/[id]',
                    params: { id: run.patientId },
                  } as never)
                }
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>VỀ HỒ SƠ BỆNH NHÂN</LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          <LocalizedPipelineText language={language} style={styles.footnote}>
            Kết quả và phiên kiểm tra được lưu trên thiết bị.
          </LocalizedPipelineText>
        </View>
              {complete && run ? <AIIntegratedAssistCard sessions={run.sessions} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
