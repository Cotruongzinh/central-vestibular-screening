import { AppText as Text } from '@/components/i18n/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHero } from '@/components/ui/AuthHero';
import { getAuthErrorMessage, loginClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/auth/login.styles';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ reason?: string | string[] }>();
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const inactivityNotice =
    reason === 'inactivity'
      ? 'Phiên đã tự động đăng xuất sau 15 phút không hoạt động.'
      : reason === 'inactivity-test'
        ? 'Kiểm tra tự động đăng xuất đã hoàn tất. Phiên làm việc đã được đăng xuất.'
        : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading],
  );

  async function handleLogin() {
    if (!email.trim().includes('@')) {
      setErrorMessage('Hãy nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await loginClinician(email, password);

      if (!user.emailVerified) {
        router.replace({
          pathname: '/auth/verify-email',
          params: { email: user.email ?? email.trim().toLowerCase() },
        });
        return;
      }

      router.replace('/auth/session');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHero
            compact
            title="Đăng nhập"
            subtitle="Đăng nhập bằng tài khoản đã xác minh để bắt đầu phiên làm việc."
          />

          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Tài khoản chuyên viên lâm sàng</Text>

            {inactivityNotice ? (
              <View style={styles.sessionNotice}>
                <Text style={styles.sessionNoticeTitle}>BẢO MẬT PHIÊN ĐĂNG NHẬP</Text>
                <Text style={styles.sessionNoticeText}>{inactivityNotice}</Text>
              </View>
            ) : null}

            <AppInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="clinician@example.com"
              editable={!loading}
            />

            <AppInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              placeholder="Nhập mật khẩu"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleLogin : undefined}
              accessory={
                <Pressable onPress={() => setShowPassword((value) => !value)}>
                  <Text style={styles.accessoryText}>{showPassword ? 'Ẩn' : 'Hiện'}</Text>
                </Pressable>
              }
            />

            <View style={styles.forgotRow}>
              <Pressable onPress={() => router.push('/auth/forgot-password')} disabled={loading}>
                <Text style={styles.linkText}>Quên mật khẩu?</Text>
              </Pressable>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <AppButton
              label={loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
              disabled={!canSubmit}
              onPress={handleLogin}
            />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Chưa có tài khoản?</Text>
              <Pressable onPress={() => router.push('/auth/register')} disabled={loading}>
                <Text style={styles.registerLink}> Đăng ký tài khoản</Text>
              </Pressable>
            </View>
          </View>

          <AppButton label="VỀ TRANG CHÀO MỪNG" variant="text" onPress={() => router.replace('/')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
