import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AuthHero } from '@/components/ui/AuthHero';
import {
  getAuthErrorMessage,
  getCurrentClinician,
  refreshClinicianVerification,
  sendClinicianVerification,
  signOutClinician,
} from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/auth/verify-email.styles';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const email = useMemo(() => {
    if (Array.isArray(params.email)) {
      return params.email[0] ?? '';
    }
    return params.email ?? '';
  }, [params.email]);

  async function handleResend() {
    const user = getCurrentClinician();

    if (!user) {
      setErrorMessage('Không còn phiên xác thực đang hoạt động. Hãy đăng nhập lại.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await sendClinicianVerification(user);
      setMessage('Đã gửi lại email xác minh. Hãy kiểm tra Inbox và Spam/Junk.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckVerification() {
    const user = getCurrentClinician();

    if (!user) {
      setErrorMessage('Không còn phiên xác thực đang hoạt động. Hãy đăng nhập lại.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const isVerified = await refreshClinicianVerification(user);

      if (!isVerified) {
        setMessage('Firebase chưa ghi nhận email đã xác minh. Nếu bạn vừa bấm link, chờ vài giây rồi kiểm tra lại.');
        return;
      }

      setVerified(true);
      setMessage('Email đã được xác minh. Bạn có thể tiếp tục vào phiên làm việc.');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOutClinician();
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AuthHero
          compact
          title={verified ? 'Email đã xác minh' : 'Xác minh email'}
          subtitle={
            verified
              ? 'Tài khoản đã xác minh và sẵn sàng đăng nhập.'
              : 'Mở email Firebase, bấm liên kết xác minh rồi quay lại ứng dụng.'
          }
        />

        <View style={styles.sheet}>
          <View style={[styles.statusCard, verified ? styles.statusReady : styles.statusPending]}>
            <Text style={styles.statusLabel}>{verified ? 'VERIFIED' : 'WAITING FOR VERIFICATION'}</Text>
            <Text style={styles.statusEmail}>{email || 'Email tài khoản hiện tại'}</Text>
          </View>

          {!verified ? (
            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Các bước xác minh</Text>
              <Text style={styles.step}>1. Mở email xác minh do Firebase gửi.</Text>
              <Text style={styles.step}>2. Bấm liên kết xác minh.</Text>
              <Text style={styles.step}>3. Quay lại Expo Go.</Text>
              <Text style={styles.step}>4. Bấm “TÔI ĐÃ XÁC MINH”.</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {verified ? (
            <>
              <AppButton label="TIẾP TỤC" onPress={() => router.replace('/auth/session')} />
              <View style={styles.buttonGap} />
              <AppButton label="ĐĂNG XUẤT" variant="outline" onPress={handleSignOut} disabled={loading} />
            </>
          ) : (
            <>
              <AppButton
                label={loading ? 'ĐANG KIỂM TRA...' : 'TÔI ĐÃ XÁC MINH'}
                disabled={loading}
                onPress={handleCheckVerification}
              />
              <View style={styles.buttonGap} />
              <AppButton
                label="GỬI LẠI EMAIL XÁC MINH"
                variant="outline"
                disabled={loading}
                onPress={handleResend}
              />
            </>
          )}
        </View>

        <AppButton label="VỀ ĐĂNG NHẬP" variant="text" onPress={() => router.replace('/auth/login')} />
      </ScrollView>
    </SafeAreaView>
  );
}
