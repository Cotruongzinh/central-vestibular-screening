import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import {
  ACCESS_CONTROL_HREF,
  ADMIN_FEEDBACK_INBOX_HREF,
  AUDIT_LOG_HREF,
  CLINICIAN_PROFILE_HREF,
  FEEDBACK_REPORT_HREF,
  LANGUAGE_SETTINGS_HREF,
  LOCAL_WIPE_HREF,
  NORMATIVE_REFERENCE_HREF,
  OFFLINE_MODE_HREF,
  SESSION_SECURITY_HREF,
  TRAINING_MODE_HREF,
  TUTORIAL_HREF,
  USER_MANAGEMENT_HREF,
} from '@/navigation/foundation-routes';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { getAppLanguage } from '@/services/app-language.service';
import { getTutorialStatus } from '@/services/tutorial.service';
import {
  observeClinicianAuth,
  signOutClinician,
} from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/auth/session.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { AppLanguage } from '@/types/app-language';

type SectionKey = 'settings' | 'security' | 'admin';

type RowProps = {
  label: string;
  detail?: string;
  href: Href;
};

const COPY = {
  vi: {
    brand: 'CENTRAL VESTIBULAR',
    title: 'Không gian làm việc',
    subtitle: 'Hồ sơ bệnh nhân, kiểm tra và kết quả trong một quy trình.',
    signedIn: 'ĐÃ ĐĂNG NHẬP',
    admin: 'Quản trị viên',
    clinician: 'Chuyên viên',
    patients: 'HỒ SƠ BỆNH NHÂN',
    patientsHint: 'Tạo, tìm kiếm, mở hồ sơ và bắt đầu kiểm tra.',
    settings: 'Tài khoản & hỗ trợ',
    settingsHint: 'Hồ sơ, ngôn ngữ, tham chiếu, hướng dẫn và phản hồi.',
    security: 'Bảo mật & chế độ',
    securityHint: 'Bảo mật phiên, dữ liệu cục bộ, ngoại tuyến và demo.',
    adminTools: 'Quản trị',
    adminHint: 'Người dùng, phân quyền, nhật ký và hộp thư.',
    profile: 'Hồ sơ chuyên viên',
    profileDetail: 'Tên, chuyên khoa và cơ sở làm việc',
    language: 'Ngôn ngữ',
    reference: 'Dữ liệu tham chiếu',
    tutorial: 'Hướng dẫn sử dụng',
    feedback: 'Phản hồi & báo lỗi',
    offline: 'Chế độ ngoại tuyến',
    training: 'Demo / training',
    sessionSecurity: 'Bảo mật phiên',
    localData: 'Dữ liệu cục bộ',
    users: 'Quản lý người dùng',
    access: 'Phân quyền truy cập',
    audit: 'Nhật ký hoạt động',
    inbox: 'Hộp thư phản hồi',
    wipe: 'Dữ liệu thiết bị dùng chung',
    logout: 'Đăng xuất',
    loggingOut: 'Đang đăng xuất...',
    loading: 'Đang khôi phục phiên...',
  },
  en: {
    brand: 'CENTRAL VESTIBULAR',
    title: 'Workspace',
    subtitle: 'Patient records, testing, and results in one workflow.',
    signedIn: 'SIGNED IN',
    admin: 'Administrator',
    clinician: 'Clinician',
    patients: 'PATIENT RECORDS',
    patientsHint: 'Create, search, open a record, and start testing.',
    settings: 'Account & support',
    settingsHint: 'Profile, language, reference data, guidance, and feedback.',
    security: 'Security & modes',
    securityHint: 'Session security, local data, offline, and demo mode.',
    adminTools: 'Administration',
    adminHint: 'Users, access control, activity log, and inbox.',
    profile: 'Clinician profile',
    profileDetail: 'Name, specialty, and workplace',
    language: 'Language',
    reference: 'Reference data',
    tutorial: 'User guide',
    feedback: 'Feedback & bug report',
    offline: 'Offline mode',
    training: 'Demo / training',
    sessionSecurity: 'Session security',
    localData: 'Local data',
    users: 'User management',
    access: 'Access control',
    audit: 'Activity log',
    inbox: 'Feedback inbox',
    wipe: 'Shared-device data',
    logout: 'Sign out',
    loggingOut: 'Signing out...',
    loading: 'Restoring session...',
  },
} as const;

