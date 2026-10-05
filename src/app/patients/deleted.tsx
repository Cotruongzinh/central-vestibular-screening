import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { SOFT_DELETE_RETENTION_DAYS } from '@/constants/storage';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { getClinicianAccessContext } from '@/services/access-control.service';
import {
  getPatientServiceErrorMessage,
  listPatientsForAccess,
  purgeExpiredSoftDeletedPatientsForAccess,
  restorePatientForAccess,
} from '@/services/patient.service';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import { styles } from '@/styles/screens/patients/deleted.styles';
import type { PatientRecord } from '@/types/patient';

function remainingDays(deletedAt: number | null): number {
  if (!deletedAt) {
    return SOFT_DELETE_RETENTION_DAYS;
  }

  const elapsed = Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000));
  return Math.max(0, SOFT_DELETE_RETENTION_DAYS - elapsed);
}

export default function DeletedPatientsScreen() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function load() {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    const access = await getClinicianAccessContext(user.uid, user.email ?? '');
    await purgeExpiredSoftDeletedPatientsForAccess(access);
    const result = await listPatientsForAccess(access, { deletedOnly: true });
    setPatients(result);
  }

  useEffect(() => {
    let active = true;

    void load()
      .catch((error) => {
        if (active) {
          setErrorMessage(getPatientServiceErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleRestore(patientId: string) {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      return;
    }

    setRestoringId(patientId);
    setErrorMessage('');
    try {
      const access = await getClinicianAccessContext(user.uid, user.email ?? '');
      await restorePatientForAccess(access, patientId);
      await load();
    } catch (error) {
      setErrorMessage(getPatientServiceErrorMessage(error));
    } finally {
      setRestoringId('');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.headerTitle}>Hồ sơ đã xóa</Text>
            </View>
            <AppEmblem compact />
          </View>
          <Text style={styles.headerSubtitle}>
            Hồ sơ đã xóa có thể khôi phục trong thời hạn 30 ngày.
          </Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Thùng hồ sơ</Text>
          <Text style={styles.sheetSubtitle}>
            Hồ sơ đã xóa quá 30 ngày sẽ được xóa vĩnh viễn khi ứng dụng thực hiện bước dọn dữ liệu.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {loading ? (
            <Text style={styles.loading}>Đang kiểm tra hồ sơ đã xóa...</Text>
          ) : patients.length === 0 ? (
            <Text style={styles.empty}>Không có hồ sơ nào đang chờ khôi phục.</Text>
          ) : (
            patients.map((patient) => (
              <View key={patient.id} style={styles.deletedCard}>
                <Text style={styles.deletedName}>{patient.payload.fullName}</Text>
                <Text style={styles.deletedMeta}>
                  {patient.localCode} · còn khoảng {remainingDays(patient.deletedAt)} ngày để khôi phục
                </Text>
                <AppButton
                  label={restoringId === patient.id ? 'ĐANG KHÔI PHỤC...' : 'KHÔI PHỤC HỒ SƠ'}
                  disabled={Boolean(restoringId)}
                  onPress={() => void handleRestore(patient.id)}
                />
              </View>
            ))
          )}

          <View style={styles.buttonGap} />
          <AppButton
            label="VỀ DANH SÁCH BỆNH NHÂN"
            variant="outline"
            onPress={() => router.replace(PATIENTS_HREF)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
