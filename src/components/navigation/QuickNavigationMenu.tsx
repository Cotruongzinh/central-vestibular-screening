import { router, type Href, usePathname } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { useAppLanguage } from '@/hooks/use-app-language';
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
  SESSION_HREF,
  SESSION_SECURITY_HREF,
  TRAINING_MODE_HREF,
  TUTORIAL_HREF,
  USER_MANAGEMENT_HREF,
} from '@/navigation/foundation-routes';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { getCurrentClinician, observeClinicianAuth } from '@/services/firebase/auth.service';
import type { ClinicianAccessContext } from '@/types/access-control';

const HIDDEN_PATHS = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-email',
  '/tests/runtime',
  '/tests/calibration',
  '/tests/mapping',
  '/tests/validation',
  '/tests/battery-quick-calibration',
  '/tests/npc',
];

type MenuGroupKey = 'settings' | 'security' | 'admin';

type MenuItem = {
  key: string;
  labelVi: string;
  labelEn: string;
  href: Href;
};

const PRIMARY_ITEMS: MenuItem[] = [
  { key: 'workspace', labelVi: 'Không gian làm việc', labelEn: 'Workspace', href: SESSION_HREF },
  { key: 'patients', labelVi: 'Hồ sơ bệnh nhân', labelEn: 'Patient records', href: PATIENTS_HREF },
];

const SETTINGS_ITEMS: MenuItem[] = [
  { key: 'profile', labelVi: 'Hồ sơ chuyên viên', labelEn: 'Clinician profile', href: CLINICIAN_PROFILE_HREF },
  { key: 'language', labelVi: 'Ngôn ngữ', labelEn: 'Language', href: LANGUAGE_SETTINGS_HREF },
  { key: 'reference', labelVi: 'Dữ liệu tham chiếu', labelEn: 'Reference data', href: NORMATIVE_REFERENCE_HREF },
  { key: 'tutorial', labelVi: 'Hướng dẫn sử dụng', labelEn: 'User guide', href: TUTORIAL_HREF },
  { key: 'feedback', labelVi: 'Phản hồi & báo lỗi', labelEn: 'Feedback & bug report', href: FEEDBACK_REPORT_HREF },
];

const SECURITY_ITEMS: MenuItem[] = [
  { key: 'session-security', labelVi: 'Bảo mật phiên', labelEn: 'Session security', href: SESSION_SECURITY_HREF },
  { key: 'offline', labelVi: 'Chế độ ngoại tuyến', labelEn: 'Offline mode', href: OFFLINE_MODE_HREF },
  { key: 'training', labelVi: 'Demo / training', labelEn: 'Demo / training', href: TRAINING_MODE_HREF },
];

const ADMIN_ITEMS: MenuItem[] = [
  { key: 'users', labelVi: 'Quản lý người dùng', labelEn: 'User management', href: USER_MANAGEMENT_HREF },
  { key: 'access', labelVi: 'Phân quyền truy cập', labelEn: 'Access control', href: ACCESS_CONTROL_HREF },
  { key: 'audit', labelVi: 'Nhật ký hoạt động', labelEn: 'Activity log', href: AUDIT_LOG_HREF },
  { key: 'admin-inbox', labelVi: 'Hộp thư phản hồi', labelEn: 'Feedback inbox', href: ADMIN_FEEDBACK_INBOX_HREF },
  { key: 'wipe', labelVi: 'Dữ liệu thiết bị dùng chung', labelEn: 'Shared-device data', href: LOCAL_WIPE_HREF },
];

