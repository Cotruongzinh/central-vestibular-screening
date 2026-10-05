import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { AppInput } from '@/components/ui/AppInput';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { DELETED_PATIENTS_HREF, NEW_PATIENT_HREF, patientHref } from '@/navigation/patient-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  createAnonymousPatient,
  getPatientServiceErrorMessage,
  listPatientsForAccess,
  purgeExpiredSoftDeletedPatientsForAccess,
} from '@/services/patient.service';
import { styles } from '@/styles/screens/patients/index.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { PatientRecord } from '@/types/patient';

function patientMeta(patient: PatientRecord, birthPrefix: string): string {
  if (patient.isAnonymous) return patient.localCode;

  const bits: string[] = [];
  if (patient.payload.patientId) bits.push(`ID ${patient.payload.patientId}`);
  if (patient.payload.dateOfBirth) bits.push(`${birthPrefix} ${patient.payload.dateOfBirth}`);

  return bits.length > 0 ? bits.join(' · ') : patient.localCode;
}

export default function PatientsScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getCoreFlowCopy(language), [language]);
  const t = copy.patients;

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingAnonymous, setCreatingAnonymous] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);

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
        await purgeExpiredSoftDeletedPatientsForAccess(nextAccess);
        const result = await listPatientsForAccess(nextAccess);

        if (active) {
          setAccess(nextAccess);
          setPatients(result);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [language, t.loadError]);

  async function handleCreateAnonymous() {
    const user = getCurrentClinician();
    if (!user?.emailVerified || creatingAnonymous) return;

    setCreatingAnonymous(true);
    setErrorMessage('');

    try {
      const patient = await createAnonymousPatient(user.uid);
      router.push(patientHref(patient.id));
    } catch (error) {
      setErrorMessage(language === 'en' ? t.loadError : getPatientServiceErrorMessage(error));
    } finally {
      setCreatingAnonymous(false);
    }
  }

  const filteredPatients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language === 'en' ? 'en-US' : 'vi-VN');
    if (!normalized) return patients;

    return patients.filter((patient) => {
      const fields = [patient.payload.fullName, patient.payload.patientId, patient.localCode]
        .join(' ')
        .toLocaleLowerCase(language === 'en' ? 'en-US' : 'vi-VN');
      return fields.includes(normalized);
    });
  }, [language, patients, query]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.brand}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.headerTitle}>{t.headerTitle}</Text>
              <Text style={styles.headerSubtitle}>{t.headerSubtitle}</Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.topRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.sheetTitle}>{t.listTitle}</Text>
              <Text style={styles.summary}>{t.summary}</Text>
            </View>
            <View style={styles.offlinePill}>
              <Text style={styles.offlinePillText}>{t.offlineReady}</Text>
            </View>
          </View>

          {access ? (
            <View style={styles.scopeLine}>
              <View style={access.role === 'admin' ? styles.adminPill : styles.clinicianPill}>
                <Text style={access.role === 'admin' ? styles.adminPillText : styles.clinicianPillText}>
                  {access.role === 'admin' ? copy.common.admin : copy.common.clinician}
                </Text>
              </View>
              <Text style={styles.scopeText}>
                {access.role === 'admin' ? t.adminScope : t.clinicianScope}
              </Text>
            </View>
          ) : null}

          <View style={styles.searchWrap}>
            <AppInput
              autoCapitalize="none"
              autoCorrect={false}
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <AppButton label={t.add} onPress={() => router.push(NEW_PATIENT_HREF)} />

          <View style={styles.secondaryActions}>
            <Pressable
              accessibilityRole="button"
              disabled={creatingAnonymous}
              onPress={() => void handleCreateAnonymous()}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.secondaryActionPressed,
                creatingAnonymous && styles.secondaryActionDisabled,
              ]}
            >
              <Text style={styles.secondaryActionText}>
                {creatingAnonymous ? t.creatingAnonymous : t.startAnonymous}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(DELETED_PATIENTS_HREF)}
              style={({ pressed }) => [styles.secondaryAction, pressed && styles.secondaryActionPressed]}
            >
              <Text style={styles.secondaryActionText}>{t.deleted}</Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>
            {query.trim() ? `${t.results} (${filteredPatients.length})` : `${t.active} (${patients.length})`}
          </Text>

          {loading ? (
            <Text style={styles.loading}>{t.loading}</Text>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{query.trim() ? t.noMatch : t.noPatients}</Text>
              <Text style={styles.emptyBody}>{query.trim() ? t.noMatchBody : t.noPatientsBody}</Text>
            </View>
          ) : (
            filteredPatients.map((patient) => (
              <Pressable
                key={patient.id}
                accessibilityRole="button"
                onPress={() => router.push(patientHref(patient.id))}
                style={({ pressed }) => [styles.patientCard, pressed && styles.patientCardPressed]}
              >
                <View style={styles.patientRow}>
                  <View style={styles.patientTextWrap}>
                    <View style={styles.patientNameRow}>
                      <Text style={styles.patientName}>{patient.payload.fullName}</Text>
                      {patient.isAnonymous ? (
                        <View style={styles.anonymousPill}>
                          <Text style={styles.anonymousPillText}>{copy.common.anonymous}</Text>
                        </View>
                      ) : null}
                      {access?.role === 'admin' && patient.clinicianUid === access.uid ? (
                        <View style={styles.ownPill}>
                          <Text style={styles.ownPillText}>{copy.common.assigned}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.patientMeta}>{patientMeta(patient, t.birthPrefix)}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
