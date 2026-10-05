import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PatientForm } from '@/components/patients/PatientForm';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { patientHref } from '@/navigation/patient-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { getPatientByIdForAccess, getPatientServiceErrorMessage, updatePatientForAccess } from '@/services/patient.service';
import { styles } from '@/styles/screens/patients/form.styles';
import type { PatientInput, PatientRecord } from '@/types/patient';

function readId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function EditPatientScreen() {
  const language = useAppLanguage();
  const t = useMemo(() => getCoreFlowCopy(language).editPatient, [language]);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = readId(params.id);
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified) {
          router.replace('/auth/login');
          return;
        }
        const access = await getClinicianAccessContext(user.uid, user.email ?? '');
        const record = await getPatientByIdForAccess(access, patientId);
        if (active) {
          if (record?.isAnonymous) {
            setPatient(null);
            setErrorMessage(t.anonymousBlocked);
          } else {
            setPatient(record);
            if (!record) setErrorMessage(t.notFound);
          }
        }
      } catch (error) {
        if (active) setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [language, patientId, t.anonymousBlocked, t.loadError, t.notFound]);

  async function handleSubmit(input: PatientInput) {
    if (!patient) return;
    setBusy(true);
    setErrorMessage('');
    try {
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }
      const access = await getClinicianAccessContext(user.uid, user.email ?? '');
      await updatePatientForAccess(access, patient.id, input);
      router.replace(patientHref(patient.id));
    } catch (error) {
      setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} showsVerticalScrollIndicator={false}>
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.headerTitle}>{t.title}</Text>
            </View>
            <AppEmblem compact />
          </View>
          <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
        </View>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{t.sheetTitle}</Text>
          <Text style={styles.sheetSubtitle}>{t.sheetSubtitle}</Text>
          {loading ? <Text style={styles.loading}>{t.loading}</Text> : null}
          {patient ? (
            <PatientForm initialValue={patient.payload} busy={busy} errorMessage={errorMessage} submitLabel={t.save} onSubmit={handleSubmit} onCancel={() => router.replace(patientHref(patient.id))} />
          ) : !loading ? (
            <Text style={styles.loading}>{errorMessage || t.unavailable}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