export function QuickNavigationMenu() {
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<MenuGroupKey | null>(null);
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [authenticated, setAuthenticated] = useState(
    () => Boolean(getCurrentClinician()?.emailVerified),
  );

  useEffect(() => {
    let mounted = true;

    const unsubscribe = observeClinicianAuth((user) => {
      if (!mounted) return;

      setAuthenticated(Boolean(user?.emailVerified));

      if (!user?.emailVerified) {
        setAccess(null);
        setOpen(false);
        return;
      }

      void getClinicianAccessContext(user.uid, user.email ?? '')
        .then((value) => {
          if (mounted) setAccess(value);
        })
        .catch(() => {
          if (mounted) setAccess(null);
        });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user = getCurrentClinician();
    if (!user?.emailVerified) return;

    void getClinicianAccessContext(user.uid, user.email ?? '')
      .then(setAccess)
      .catch(() => undefined);
  }, [pathname]);

  const hidden = useMemo(
    () => HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
    [pathname],
  );

  if (!authenticated || hidden) return null;

  const isAdmin = access?.role === 'admin';

  function go(href: Href) {
    setOpen(false);
    router.push(href);
  }

  function renderItem(item: MenuItem) {
    const active = pathname === String(item.href);

    return (
      <Pressable
        key={item.key}
        onPress={() => go(item.href)}
        style={({ pressed }) => [
          styles.item,
          active && styles.itemActive,
          pressed && styles.itemPressed,
        ]}
      >
        <Text style={[styles.itemText, active && styles.itemTextActive]}>
          {language === 'vi' ? item.labelVi : item.labelEn}
        </Text>
        <Text style={[styles.itemChevron, active && styles.itemTextActive]}>›</Text>
      </Pressable>
    );
  }

  function renderGroup(
    key: MenuGroupKey,
    titleVi: string,
    titleEn: string,
    items: MenuItem[],
  ) {
    const expanded = openGroup === key;

    return (
      <View style={styles.group}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setOpenGroup((current) => (current === key ? null : key))}
          style={({ pressed }) => [styles.groupHeader, pressed && styles.groupHeaderPressed]}
        >
          <Text style={styles.groupTitle}>{language === 'vi' ? titleVi : titleEn}</Text>
          <Text style={[styles.groupChevron, expanded && styles.groupChevronOpen]}>⌄</Text>
        </Pressable>
        {expanded ? <View style={styles.groupItems}>{items.map(renderItem)}</View> : null}
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={language === 'vi' ? 'Mở menu' : 'Open menu'}
        onPress={() => setOpen(true)}
        style={[
          styles.floatingButton,
          { bottom: Math.max(insets.bottom + 14, 22) },
        ]}
      >
        <Text style={styles.floatingGlyph}>☰</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

          <SafeAreaView
            style={[
              styles.drawer,
              {
                marginTop: Math.max(insets.top + 8, 18),
                marginBottom: Math.max(insets.bottom + 8, 14),
              },
            ]}
            edges={['left']}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderText}>
                <Text style={styles.eyebrow}>CENTRAL VESTIBULAR</Text>
                <Text style={styles.title}>{language === 'vi' ? 'Menu' : 'Menu'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={language === 'vi' ? 'Đóng menu' : 'Close menu'}
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.primaryList}>{PRIMARY_ITEMS.map(renderItem)}</View>
              {renderGroup('settings', 'Tài khoản & hỗ trợ', 'Account & support', SETTINGS_ITEMS)}
              {renderGroup('security', 'Bảo mật & chế độ', 'Security & modes', SECURITY_ITEMS)}
              {isAdmin
                ? renderGroup('admin', 'Quản trị', 'Administration', ADMIN_ITEMS)
                : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087fb8',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 9,
    zIndex: 9999,
  },
  floatingGlyph: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(7, 29, 46, 0.42)',
  },
  drawer: {
    width: '84%',
    maxWidth: 360,
    backgroundColor: '#f6fafb',
    borderTopRightRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
    elevation: 18,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#087fb8',
  },
  drawerHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: '#d9f2ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    marginTop: 4,
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '900',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 28,
  },
  primaryList: {
    marginBottom: 8,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe7eb',
  },
  group: {
    marginTop: 9,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe7eb',
  },
  groupHeader: {
    minHeight: 50,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupHeaderPressed: {
    backgroundColor: '#f0f7fa',
  },
  groupTitle: {
    flex: 1,
    color: '#173c50',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  groupChevron: {
    color: '#2d7ea5',
    fontSize: 22,
    lineHeight: 24,
    transform: [{ rotate: '0deg' }],
  },
  groupChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  groupItems: {
    borderTopWidth: 1,
    borderTopColor: '#e6eef1',
  },
  item: {
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6eef1',
  },
  itemPressed: {
    backgroundColor: '#edf7fb',
  },
  itemActive: {
    backgroundColor: '#e5f4fb',
  },
  itemText: {
    flex: 1,
    color: '#183a4d',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  itemTextActive: {
    color: '#0877ad',
  },
  itemChevron: {
    color: '#8aa0aa',
    fontSize: 21,
    lineHeight: 22,
  },
});
