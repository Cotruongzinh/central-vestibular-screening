import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getLocalizedClinicalTest } from '@/i18n/clinical-test-copy';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import {
  testBatteryProgressHref,
  testBatterySummaryHref,
  testSelectHref,
  testStoredSessionHref,
  testTrendsHref,
} from '@/navigation/test-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { listPatientFullBatteryRuns } from '@/services/full-battery.service';
import {
  getPatientByIdForAccess,
  getPatientServiceErrorMessage,
  listPatientSessionsForAccess,
  softDeletePatientForAccess,
} from '@/services/patient.service';
import { styles } from '@/styles/screens/patients/detail.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { AppLanguage } from '@/types/app-language';
import type { FullBatteryRun } from '@/types/full-battery';
import type { PatientRecord, PatientSessionSummary } from '@/types/patient';

function readId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function sexLabel(value: PatientRecord['payload']['sex'], language: AppLanguage): string {
  if (language === 'en') {
    if (value === 'female') return 'Female';
    if (value === 'male') return 'Male';
    if (value === 'other') return 'Other';
    return 'Prefer not to specify';
  }
  if (value === 'female') return 'Nữ';
  if (value === 'male') return 'Nam';
  if (value === 'other') return 'Khác';
  return 'Không khai báo';
}

function formatDate(timestamp: number | null, language: AppLanguage, emptyLabel: string): string {
  if (!timestamp) return emptyLabel;
  return new Date(timestamp).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN');
}

function sessionTestLabel(testType: string, language: AppLanguage): string {
  if (!isClinicalTestId(testType)) return testType;
  const test = getClinicalTest(testType);
  return test ? getLocalizedClinicalTest(test, language).name : testType;
}

function sessionStatusLabel(status: string, language: AppLanguage): string {
  if (status === 'completed') return language === 'en' ? 'COMPLETED' : 'HOÀN TẤT';
  if (status === 'cancelled') return language === 'en' ? 'CANCELLED' : 'ĐÃ HỦY';
  return status.toUpperCase();
}

