import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { testReplayHref, testReportHref, testTrendsHref } from '@/navigation/test-routes';
import { getPersistedTestSession } from '@/services/test-session.service';
import { getPatientById } from '@/services/patient.service';
import { getNormativeReferenceSetting } from '@/services/normative-reference.service';
import {
  ageAtTimestamp,
  assessSessionAgainstReference,
} from '@/services/normative-assessment.service';
import type { NormativeReferencePopulationId } from '@/types/normative-reference';
import { sessionPersistenceStyles as styles } from '@/styles/screens/tests/session-persistence.styles';
import type { PersistedTestSession } from '@/types/test-session';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('vi-VN');
}

export default function SessionDetailScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const sessionId = firstParam(params.sessionId as string | string[] | undefined);

  const [session, setSession] = useState<PersistedTestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [populationId, setPopulationId] =
    useState<NormativeReferencePopulationId>('adult_western');

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified || !sessionId) {
        if (active) {
          setErrorMessage('Không thể mở phiên đã lưu.');
          setLoading(false);
        }
        return;
      }

      try {
        const stored = await getPersistedTestSession(user.uid, sessionId);
        if (!stored || (patientId && stored.patientId !== patientId)) {
          throw new Error('SESSION_NOT_FOUND');
        }

        const [patient, referenceSetting] = await Promise.all([
          getPatientById(user.uid, stored.patientId),
          getNormativeReferenceSetting(),
        ]);

        if (active) {
          setSession(stored);
          setPopulationId(referenceSetting.populationId);
          setAgeYears(
            patient?.isAnonymous
              ? null
              : ageAtTimestamp(patient?.payload.dateOfBirth ?? '', stored.completedAt),
          );
        }
      } catch {
        if (active) {
          setErrorMessage('Không tìm thấy phiên kiểm tra trên thiết bị.');
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
  }, [patientId, sessionId]);

  const test = session && isClinicalTestId(session.testId)
    ? getClinicalTest(session.testId)
    : undefined;

  const referenceAssessment = session
    ? assessSessionAgainstReference({
        session,
        populationId,
        ageYears,
      })
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}>LỊCH SỬ KIỂM TRA</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Chi tiết phiên kiểm tra</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Xem lại kết quả đã lưu trên thiết bị.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip
            items={[{ requirement: 'FR-25', value: 'Kết quả + diễn giải tham chiếu' }]}
          />

          <View style={[styles.badge, Boolean(errorMessage) && styles.badgeError]}>
            <LocalizedPipelineText language={language} style={[styles.badgeText, Boolean(errorMessage) && styles.badgeTextError]}>
              {session ? 'ĐÃ LƯU' : errorMessage ? 'KHÔNG TÌM THẤY' : 'ĐANG TẢI'}
            </LocalizedPipelineText>
          </View>

          {loading ? <LocalizedPipelineText language={language} style={styles.loading}>Đang tải phiên kiểm tra...</LocalizedPipelineText> : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Không mở được phiên</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {session ? (
            <>
              <LocalizedPipelineText language={language} style={styles.title}>{test?.nameVi ?? session.testId}</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.body}>Hoàn tất: {formatDate(session.completedAt)}</LocalizedPipelineText>

              <View style={styles.primaryCard}>
                <LocalizedPipelineText language={language} style={styles.eyebrow}>{session.result.headlineLabel.toUpperCase()}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headline}>{session.result.headlineValue}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.headlineLabel}>tóm tắt kết quả</LocalizedPipelineText>
              </View>

              <View style={styles.infoCard}>
                {session.result.details.map((item, index) => (
                  <View
                    key={`${item.label}-${index}`}
                    style={index === session.result.details.length - 1 ? styles.rowLast : styles.row}
                  >
                    <LocalizedPipelineText language={language} style={styles.rowLabel}>{item.label}</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.rowValue}>{item.value}</LocalizedPipelineText>
                  </View>
                ))}
              </View>

              <View style={styles.infoCard}>
                <View style={styles.row}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Tín hiệu sử dụng được</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>
                    {(session.result.quality.usableRatio * 100).toFixed(1)}% · {session.result.quality.usableSamples}/{session.result.quality.totalSamples}
                  </LocalizedPipelineText>
                </View>
                <View style={styles.row}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Tỷ lệ theo dõi tốt</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>{(session.result.quality.greenRatio * 100).toFixed(1)}%</LocalizedPipelineText>
                </View>
                <View style={styles.rowLast}>
                  <LocalizedPipelineText language={language} style={styles.rowLabel}>Dữ liệu theo dõi mắt đã lưu</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.rowValue}>{session.traceSampleCount} mẫu</LocalizedPipelineText>
                </View>
              </View>

              {referenceAssessment ? (
                <View
                  style={[
                    styles.referenceBox,
                    referenceAssessment.flag === 'green'
                      ? styles.referenceGreen
                      : referenceAssessment.flag === 'red'
                        ? styles.referenceRed
                        : styles.referenceYellow,
                  ]}
                >
                  <LocalizedPipelineText language={language} style={styles.referenceEyebrow}>
                    {language === 'vi'
                      ? `${referenceAssessment.flag === 'green' ? 'TRONG THAM CHIẾU' : referenceAssessment.flag === 'red' ? 'LỆCH THAM CHIẾU' : 'CẦN XEM XÉT'}`
                      : `${referenceAssessment.flag === 'green' ? 'WITHIN REFERENCE' : referenceAssessment.flag === 'red' ? 'REFERENCE DEVIATION' : 'REVIEW'}`}
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.referenceTitle}>
                    {language === 'vi' ? referenceAssessment.titleVi : referenceAssessment.titleEn}
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.referenceBody}>
                    {language === 'vi' ? referenceAssessment.summaryVi : referenceAssessment.summaryEn}
                  </LocalizedPipelineText>

                  {referenceAssessment.metrics.map((metric) => (
                    <View key={metric.id} style={styles.referenceMetricRow}>
                      <LocalizedPipelineText language={language} style={styles.referenceMetricLabel}>
                        {language === 'vi' ? metric.labelVi : metric.labelEn}
                      </LocalizedPipelineText>
                      <LocalizedPipelineText language={language} style={styles.referenceMetricValue}>
                        {metric.formattedValue} · ref {metric.referenceText}
                      </LocalizedPipelineText>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                onPress={() =>
                  router.push(testReportHref(session.patientId, session.id))
                }
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>BÁO CÁO PDF</LocalizedPipelineText>
              </Pressable>

              <Pressable
                onPress={() => router.push(testTrendsHref(session.patientId, session.testId))}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryText}>SO SÁNH CÙNG BÀI</LocalizedPipelineText>
              </Pressable>

              <Pressable
                onPress={() => router.push(testReplayHref(session.patientId, session.id))}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryText}>PHÁT LẠI DỮ LIỆU MẮT</LocalizedPipelineText>
              </Pressable>

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

          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryText}>VỀ TRANG ĐẦU</LocalizedPipelineText>
          </Pressable>

          <LocalizedPipelineText language={language} style={styles.footnote}>
            Kết quả, báo cáo và dữ liệu mắt đã xử lý được lưu trên thiết bị.
          </LocalizedPipelineText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
