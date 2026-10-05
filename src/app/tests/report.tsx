import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/i18n/AppTextInput';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { getClinicianProfile } from '@/services/clinician-profile.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { getPatientById } from '@/services/patient.service';
import {
  getSessionClinicianNote,
  saveSessionClinicianNote,
  getClinicianNoteErrorMessage,
} from '@/services/clinician-note.service';
import {
  createSessionReportPdf,
  getReportDeviceModel,
  getReportErrorMessage,
  shareSessionReportPdf,
} from '@/services/session-report.service';
import {
  getPersistedTestSession,
  getStoredEyeTrace,
} from '@/services/test-session.service';
import { reportStyles as styles } from '@/styles/screens/tests/report.styles';
import type { ClinicianProfileView } from '@/types/clinician-profile';
import type { PatientRecord } from '@/types/patient';
import type { SessionClinicianNote, SessionReportBundle } from '@/types/report';
import type { EyeTraceResult } from '@/types/test-runtime';
import type { PersistedTestSession } from '@/types/test-session';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestReportScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const sessionId = firstParam(params.sessionId as string | string[] | undefined);

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [session, setSession] = useState<PersistedTestSession | null>(null);
  const [trace, setTrace] = useState<EyeTraceResult | null>(null);
  const [note, setNote] = useState<SessionClinicianNote | null>(null);
  const [noteText, setNoteText] = useState('');
  const [clinicianEmail, setClinicianEmail] = useState('');
  const [clinicianProfile, setClinicianProfile] = useState<ClinicianProfileView | null>(null);
  const [pdfUri, setPdfUri] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified || !patientId || !sessionId) {
        if (active) {
          setErrorMessage('Thiếu phiên kiểm tra hoặc phiên làm việc chưa được xác minh.');
          setLoading(false);
        }
        return;
      }

      try {
        const [patientRecord, storedSession, storedTrace, storedNote, storedClinicianProfile] =
          await Promise.all([
            getPatientById(user.uid, patientId),
            getPersistedTestSession(user.uid, sessionId),
            getStoredEyeTrace(user.uid, sessionId),
            getSessionClinicianNote(user.uid, sessionId),
            getClinicianProfile(user.uid, user.email ?? '').catch(() => null),
          ]);

        if (
          !patientRecord ||
          !storedSession ||
          !storedTrace ||
          storedSession.patientId !== patientRecord.id ||
          storedTrace.patientId !== patientRecord.id ||
          storedTrace.id !== storedSession.result.sourceTraceId
        ) {
          throw new Error('REPORT_CONTEXT_INVALID');
        }

        if (active) {
          setPatient(patientRecord);
          setSession(storedSession);
          setTrace(storedTrace);
          setNote(storedNote);
          setNoteText(storedNote?.text ?? '');
          setClinicianEmail(user.email ?? '');
          setClinicianProfile(storedClinicianProfile);
        }
      } catch {
        if (active) {
          setErrorMessage(
            'Không thể ghép hồ sơ bệnh nhân, phiên kiểm tra và dữ liệu theo dõi mắt để tạo báo cáo.',
          );
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

  const bundle = useMemo<SessionReportBundle | null>(() => {
    if (!patient || !session || !trace) {
      return null;
    }

    return {
      patient,
      session,
      trace,
      clinicianEmail,
      clinicianProfile,
      clinicianNote: note
        ? { ...note, text: noteText.trim() }
        : noteText.trim()
          ? {
              id: `NOTE-${session.id}`,
              patientId: patient.id,
              sessionId: session.id,
              clinicianUid: session.clinicianUid,
              text: noteText.trim(),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
          : null,
      deviceModel: getReportDeviceModel(),
    };
  }, [clinicianEmail, clinicianProfile, note, noteText, patient, session, trace]);

  async function saveNote() {
    const user = getCurrentClinician();
    if (!user?.emailVerified || !patient || !session) {
      return null;
    }

    const saved = await saveSessionClinicianNote({
      clinicianUid: user.uid,
      patientId: patient.id,
      sessionId: session.id,
      text: noteText,
    });
    setNote(saved);
    return saved;
  }

  async function handleSaveNote() {
    setBusy(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await saveNote();
      setPdfUri('');
      setStatusMessage('Ghi chú phiên kiểm tra đã được mã hóa và lưu trên thiết bị.');
    } catch (error) {
      setErrorMessage(getClinicianNoteErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function buildFreshBundle(): Promise<SessionReportBundle> {
    if (!bundle) {
      throw new Error('REPORT_CONTEXT_INVALID');
    }

    const savedNote = await saveNote();

    return {
      ...bundle,
      clinicianNote: savedNote,
    };
  }

  async function handleCreatePdf() {
    setBusy(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const currentBundle = await buildFreshBundle();
      const uri = await createSessionReportPdf(currentBundle, language);
      setPdfUri(uri);
      setStatusMessage(
        'PDF đã được tạo cục bộ. Bây giờ có thể mở iOS share sheet để gửi qua ứng dụng tương thích hoặc lưu vào Files.',
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message === 'SESSION_NOTE_CONTEXT_INVALID'
          ? getClinicianNoteErrorMessage(error)
          : getReportErrorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSharePdf() {
    if (!bundle) {
      return;
    }

    setBusy(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      let uri = pdfUri;
      let currentBundle = bundle;

      if (!uri) {
        currentBundle = await buildFreshBundle();
        uri = await createSessionReportPdf(currentBundle, language);
        setPdfUri(uri);
      }

      await shareSessionReportPdf({ bundle: currentBundle, uri, language });
      setStatusMessage('Đã mở iOS share sheet cho báo cáo PDF.');
    } catch (error) {
      setErrorMessage(getReportErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(bundle && !loading && !errorMessage);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Báo cáo phiên kiểm tra</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
              Tạo, lưu ghi chú và chia sẻ báo cáo của phiên kiểm tra.
            </LocalizedPipelineText>
          </View>

          <View style={styles.sheet}>
          <RequirementEvidenceStrip items={[{ requirement: 'FR-25/26', value: 'Báo cáo + PDF' }, { requirement: 'FR-28/29', value: 'Ghi chú + chia sẻ' }]} />

            <View style={[styles.badge, Boolean(errorMessage) && styles.badgeError]}>
              <LocalizedPipelineText language={language}
                style={[
                  styles.badgeText,
                  Boolean(errorMessage) && styles.badgeTextError,
                ]}
              >
                {ready
                  ? 'BÁO CÁO SẴN SÀNG'
                  : errorMessage
                    ? 'LỖI DỮ LIỆU BÁO CÁO'
                    : 'ĐANG TẢI BÁO CÁO'}
              </LocalizedPipelineText>
            </View>

            {loading ? (
              <LocalizedPipelineText language={language} style={styles.body}>Đang tải phiên kiểm tra, hồ sơ bệnh nhân và dữ liệu theo dõi mắt...</LocalizedPipelineText>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <LocalizedPipelineText language={language} style={styles.errorText}>{errorMessage}</LocalizedPipelineText>
              </View>
            ) : null}

            {bundle ? (
              <>
                <LocalizedPipelineText language={language} style={styles.title}>{test?.nameVi ?? session?.testId}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.body}>
                  {patient?.isAnonymous
                    ? patient.localCode
                    : `${patient?.payload.fullName} · ${patient?.localCode}`}
                </LocalizedPipelineText>

                <View style={styles.summaryCard}>
                  <LocalizedPipelineText language={language} style={styles.eyebrow}>
                    {session?.result.headlineLabel.toUpperCase()}
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.headline}>
                    {session?.result.headlineValue}
                  </LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.headlineSub}>
                    {session?.traceSampleCount} mẫu theo dõi ·{' '}
                    {(session!.result.quality.greenRatio * 100).toFixed(1)}% tín hiệu tốt
                  </LocalizedPipelineText>
                </View>

                <View style={styles.infoCard}>
                  <LocalizedPipelineText language={language} style={styles.infoLabel}>Nội dung báo cáo</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.infoValue}>
                    Thông tin bệnh nhân, thời gian kiểm tra, kết quả, chất lượng tín hiệu và ghi chú chuyên viên.
                  </LocalizedPipelineText>
                </View>

                <LocalizedPipelineText language={language} style={styles.sectionTitle}>Ghi chú chuyên viên cho phiên này</LocalizedPipelineText>
                <TextInput
                  value={noteText}
                  onChangeText={(value) => {
                    setNoteText(value);
                    setPdfUri('');
                  }}
                  placeholder={language === 'en' ? 'Add a note to save with this session and include in the PDF...' : 'Nhập ghi chú để lưu cùng phiên và đưa vào PDF...'}
                  placeholderTextColor="#8EA0AC"
                  multiline
                  maxLength={4000}
                  editable={!busy}
                  style={styles.noteInput}
                />
                <LocalizedPipelineText language={language} style={styles.helper}>{noteText.length}/4000 ký tự</LocalizedPipelineText>

                <Pressable
                  disabled={busy}
                  onPress={() => void handleSaveNote()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    busy && styles.disabledButton,
                    pressed && !busy && styles.pressed,
                  ]}
                >
                  <LocalizedPipelineText language={language} style={styles.secondaryText}>LƯU GHI CHÚ</LocalizedPipelineText>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void handleCreatePdf()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    busy && styles.disabledButton,
                    pressed && !busy && styles.pressed,
                  ]}
                >
                  <LocalizedPipelineText language={language} style={styles.buttonText}>
                    {busy ? 'ĐANG XỬ LÝ...' : 'TẠO PDF'}
                  </LocalizedPipelineText>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void handleSharePdf()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    busy && styles.disabledButton,
                    pressed && !busy && styles.pressed,
                  ]}
                >
                  <LocalizedPipelineText language={language} style={styles.buttonText}>CHIA SẺ PDF</LocalizedPipelineText>
                </Pressable>

                {statusMessage ? (
                  <View style={styles.statusBox}>
                    <LocalizedPipelineText language={language} style={styles.statusText}>{statusMessage}</LocalizedPipelineText>
                  </View>
                ) : null}

                <View style={styles.warningBox}>
                  <LocalizedPipelineText language={language} style={styles.warningTitle}>Không tự kết luận bệnh lý</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.warningBody}>
                    Báo cáo tổng hợp kết quả đã lưu của phiên kiểm tra.
                  </LocalizedPipelineText>
                </View>

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <LocalizedPipelineText language={language} style={styles.secondaryText}>QUAY LẠI PHIÊN ĐÃ LƯU</LocalizedPipelineText>
                </Pressable>
              </>
            ) : null}

            <LocalizedPipelineText language={language} style={styles.footnote}>
              PDF được render vào cache cục bộ bằng Expo Print. iOS share sheet chỉ
              chia sẻ file PDF; raw camera video không được đưa vào báo cáo.
            </LocalizedPipelineText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
