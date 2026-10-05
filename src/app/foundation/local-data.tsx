import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { observeClinicianAuth } from '@/services/firebase/auth.service';
import { runLocalFoundationCheck } from '@/services/local-foundation.service';
import { PATIENTS_HREF } from '@/navigation/patient-routes';
import { styles } from '@/styles/screens/foundation/local-data.styles';
import type { LocalFoundationCheck } from '@/types/local-data';

export default function LocalDataFoundationScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<LocalFoundationCheck | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = observeClinicianAuth((nextUser) => {
      if (!nextUser) {
        setAuthReady(true);
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
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const runCheck = useCallback(async () => {
    if (!user) {
      return;
    }

    setChecking(true);
    setError('');

    try {
      const nextResult = await runLocalFoundationCheck(user.uid);
      setResult(nextResult);
    } catch (nextError) {
      console.error('[02D local data foundation]', nextError);
      setResult(null);
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Không thể hoàn tất kiểm tra dữ liệu trên thiết bị.',
      );
    } finally {
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    if (authReady && user) {
      void runCheck();
    }
  }, [authReady, runCheck, user]);

  const stateLabel = error
    ? '02D CẦN SỬA'
    : result?.ready
      ? '02D ĐẠT'
      : '02D ĐANG KIỂM TRA';

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
              <Text style={styles.headerTitle}>Dữ liệu và bảo mật trên thiết bị</Text>
            </View>
            <AppEmblem compact />
          </View>

          <Text style={styles.headerSubtitle}>
            SQLite là nơi lưu dữ liệu chính trên thiết bị. Dữ liệu nhạy cảm được mã hóa ở cấp ứng dụng trước khi lưu.
          </Text>
        </View>

        <View style={styles.sheet}>
          <View
            style={[
              styles.statusPill,
              result?.ready && styles.statusPillReady,
              Boolean(error) && styles.statusPillError,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                result?.ready && styles.statusPillTextReady,
                Boolean(error) && styles.statusPillTextError,
              ]}
            >
              {stateLabel}
            </Text>
          </View>

          <Text style={styles.title}></Text>
          <Text style={styles.subtitle}>
            Bước kiểm tra này xác nhận cơ sở dữ liệu, khóa mã hóa AES-GCM và Nhật ký hoạt động trên thiết bị đang sẵn sàng.
          </Text>

          {!authReady || checking ? (
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>
                Đang kiểm tra SQLite, SecureStore và mã hóa AES-256-GCM...
              </Text>
            </View>
          ) : result ? (
            <>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cơ sở dữ liệu SQLite</Text>
                  <Text style={[styles.infoValue, styles.successValue]}>
                    SẴN SÀNG
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Cấu trúc dữ liệu</Text>
                  <Text style={styles.infoValue}>
                    v{result.database.version} · {result.database.tableCount} bảng
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Chế độ nhật ký SQLite</Text>
                  <Text style={styles.infoValue}>
                    {result.database.journalMode}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Xóa mềm hồ sơ bệnh nhân</Text>
                  <Text style={styles.infoValue}>SẴN SÀNG · lưu tối đa 30 ngày trước khi xóa cứng</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã hóa</Text>
                  <Text style={[styles.infoValue, styles.successValue]}>
                    AES-256-GCM
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nơi lưu khóa</Text>
                  <Text style={styles.infoValue}>
                    SecureStore · {result.encryption.keyBits} bit
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kiểm tra mã hóa / giải mã</Text>
                  <Text style={[styles.infoValue, styles.successValue]}>
                    {result.encryption.roundTrip ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nhật ký hoạt động</Text>
                  <Text style={styles.infoValue}>
                    {result.audit.eventCount} mục nhật ký trên thiết bị
                  </Text>
                </View>

                <View style={styles.infoRowLast}>
                  <Text style={styles.infoLabel}>Có cần Firebase cho 02D không?</Text>
                  <Text style={[styles.infoValue, styles.successValue]}>
                    KHÔNG
                  </Text>
                </View>
              </View>

              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Phạm vi bảo mật ở bước 02D</Text>
                <Text style={styles.warningText}>
                  Dữ liệu nhạy cảm được mã hóa trước khi ghi vào SQLite. Tệp cơ sở dữ liệu hiện chưa dùng SQLCipher để mã hóa toàn bộ tệp. Video khuôn mặt gốc cũng không được tự động tải lên đám mây.
                </Text>
              </View>
            </>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                02D chưa đạt: {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonBlock}>
            {result?.ready ? (
              <>
                <AppButton
                  label="MỞ HỒ SƠ BỆNH NHÂN · 02E"
                  onPress={() => router.push(PATIENTS_HREF)}
                />
                <View style={styles.buttonGap} />
              </>
            ) : null}
            <AppButton
              label={checking ? 'ĐANG KIỂM TRA...' : 'CHẠY LẠI KIỂM TRA 02D'}
              disabled={checking || !user}
              variant={result?.ready ? 'outline' : 'primary'}
              onPress={() => void runCheck()}
            />
            <View style={styles.buttonGap} />
            <AppButton
              label="VỀ PHIÊN LÀM VIỆC"
              variant="text"
              onPress={() => router.replace('/auth/session')}
            />
          </View>

          <Text style={styles.footerNote}>
            Bước 02D chưa phải chứng nhận tuân thủ HIPAA/GDPR. Bước 02E sử dụng nền tảng dữ liệu này để tạo, tìm kiếm, xem lịch sử, chỉnh sửa và xóa mềm hồ sơ bệnh nhân.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
