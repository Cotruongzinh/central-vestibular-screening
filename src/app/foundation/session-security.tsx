import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import {
  INACTIVITY_TIMEOUT_MINUTES,
  INACTIVITY_TIMEOUT_MS,
} from '@/constants/session';
import {
  isSessionExpired,
  performInactivityLogout,
} from '@/services/session-security.service';
import { styles } from '@/styles/screens/foundation/session-security.styles';

export default function SessionSecurityScreen() {
  const [runningTest, setRunningTest] = useState(false);

  const mechanismReady = useMemo(() => {
    const now = Date.now();
    const expired = isSessionExpired(now - INACTIVITY_TIMEOUT_MS - 1, now);
    const fresh = isSessionExpired(now - INACTIVITY_TIMEOUT_MS + 60_000, now);
    return expired && !fresh;
  }, []);

  async function handleSimulateTimeout() {
    if (runningTest) return;

    setRunningTest(true);
    try {
      await performInactivityLogout('acceptance-test');
    } finally {
      setRunningTest(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.brand}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.headerTitle}>Bảo mật phiên</Text>
            </View>
            <AppEmblem compact />
          </View>

          <Text style={styles.headerSubtitle}>
            Tự động bảo vệ phiên làm việc khi không có thao tác.
          </Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>ĐANG BẬT</Text>
          </View>

          <Text style={styles.title}>
            Tự động đăng xuất sau {INACTIVITY_TIMEOUT_MINUTES} phút
          </Text>
          <Text style={styles.subtitle}>
            Chạm, cuộn hoặc nhập liệu sẽ làm mới thời gian hoạt động. Khi quá thời
            gian chờ, ứng dụng đăng xuất và quay về màn đăng nhập.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian chờ</Text>
              <Text style={styles.infoValue}>
                {INACTIVITY_TIMEOUT_MINUTES} phút
              </Text>
            </View>

            <View style={styles.infoRowLast}>
              <Text style={styles.infoLabel}>Cơ chế tự động đăng xuất</Text>
              <Text
                style={[
                  styles.infoValue,
                  mechanismReady ? styles.successValue : styles.dangerValue,
                ]}
              >
                {mechanismReady ? 'Sẵn sàng' : 'Cần kiểm tra'}
              </Text>
            </View>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteTitle}>Thử nhanh</Text>
            <Text style={styles.infoNoteText}>
              Nút bên dưới chạy ngay cùng luồng đăng xuất của timeout để bạn kiểm
              tra kết quả mà không phải chờ {INACTIVITY_TIMEOUT_MINUTES} phút.
            </Text>
          </View>

          <View style={styles.buttonBlock}>
            <AppButton
              label={
                runningTest
                  ? 'ĐANG THỬ ĐĂNG XUẤT...'
                  : 'THỬ ĐĂNG XUẤT TỰ ĐỘNG'
              }
              disabled={runningTest}
              onPress={() => void handleSimulateTimeout()}
            />

            <View style={styles.buttonGap} />

            <AppButton
              label="VỀ PHIÊN LÀM VIỆC"
              variant="outline"
              onPress={() => router.replace('/auth/session')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
