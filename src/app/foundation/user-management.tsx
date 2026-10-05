import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { ACCESS_CONTROL_HREF } from '@/navigation/foundation-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { writeAuditEvent } from '@/services/audit.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getServerAccessErrorMessage,
  listServerClinicUsers,
  setServerClinicUserRole,
} from '@/services/server-access-control.service';
import { styles } from '@/styles/screens/foundation/user-management.styles';
import type { ClinicianRole, ServerClinicUser } from '@/types/access-control';

const copy = {
  vi: {
    phase: 'GIAI ĐOẠN 04C · FR-05', title: 'Quản lý tài khoản', subtitle: 'Admin xem các tài khoản Firebase Auth và chủ động phân vai trò Admin hoặc Clinician. Thay đổi được kiểm tra và ghi bởi backend.',
    loading: 'Đang tải danh sách tài khoản từ backend...', noAccess: 'Chỉ Admin đã được máy chủ xác minh mới có thể quản lý tài khoản.', users: 'Tài khoản', verified: 'ĐÃ XÁC MINH EMAIL', unverified: 'CHƯA XÁC MINH EMAIL', disabled: 'ĐÃ VÔ HIỆU HÓA', current: 'TÀI KHOẢN HIỆN TẠI', role: 'Vai trò', admin: 'ADMIN', clinician: 'CLINICIAN', setAdmin: 'ĐẶT LÀ ADMIN', setClinician: 'ĐẶT LÀ CLINICIAN', saving: 'ĐANG LƯU...', refresh: 'TẢI LẠI DANH SÁCH', back: 'VỀ PHÂN QUYỀN',
    protectTitle: 'Không thể tự thay đổi vai trò', protectBody: 'Để tránh tự khóa hệ thống hoặc tự nâng quyền, tài khoản đang đăng nhập không thể đổi vai trò của chính mình. Initial Admin cũng không thể bị hạ quyền từ màn này.',
    confirmAdmin: 'Cấp quyền Admin?', confirmClinician: 'Chuyển về Clinician?', confirmBody: 'Thay đổi này có hiệu lực ở backend và sẽ được đồng bộ trên thiết bị của tài khoản đó ở lần refresh/đăng nhập tiếp theo.', cancel: 'HỦY', confirm: 'XÁC NHẬN', success: 'Đã cập nhật vai trò trên backend.', created: 'Tạo tài khoản', lastSignIn: 'Đăng nhập gần nhất', never: 'Chưa có',
  },
  en: {
    phase: 'PHASE 04C · FR-05', title: 'Account management', subtitle: 'Administrators can view Firebase Auth accounts and assign Admin or Clinician roles. Role changes are validated and recorded by the backend.',
    loading: 'Loading accounts from the backend...', noAccess: 'Only a server-verified Administrator can manage accounts.', users: 'Accounts', verified: 'EMAIL VERIFIED', unverified: 'EMAIL NOT VERIFIED', disabled: 'DISABLED', current: 'CURRENT ACCOUNT', role: 'Role', admin: 'ADMIN', clinician: 'CLINICIAN', setAdmin: 'SET AS ADMIN', setClinician: 'SET AS CLINICIAN', saving: 'SAVING...', refresh: 'REFRESH ACCOUNT LIST', back: 'BACK TO ACCESS CONTROL',
    protectTitle: 'Self-role changes are blocked', protectBody: 'To prevent lockout or self-elevation, the signed-in account cannot change its own role. The Initial Admin also cannot be demoted from this screen.',
    confirmAdmin: 'Grant Admin role?', confirmClinician: 'Change to Clinician?', confirmBody: 'This change is stored by the backend and will sync to that account on its next refresh or sign-in.', cancel: 'CANCEL', confirm: 'CONFIRM', success: 'The backend role has been updated.', created: 'Created', lastSignIn: 'Last sign-in', never: 'Never',
  },
} as const;