function NavigationRow({ label, detail, href }: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

type CollapsibleSectionProps = {
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function CollapsibleSection({
  title,
  hint,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.sectionHeaderPressed]}
      >
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
        <Text style={[styles.sectionChevron, open && styles.sectionChevronOpen]}>⌄</Text>
      </Pressable>

      {open ? <View style={styles.sectionRows}>{children}</View> : null}
    </View>
  );
}

export default function SessionScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [language, setLanguage] = useState<AppLanguage>('vi');
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const t = useMemo(() => COPY[language], [language]);

  useEffect(() => {
    const unsubscribe = observeClinicianAuth((nextUser) => {
      if (!nextUser) {
        setReady(true);
        router.replace('/auth/login');
        return;
      }

      if (!nextUser.emailVerified) {
        router.replace({
          pathname: '/auth/verify-email',
          params: { email: nextUser.email ?? '' },
        });
        return;
      }

      setUser(nextUser);

      void Promise.all([
        getClinicianAccessContext(nextUser.uid, nextUser.email ?? ''),
        getAppLanguage(),
        getTutorialStatus().catch(() => ({ completed: true, version: null })),
      ])
        .then(([nextAccess, nextLanguage, tutorialStatus]) => {
          setAccess(nextAccess);
          setLanguage(nextLanguage);
          setReady(true);

          if (!tutorialStatus.completed) {
            router.replace(TUTORIAL_HREF);
          }
        })
        .catch(() => {
          setAccess(null);
          setReady(true);
        });
    });

    return unsubscribe;
  }, []);

  function toggleSection(section: SectionKey) {
    setOpenSection((current) => (current === section ? null : section));
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await signOutClinician();
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = access?.role === 'admin';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.brand}>{t.brand}</Text>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.subtitle}>{t.subtitle}</Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        {!ready ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loading}>{t.loading}</Text>
          </View>
        ) : (
          <>
            <View style={styles.identityStrip}>
              <View style={styles.identityText}>
                <Text style={styles.email} numberOfLines={1}>{user?.email ?? '—'}</Text>
                <Text style={styles.role}>{isAdmin ? t.admin : t.clinician}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{t.signedIn}</Text>
              </View>
            </View>

            <View style={styles.primaryCard}>
              <Text style={styles.primaryTitle}>{t.patients}</Text>
              <Text style={styles.primaryHint}>{t.patientsHint}</Text>
              <View style={styles.primaryButton}>
                <AppButton label={t.patients} onPress={() => router.push(PATIENTS_HREF)} />
              </View>
            </View>

            <CollapsibleSection
              title={t.settings}
              hint={t.settingsHint}
              open={openSection === 'settings'}
              onToggle={() => toggleSection('settings')}
            >
              <NavigationRow label={t.profile} detail={t.profileDetail} href={CLINICIAN_PROFILE_HREF} />
              <NavigationRow label={t.language} href={LANGUAGE_SETTINGS_HREF} />
              <NavigationRow label={t.reference} href={NORMATIVE_REFERENCE_HREF} />
              <NavigationRow label={t.tutorial} href={TUTORIAL_HREF} />
              <NavigationRow label={t.feedback} href={FEEDBACK_REPORT_HREF} />
            </CollapsibleSection>

            <CollapsibleSection
              title={t.security}
              hint={t.securityHint}
              open={openSection === 'security'}
              onToggle={() => toggleSection('security')}
            >
              <NavigationRow label={t.sessionSecurity} href={SESSION_SECURITY_HREF} />
              <NavigationRow label={t.localData} href={'/foundation/local-data' as Href} />
              <NavigationRow label={t.offline} href={OFFLINE_MODE_HREF} />
              <NavigationRow label={t.training} href={TRAINING_MODE_HREF} />
            </CollapsibleSection>

            {isAdmin ? (
              <CollapsibleSection
                title={t.adminTools}
                hint={t.adminHint}
                open={openSection === 'admin'}
                onToggle={() => toggleSection('admin')}
              >
                <NavigationRow label={t.users} href={USER_MANAGEMENT_HREF} />
                <NavigationRow label={t.access} href={ACCESS_CONTROL_HREF} />
                <NavigationRow label={t.audit} href={AUDIT_LOG_HREF} />
                <NavigationRow label={t.inbox} href={ADMIN_FEEDBACK_INBOX_HREF} />
                <NavigationRow label={t.wipe} href={LOCAL_WIPE_HREF} />
              </CollapsibleSection>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
                loading && styles.logoutButtonDisabled,
              ]}
            >
              <Text style={styles.logoutText}>{loading ? t.loggingOut : t.logout}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