export default function PatientDetailScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getCoreFlowCopy(language), [language]);
  const t = copy.patientDetail;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = readId(params.id);

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [sessions, setSessions] = useState<PatientSessionSummary[]>([]);
  const [batteryRuns, setBatteryRuns] = useState<FullBatteryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified) {
          router.replace('/auth/login');
          return;
        }

        const nextAccess = await getClinicianAccessContext(user.uid, user.email ?? '');
        const record = await getPatientByIdForAccess(nextAccess, patientId);
        if (!record) throw new Error('PATIENT_ACCESS_DENIED');

        const [history, storedBatteryRuns] = await Promise.all([
          listPatientSessionsForAccess(nextAccess, patientId),
          listPatientFullBatteryRuns(record.clinicianUid, patientId),
        ]);

        if (active) {
          setAccess(nextAccess);
          setPatient(record);
          setSessions(history);
          setBatteryRuns(storedBatteryRuns);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (patientId) {
      void load();
    } else {
      setErrorMessage(t.missingPatient);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [language, patientId, t.loadError, t.missingPatient]);

  function confirmSoftDelete() {
    if (!patient) return;

    Alert.alert(t.deleteTitle, t.deleteBody, [
      { text: copy.common.cancel, style: 'cancel' },
      { text: t.deleteAction, style: 'destructive', onPress: () => void handleSoftDelete() },
    ]);
  }

  async function handleSoftDelete() {
    const user = getCurrentClinician();
    if (!user?.emailVerified || !patient) return;

    setDeleting(true);
    setErrorMessage('');

    try {
      const nextAccess = await getClinicianAccessContext(user.uid, user.email ?? '');
      await softDeletePatientForAccess(nextAccess, patient.id);
      router.replace('/patients');
    } catch (error) {
      setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const visibleSessions = showAllHistory ? sessions : sessions.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.brand}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.headerTitle}>{t.title}</Text>
              <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          {loading ? <Text style={styles.loading}>{t.loading}</Text> : null}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {patient ? (
            <>
              <View style={styles.topStatusRow}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{t.active}</Text>
                </View>

                {access ? (
                  <View style={styles.accessPill}>
                    <Text style={styles.accessPillText}>
                      {patient.clinicianUid === access.uid ? t.assignedSelf : t.assignedOther}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.name}>{patient.payload.fullName}</Text>
              <Text style={styles.localCode}>{t.recordCode}: {patient.localCode}</Text>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.patientId}</Text>
                  <Text style={styles.infoValue}>{patient.payload.patientId || copy.common.none}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.birthDate}</Text>
                  <Text style={styles.infoValue}>{patient.payload.dateOfBirth || copy.common.none}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t.sex}</Text>
                  <Text style={styles.infoValue}>{sexLabel(patient.payload.sex, language)}</Text>
                </View>
                <View style={styles.infoRowLast}>
                  <Text style={styles.infoLabel}>{t.updated}</Text>
                  <Text style={styles.infoValue}>{formatDate(patient.updatedAt, language, copy.common.notAvailable)}</Text>
                </View>
              </View>

              {patient.payload.clinicalNotes ? (
                <View style={styles.notesCard}>
                  <Text style={styles.notesTitle}>{t.notes}</Text>
                  <Text style={styles.notesBody}>{patient.payload.clinicalNotes}</Text>
                </View>
              ) : null}

              {batteryRuns.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>{t.fullBattery} ({batteryRuns.length})</Text>
                  {batteryRuns.map((run) => {
                    const completed = run.status === 'completed' && run.completedCount >= 6;
                    const status = completed
                      ? copy.common.completed
                      : run.status === 'cancelled'
                        ? copy.common.cancelled
                        : copy.common.inProgress;

                    return (
                      <Pressable
                        key={run.id}
                        accessibilityRole="button"
                        onPress={() =>
                          router.push(
                            completed
                              ? testBatterySummaryHref(patient.id, run.id)
                              : testBatteryProgressHref(patient.id, run.id),
                          )
                        }
                        style={({ pressed }) => [
                          styles.batteryHistoryCard,
                          pressed && styles.historyCardPressed,
                        ]}
                      >
                        <View style={styles.historyRow}>
                          <View style={styles.historyTextWrap}>
                            <Text style={styles.batteryHistoryTitle}>
                              {t.fullBattery} · {run.completedCount}/6
                            </Text>
                            <Text style={styles.historyMeta}>
                              {status} · {formatDate(run.completedAt ?? run.updatedAt, language, copy.common.notAvailable)}
                            </Text>
                          </View>
                          <Text style={styles.historyChevron}>›</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              ) : null}

              <Text style={styles.sectionTitle}>{t.testHistory} ({sessions.length})</Text>

              {sessions.length === 0 ? (
                <Text style={styles.emptyHistory}>{t.noHistory}</Text>
              ) : (
                visibleSessions.map((session) => (
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    onPress={() => router.push(testStoredSessionHref(patient.id, session.id))}
                    style={({ pressed }) => [
                      styles.historyCard,
                      pressed && styles.historyCardPressed,
                    ]}
                  >
                    <View style={styles.historyRow}>
                      <View style={styles.historyTextWrap}>
                        <Text style={styles.historyTitle}>
                          {sessionTestLabel(session.testType, language)}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {sessionStatusLabel(session.status, language)} ·{' '}
                          {formatDate(
                            session.completedAt ?? session.startedAt ?? session.createdAt,
                            language,
                            copy.common.notAvailable,
                          )}
                        </Text>
                      </View>
                      <Text style={styles.historyChevron}>›</Text>
                    </View>
                  </Pressable>
                ))
              )}

              {sessions.length > 5 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAllHistory((value) => !value)}
                  style={({ pressed }) => [styles.moreButton, pressed && styles.historyCardPressed]}
                >
                  <Text style={styles.moreButtonText}>
                    {showAllHistory ? t.showLessHistory : `${t.showMoreHistory} (${sessions.length - 5})`}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.comparisonCard}>
                <View style={styles.comparisonText}>
                  <Text style={styles.comparisonTitle}>{t.trendsTitle}</Text>
                  <Text style={styles.comparisonBody}>{t.trendsBody}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={sessions.length === 0}
                  onPress={() => router.push(testTrendsHref(patient.id))}
                  style={({ pressed }) => [
                    styles.comparisonButton,
                    pressed && styles.historyCardPressed,
                    sessions.length === 0 && styles.disabled,
                  ]}
                >
                  <Text style={styles.comparisonButtonText}>›</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>{t.manage}</Text>
              <AppButton label={t.startScreening} onPress={() => router.push(testSelectHref(patient.id))} />

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/patients/[id]/edit',
                      params: { id: patient.id },
                    })
                  }
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.historyCardPressed]}
                >
                  <Text style={styles.secondaryActionText}>{t.edit}</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/patients')}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.historyCardPressed]}
                >
                  <Text style={styles.secondaryActionText}>{t.backToList}</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={deleting}
                onPress={confirmSoftDelete}
                style={({ pressed }) => [
                  styles.dangerButton,
                  pressed && styles.dangerButtonPressed,
                  deleting && styles.disabled,
                ]}
              >
                <Text style={styles.dangerButtonText}>
                  {deleting ? t.deleting : t.softDelete}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
