import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { AuthHero } from '@/components/ui/AuthHero';
import {
  getAuthErrorMessage,
  requestClinicianPasswordReset,
} from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/auth/forgot-password.styles';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim().includes('@')) {
      setErrorMessage('Hãy nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await requestClinicianPasswordReset(email);
      setSent(true);
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
            title="Khôi phục mật khẩu"
            subtitle="Hệ thống sẽ gửi liên kết đặt lại mật khẩu đến email của tài khoản."
          />

          <View style={styles.sheet}>
            {sent ? (
              <>
                <View style={styles.successBox}>
                  <Text style={styles.successTitle}>EMAIL ĐÃ ĐƯỢC GỬI</Text>
                  <Text style={styles.successText}>
                    Kiểm tra Hộp thư đến và Thư rác của {email.trim().toLowerCase()}, sau đó mở liên kết để đặt lại mật khẩu.
                  </Text>
                </View>
                <AppButton label="VỀ ĐĂNG NHẬP" onPress={() => router.replace('/auth/login')} />
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Email tài khoản</Text>
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
                  returnKeyType="done"
                  onSubmitEditing={loading ? undefined : handleReset}
                />

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <AppButton
                  label={loading ? 'ĐANG GỬI...' : 'GỬI LIÊN KẾT ĐẶT LẠI'}
                  disabled={loading || email.trim().length === 0}
                  onPress={handleReset}
                />
              </>
            )}
          </View>

          <AppButton label="QUAY LẠI" variant="text" onPress={() => router.replace('/auth/login')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
