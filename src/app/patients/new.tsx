import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PatientForm } from '@/components/patients/PatientForm';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { PATIENTS_HREF, patientHref } from '@/navigation/patient-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { createPatient, getPatientServiceErrorMessage } from '@/services/patient.service';
import { styles } from '@/styles/screens/patients/form.styles';
import type { PatientInput } from '@/types/patient';

export default function NewPatientScreen() {
  const language = useAppLanguage();
  const t = useMemo(() => getCoreFlowCopy(language).newPatient, [language]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(input: PatientInput) {
    setBusy(true);
    setErrorMessage('');
    try {
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }
      const patient = await createPatient(user.uid, input);
      router.replace(patientHref(patient.id));
    } catch (error) {
      setErrorMessage(language === 'en' ? 'Could not save the patient record. Please try again.' : getPatientServiceErrorMessage(error));
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
          <PatientForm busy={busy} errorMessage={errorMessage} submitLabel={t.save} onSubmit={handleSubmit} onCancel={() => router.replace(PATIENTS_HREF)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
