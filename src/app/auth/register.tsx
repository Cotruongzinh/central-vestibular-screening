import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHero } from '@/components/ui/AuthHero';
import {
  getAuthErrorMessage,
  registerClinician,
  sendClinicianVerification,
} from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/auth/register.styles';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && confirmPassword.length > 0 && !loading,
    [email, password, confirmPassword, loading],
  );

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes('@')) {
      setErrorMessage('Hãy nhập địa chỉ email hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await registerClinician(normalizedEmail, password);
      await sendClinicianVerification(user);

      router.replace({
        pathname: '/auth/verify-email',
        params: { email: user.email ?? normalizedEmail },
      });
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
            title="Đăng ký tài khoản"
            subtitle="Tạo tài khoản bằng email và xác minh địa chỉ email trước khi sử dụng ứng dụng."
          />

          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Thông tin đăng ký</Text>

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
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              placeholder="Ít nhất 6 ký tự"
              editable={!loading}
            />

            <AppInput
              label="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              placeholder="Nhập lại mật khẩu"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={canSubmit ? handleRegister : undefined}
            />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <AppButton
              label={loading ? 'ĐANG TẠO TÀI KHOẢN...' : 'ĐĂNG KÝ'}
              disabled={!canSubmit}
              onPress={handleRegister}
            />

            <View style={styles.verifyHint}>
              <Text style={styles.verifyHintTitle}>Xác minh email bắt buộc</Text>
              <Text style={styles.verifyHintText}>
                Sau khi đăng ký, Firebase sẽ gửi liên kết xác minh tới email này.
              </Text>
            </View>
          </View>

          <AppButton label="ĐÃ CÓ TÀI KHOẢN · ĐĂNG NHẬP" variant="outline" onPress={() => router.replace('/auth/login')} />
          <View style={styles.buttonGap} />
          <AppButton label="QUAY LẠI" variant="text" onPress={() => router.replace('/')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
