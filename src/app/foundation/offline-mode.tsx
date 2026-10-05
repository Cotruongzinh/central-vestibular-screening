import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { runOfflineModeCheck } from '@/services/offline-mode.service';
import { styles } from '@/styles/screens/foundation/offline-mode.styles';
import type { OfflineModeCheck } from '@/types/offline-mode';

export default function OfflineModeScreen() {
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<OfflineModeCheck | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const runCheck = useCallback(async () => {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    setChecking(true);
    setErrorMessage('');

    try {
      const next = await runOfflineModeCheck({
        actorUid: user.uid,
        emailVerified: user.emailVerified,
      });
      setResult(next);
    } catch (error) {
      console.error('[offline readiness]', error);
      setResult(null);
      setErrorMessage('Không thể kiểm tra khả năng hoạt động ngoại tuyến.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.heroTitle}>Chế độ ngoại tuyến</Text>
              <Text style={styles.heroBody}>
                Kiểm tra các thành phần cốt lõi có sẵn trên thiết bị.
              </Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          <View
            style={[
              styles.statusPill,
              result?.ready && styles.statusPillReady,
              !checking && !result?.ready && styles.statusPillError,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                result?.ready && styles.statusTextReady,
                !checking && !result?.ready && styles.statusTextError,
              ]}
            >
              {checking
                ? 'ĐANG KIỂM TRA'
                : result?.ready
                  ? 'SẴN SÀNG'
                  : 'CẦN KIỂM TRA'}
            </Text>
          </View>

          <Text style={styles.title}>Khả năng hoạt động ngoại tuyến</Text>
          <Text style={styles.body}>
            Sau khi đã đăng nhập, dữ liệu bệnh nhân, phiên kiểm tra, chỉ số và
            báo cáo cốt lõi có thể sử dụng từ bộ nhớ trên thiết bị.
          </Text>

          {checking ? (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>Đang kiểm tra...</Text>
            </View>
          ) : result ? (
            <>
              <View style={styles.capabilityCard}>
                <View style={styles.row}>
                  <View style={result.session.ready ? styles.dot : [styles.dot, styles.dotFail]}>
                    <Text style={styles.dotText}>{result.session.ready ? '✓' : '!'}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Phiên đăng nhập</Text>
                    <Text style={styles.rowBody}>
                      {result.session.ready ? 'Phiên hiện tại đã sẵn sàng.' : 'Cần đăng nhập lại.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={result.database.ready ? styles.dot : [styles.dot, styles.dotFail]}>
                    <Text style={styles.dotText}>{result.database.ready ? '✓' : '!'}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Dữ liệu trên thiết bị</Text>
                    <Text style={styles.rowBody}>
                      {result.database.ready ? 'Hồ sơ và kết quả có thể đọc/ghi cục bộ.' : 'Dữ liệu cục bộ chưa sẵn sàng.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={result.encryption.ready ? styles.dot : [styles.dot, styles.dotFail]}>
                    <Text style={styles.dotText}>{result.encryption.ready ? '✓' : '!'}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Bảo vệ dữ liệu</Text>
                    <Text style={styles.rowBody}>
                      {result.encryption.ready ? 'Mã hóa cục bộ đã sẵn sàng.' : 'Mã hóa cục bộ cần kiểm tra.'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={result.tracker.ready ? styles.dot : [styles.dot, styles.dotFail]}>
                    <Text style={styles.dotText}>{result.tracker.ready ? '✓' : '!'}</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Theo dõi mắt</Text>
                    <Text style={styles.rowBody}>
                      {result.tracker.ready ? 'Tài nguyên theo dõi mắt đã sẵn sàng.' : 'Tài nguyên theo dõi mắt cần kiểm tra.'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.row, styles.rowLast]}>
                  <View style={styles.dot}>
                    <Text style={styles.dotText}>✓</Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>Báo cáo</Text>
                    <Text style={styles.rowBody}>
                      Báo cáo có thể tạo từ dữ liệu đã lưu trên thiết bị.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.boundaryCard}>
                <Text style={styles.boundaryTitle}>Cần Internet khi nào?</Text>
                <Text style={styles.boundaryBody}>
                  Đăng nhập mới, xác minh email, đặt lại mật khẩu và các thao tác
                  chia sẻ 
                </Text>
              </View>
            </>
          ) : null}

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.buttonGapLarge} />
          <AppButton
            label={checking ? 'ĐANG KIỂM TRA...' : 'KIỂM TRA LẠI'}
            disabled={checking}
            onPress={() => void runCheck()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label="VỀ PHIÊN LÀM VIỆC"
            variant="outline"
            onPress={() => router.replace(SESSION_HREF)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
