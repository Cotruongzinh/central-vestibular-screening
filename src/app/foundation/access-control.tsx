import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { AUDIT_LOG_HREF, LOCAL_WIPE_HREF, USER_MANAGEMENT_HREF } from '@/navigation/foundation-routes';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import {
  getClinicianAccessContext,
  roleDescription,
  roleLabel,
} from '@/services/access-control.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/foundation/access-control.styles';
import type { ClinicianAccessContext } from '@/types/access-control';

const copy = {
  vi: {
    phase: 'GIAI ĐOẠN 04C · FR-05', title: 'Phân quyền truy cập',
    subtitle: 'Vai trò Admin/Clinician được xác thực bởi Firebase backend và cache mã hóa trên thiết bị để duy trì quyền đã xác minh khi offline.',
    loading: 'Đang đồng bộ quyền từ máy chủ...', error: 'Không thể tải thông tin phân quyền.',
    server: 'QUYỀN TỪ MÁY CHỦ', cache: 'CACHE QUYỀN ĐÃ XÁC MINH', fallback: 'CHẾ ĐỘ QUYỀN TỐI THIỂU', legacy: 'QUYỀN LOCAL CŨ',
    initialAdmin: 'ADMIN KHỞI TẠO TỪ CẤU HÌNH BACKEND', adminAssigned: 'ADMIN DO ADMIN KHÁC PHÂN QUYỀN', clinician: 'CLINICIAN MẶC ĐỊNH TỪ BACKEND', cached: 'ĐANG DÙNG BẢN QUYỀN SERVER ĐÃ CACHE', safe: 'BACKEND CHƯA XÁC MINH · TẠM DÙNG CLINICIAN',
    scope: 'Phạm vi dữ liệu bệnh nhân', permissions: 'Quyền truy cập', own: 'Đọc và chỉnh sửa hồ sơ phụ trách', allRead: 'Xem hồ sơ toàn cơ sở', allWrite: 'Chỉnh sửa hồ sơ toàn cơ sở', auditOwn: 'Xem nhật ký của chính mình', auditAll: 'Xem nhật ký toàn cơ sở', wipe: 'Xóa dữ liệu trên thiết bị dùng chung', allow: 'CHO PHÉP', deny: 'KHÔNG CHO PHÉP',
    serverTitle: 'Phân quyền server-authoritative', serverBody: 'Client không còn tự tạo Admin. Backend 04C là nguồn quyết định vai trò. Khi mất mạng, app chỉ dùng role đã được backend xác minh và cache; nếu chưa từng xác minh, app hạ về Clinician để tránh tự nâng quyền.',
    sync: 'ĐỒNG BỘ LẠI QUYỀN TỪ SERVER', syncing: 'ĐANG ĐỒNG BỘ...', manage: 'QUẢN LÝ TÀI KHOẢN · ADMIN', patients: 'MỞ DANH SÁCH BỆNH NHÂN', audit: 'NHẬT KÝ HOẠT ĐỘNG · FR-35', wipeButton: 'XÓA DỮ LIỆU THIẾT BỊ DÙNG CHUNG · FR-34', back: 'VỀ PHIÊN LÀM VIỆC',
  },
  en: {
    phase: 'PHASE 04C · FR-05', title: 'Access control',
    subtitle: 'Admin/Clinician roles are verified by the Firebase backend and encrypted on-device cache preserves the last verified role for offline use.',
    loading: 'Syncing access from the server...', error: 'Access-control information could not be loaded.',
    server: 'SERVER-AUTHORITATIVE ROLE', cache: 'VERIFIED ROLE CACHE', fallback: 'LEAST-PRIVILEGE MODE', legacy: 'LEGACY LOCAL ROLE',
    initialAdmin: 'INITIAL ADMIN FROM BACKEND CONFIGURATION', adminAssigned: 'ADMIN ASSIGNED BY ANOTHER ADMIN', clinician: 'DEFAULT CLINICIAN FROM BACKEND', cached: 'USING THE LAST SERVER-VERIFIED CACHED ROLE', safe: 'BACKEND NOT YET VERIFIED · CLINICIAN FALLBACK',
    scope: 'Patient-data scope', permissions: 'Access permissions', own: 'Read and edit assigned patient records', allRead: 'View clinic-wide patient records', allWrite: 'Edit clinic-wide patient records', auditOwn: 'View own activity log', auditAll: 'View clinic-wide activity log', wipe: 'Wipe shared-device local data', allow: 'ALLOWED', deny: 'NOT ALLOWED',
    serverTitle: 'Server-authoritative access control', serverBody: 'The client no longer creates an Admin role. Phase 04C backend is the authority for roles. Offline use only trusts a role that was previously verified by the backend; otherwise the app falls back to Clinician to prevent self-elevation.',
    sync: 'SYNC ROLE FROM SERVER', syncing: 'SYNCING...', manage: 'MANAGE ACCOUNTS · ADMIN', patients: 'OPEN PATIENT RECORDS', audit: 'ACTIVITY LOG · FR-35', wipeButton: 'SHARED-DEVICE DATA WIPE · FR-34', back: 'BACK TO CLINICIAN SESSION',
  },
} as const;