export default function UserManagementScreen() {
  const language = useAppLanguage();
  const c = copy[language];
  const [users, setUsers] = useState<ServerClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingUid, setSavingUid] = useState('');
  const [error, setError] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [success, setSuccess] = useState('');

  const sortedUsers = useMemo(() => [...users].sort((a, b) => Number(b.isCurrentUser) - Number(a.isCurrentUser) || a.email.localeCompare(b.email)), [users]);

  async function load(refresh = false) {
    try {
      setError(''); setSuccess('');
      const authUser = getCurrentClinician();
      if (!authUser?.emailVerified) { router.replace('/auth/login'); return; }
      const access = await getClinicianAccessContext(authUser.uid, authUser.email ?? '', { forceRefresh: true });
      if (access.role !== 'admin' || access.authority === 'safe-fallback') { setAllowed(false); setError(c.noAccess); return; }
      setAllowed(true);
      setUsers(await listServerClinicUsers());
    } catch (e) {
      setError(getServerAccessErrorMessage(e, language));
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { void load(false); }, []);

  function requestRoleChange(user: ServerClinicUser, role: ClinicianRole) {
    if (user.isCurrentUser || user.role === role) return;
    Alert.alert(role === 'admin' ? c.confirmAdmin : c.confirmClinician, c.confirmBody, [
      { text: c.cancel, style: 'cancel' },
      { text: c.confirm, onPress: () => { void applyRole(user, role); } },
    ]);
  }

  async function applyRole(user: ServerClinicUser, role: ClinicianRole) {
    try {
      setSavingUid(user.uid); setError(''); setSuccess('');
      const updated = await setServerClinicUserRole(user.uid, role);
      setUsers((current) => current.map((item) => item.uid === updated.uid ? updated : item));
      const actor = getCurrentClinician();
      if (actor) await writeAuditEvent({ actorUid: actor.uid, action: 'access.server_role_change', entityType: 'firebase_user', entityId: updated.uid, metadata: { targetUid: updated.uid, role } });
      setSuccess(c.success);
    } catch (e) {
      setError(getServerAccessErrorMessage(e, language));
    } finally { setSavingUid(''); }
  }

  return <SafeAreaView style={styles.safeArea} edges={['top','left','right','bottom']}>
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}>
      <View style={styles.blueHeader}><View style={styles.headerRow}><View style={styles.headerText}><Text style={styles.brand}>{c.phase}</Text><Text style={styles.headerTitle}>{c.title}</Text></View><AppEmblem compact /></View><Text style={styles.headerSubtitle}>{c.subtitle}</Text></View>
      <View style={styles.sheet}>
        {loading ? <Text style={styles.loading}>{c.loading}</Text> : null}
        {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
        {allowed ? <>
          <View style={styles.protectCard}><Text style={styles.protectTitle}>{c.protectTitle}</Text><Text style={styles.protectBody}>{c.protectBody}</Text></View>
          <Text style={styles.sectionTitle}>{c.users} · {sortedUsers.length}</Text>
          {sortedUsers.map((user) => <View key={user.uid} style={styles.userCard}>
            <View style={styles.userHeader}><View style={styles.userIdentity}><Text style={styles.userEmail}>{user.email || user.uid}</Text>{user.displayName ? <Text style={styles.displayName}>{user.displayName}</Text> : null}</View><View style={user.role === 'admin' ? styles.adminPill : styles.clinicianPill}><Text style={user.role === 'admin' ? styles.adminPillText : styles.clinicianPillText}>{user.role === 'admin' ? c.admin : c.clinician}</Text></View></View>
            <View style={styles.badgeRow}>{user.isCurrentUser ? <Text style={styles.currentBadge}>{c.current}</Text> : null}<Text style={user.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge}>{user.emailVerified ? c.verified : c.unverified}</Text>{user.disabled ? <Text style={styles.disabledBadge}>{c.disabled}</Text> : null}</View>
            <Text style={styles.meta}>{c.created}: {user.createdAt || c.never}</Text><Text style={styles.meta}>{c.lastSignIn}: {user.lastSignInAt || c.never}</Text>
            {!user.isCurrentUser ? <View style={styles.roleActions}><Pressable disabled={savingUid === user.uid || user.role === 'admin'} onPress={() => requestRoleChange(user, 'admin')} style={[styles.roleButton, user.role === 'admin' && styles.roleButtonDisabled]}><Text style={styles.roleButtonText}>{savingUid === user.uid ? c.saving : c.setAdmin}</Text></Pressable><Pressable disabled={savingUid === user.uid || user.role === 'clinician'} onPress={() => requestRoleChange(user, 'clinician')} style={[styles.roleButton, user.role === 'clinician' && styles.roleButtonDisabled]}><Text style={styles.roleButtonText}>{savingUid === user.uid ? c.saving : c.setClinician}</Text></Pressable></View> : null}
          </View>)}
          <AppButton label={c.refresh} onPress={() => { setRefreshing(true); void load(true); }} />
        </> : null}
        <View style={styles.buttonGap} /><AppButton label={c.back} variant="outline" onPress={() => router.replace(ACCESS_CONTROL_HREF)} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
