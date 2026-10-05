import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import { getAppLanguage } from '@/services/app-language.service';
import { observeClinicianAuth } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/home-final.styles';
import type { AppLanguage } from '@/types/app-language';

const COPY = {
  vi: {
    brand: 'CENTRAL VESTIBULAR',
    title: 'Central Vestibular Screening',
    subtitle: 'Theo dõi chuyển động mắt, quản lý hồ sơ và tổng hợp kết quả kiểm tra.',
    welcome: 'Chào mừng',
    publicBody: 'Đăng nhập bằng tài khoản chuyên viên để bắt đầu phiên làm việc.',
    signedInBody: 'Phiên đăng nhập của bạn đã sẵn sàng.',
    verifyBody: 'Tài khoản cần xác minh email trước khi bắt đầu.',
    checking: 'Đang kiểm tra phiên đăng nhập...',
    signedIn: 'PHIÊN ĐĂNG NHẬP SẴN SÀNG',
    verify: 'CẦN XÁC MINH EMAIL',
    login: 'ĐĂNG NHẬP',
    register: 'ĐĂNG KÝ TÀI KHOẢN',
    continue: 'TIẾP TỤC PHIÊN LÀM VIỆC',
    patients: 'HỒ SƠ BỆNH NHÂN',
    verifyEmail: 'XÁC MINH EMAIL',
    otherAccount: 'ĐĂNG NHẬP TÀI KHOẢN KHÁC',
  },
  en: {
    brand: 'CENTRAL VESTIBULAR',
    title: 'Central Vestibular Screening',
    subtitle: 'Eye-movement tracking, patient records, and test-result review.',
    welcome: 'Welcome',
    publicBody: 'Sign in with a clinician account to begin a work session.',
    signedInBody: 'Your signed-in session is ready.',
    verifyBody: 'Verify your email before starting.',
    checking: 'Checking your sign-in session...',
    signedIn: 'SIGNED-IN SESSION READY',
    verify: 'EMAIL VERIFICATION REQUIRED',
    login: 'SIGN IN',
    register: 'CREATE ACCOUNT',
    continue: 'CONTINUE WORK SESSION',
    patients: 'PATIENT RECORDS',
    verifyEmail: 'VERIFY EMAIL',
    otherAccount: 'SIGN IN WITH ANOTHER ACCOUNT',
  },
} as const;

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('vi');

  const t = useMemo(() => COPY[language], [language]);

  useEffect(() => {
    void getAppLanguage().then(setLanguage).catch(() => undefined);

    const unsubscribe = observeClinicianAuth((nextUser) => {
      setUser(nextUser);
      setReady(true);
    });

    return unsubscribe;
  }, []);

  const verified = Boolean(user?.emailVerified);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.emblemWrap}>
            <AppEmblem />
          </View>
          <Text style={styles.brand}>{t.brand}</Text>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.hello}>{t.welcome}</Text>

          {!ready ? (
            <Text style={styles.loading}>{t.checking}</Text>
          ) : verified ? (
            <>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{t.signedIn}</Text>
              </View>
              <Text style={styles.restored}>{t.signedInBody}</Text>
              <Text style={styles.email} numberOfLines={1}>{user?.email ?? '—'}</Text>

              <View style={styles.actionBlock}>
                <AppButton
                  label={t.continue}
                  onPress={() => router.push(SESSION_HREF)}
                />
              </View>

              <View style={styles.secondaryAction}>
                <AppButton
                  label={t.patients}
                  variant="outline"
                  onPress={() => router.push(PATIENTS_HREF)}
                />
              </View>
            </>
          ) : user ? (
            <>
              <View style={[styles.statusPill, styles.statusPillAttention]}>
                <Text style={[styles.statusPillText, styles.statusPillAttentionText]}>
                  {t.verify}
                </Text>
              </View>
              <Text style={styles.restored}>{t.verifyBody}</Text>
              <Text style={styles.email} numberOfLines={1}>{user.email ?? '—'}</Text>

              <View style={styles.actionBlock}>
                <AppButton
                  label={t.verifyEmail}
                  onPress={() =>
                    router.push({
                      pathname: '/auth/verify-email',
                      params: { email: user.email ?? '' },
                    })
                  }
                />
              </View>

              <View style={styles.secondaryAction}>
                <AppButton
                  label={t.otherAccount}
                  variant="outline"
                  onPress={() => router.push('/auth/login')}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.restored}>{t.publicBody}</Text>

              <View style={styles.actionBlock}>
                <AppButton
                  label={t.login}
                  onPress={() => router.push('/auth/login')}
                />
              </View>

              <View style={styles.secondaryAction}>
                <AppButton
                  label={t.register}
                  variant="outline"
                  onPress={() => router.push('/auth/register')}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