function assignmentText(access: ClinicianAccessContext, c: typeof copy.vi | typeof copy.en): string {
  if (access.authority === 'cached-server') return c.cached;
  if (access.authority === 'safe-fallback') return c.safe;
  if (access.assignment === 'server-initial-admin') return c.initialAdmin;
  if (access.assignment === 'server-admin-assigned') return c.adminAssigned;
  return c.clinician;
}

export default function AccessControlFoundationScreen() {
  const language = useAppLanguage();
  const c = copy[language];
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const authorityLabel = useMemo(() => {
    if (!access) return '';
    if (access.authority === 'server') return c.server;
    if (access.authority === 'cached-server') return c.cache;
    if (access.authority === 'safe-fallback') return c.fallback;
    return c.legacy;
  }, [access, c]);

  async function load(forceRefresh = false) {
    try {
      setErrorMessage('');
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }
      const nextAccess = await getClinicianAccessContext(user.uid, user.email ?? '', { forceRefresh });
      setAccess(nextAccess);
    } catch {
      setErrorMessage(c.error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => { void load(false); }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}><View><Text style={styles.brand}>{c.phase}</Text><Text style={styles.headerTitle}>{c.title}</Text></View><AppEmblem compact /></View>
          <Text style={styles.headerSubtitle}>{c.subtitle}</Text>
        </View>

        <View style={styles.sheet}>
          {loading ? <Text style={styles.loading}>{c.loading}</Text> : null}
          {errorMessage ? <View style={styles.errorBox}><Text style={styles.errorText}>{errorMessage}</Text></View> : null}
          {access ? <>
            <View style={access.role === 'admin' ? styles.adminPill : styles.clinicianPill}><Text style={access.role === 'admin' ? styles.adminPillText : styles.clinicianPillText}>{language === 'en' ? (access.role === 'admin' ? 'ADMINISTRATOR' : 'CLINICIAN') : roleLabel(access.role)}</Text></View>
            <Text style={styles.email}>{access.email || 'Verified account'}</Text>
            <Text style={styles.assignment}>{authorityLabel} · {assignmentText(access, c)}</Text>

            <View style={styles.scopeCard}><Text style={styles.scopeTitle}>{c.scope}</Text><Text style={styles.scopeBody}>{language === 'en' ? (access.role === 'admin' ? 'Administrators can read and edit clinic-wide records held on this device.' : 'Clinicians can read and edit records assigned to their own account.') : roleDescription(access)}</Text></View>

            <Text style={styles.sectionTitle}>{c.permissions}</Text>
            <View style={styles.permissionCard}>
              {[
                [c.own, true], [c.allRead, access.canReadAllPatients], [c.allWrite, access.canWriteAllPatients], [c.auditOwn, true], [c.auditAll, access.canReadAllAudit], [c.wipe, access.canWipeAllLocalData],
              ].map(([label, allowed], index, rows) => <View key={String(label)} style={index === rows.length - 1 ? styles.permissionRowLast : styles.permissionRow}><Text style={styles.permissionLabel}>{String(label)}</Text><Text style={allowed ? styles.permissionYes : styles.permissionNo}>{allowed ? c.allow : c.deny}</Text></View>)}
            </View>

            <View style={access.authority === 'safe-fallback' ? styles.warningCard : styles.serverCard}><Text style={access.authority === 'safe-fallback' ? styles.warningTitle : styles.serverTitle}>{c.serverTitle}</Text><Text style={access.authority === 'safe-fallback' ? styles.warningBody : styles.serverBody}>{c.serverBody}</Text></View>

            <AppButton label={syncing ? c.syncing : c.sync} disabled={syncing} onPress={() => { setSyncing(true); void load(true); }} />
            {access.role === 'admin' && access.authority !== 'safe-fallback' ? <><View style={styles.buttonGap} /><AppButton label={c.manage} variant="outline" onPress={() => router.push(USER_MANAGEMENT_HREF)} /></> : null}
            <View style={styles.buttonGap} /><AppButton label={c.patients} variant="outline" onPress={() => router.push(PATIENTS_HREF)} />
            <View style={styles.buttonGap} /><AppButton label={c.audit} variant="outline" onPress={() => router.push(AUDIT_LOG_HREF)} />
            <View style={styles.buttonGap} /><AppButton label={c.wipeButton} variant="outline" onPress={() => router.push(LOCAL_WIPE_HREF)} />
            <View style={styles.buttonGap} /><AppButton label={c.back} variant="outline" onPress={() => router.replace('/auth/session')} />
          </> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
