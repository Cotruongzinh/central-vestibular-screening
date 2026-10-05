import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { useAppLanguage } from '@/hooks/use-app-language';
import { translateUiText } from '@/i18n/global-ui-copy';
import { getClinicianAccessContext, roleLabel } from '@/services/access-control.service';
import { getCurrentClinician, signOutClinician } from '@/services/firebase/auth.service';
import {
  canWipeAllLocalData,
  getLocalWipeSummary,
  localWipeErrorMessage,
  wipeAllLocalDataForSharedDevice,
} from '@/services/local-wipe.service';
import { styles } from '@/styles/screens/foundation/local-wipe.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { LocalWipeSummary } from '@/types/local-wipe';

export default function LocalWipeFoundationScreen() {
  const language = useAppLanguage();
  const tr = (text: string) => translateUiText(language, text);
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [summary, setSummary] = useState<LocalWipeSummary | null>(null);
  const [armed, setArmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wiping, setWiping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canWipe = useMemo(() => (access ? canWipeAllLocalData(access) : false), [access]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified) {
          router.replace('/auth/login');
          return;
        }

        const [nextAccess, nextSummary] = await Promise.all([
          getClinicianAccessContext(user.uid, user.email ?? ''),
          getLocalWipeSummary(),
        ]);

        if (active) {
          setAccess(nextAccess);
          setSummary(nextSummary);
        }
      } catch (error) {
        if (active) setErrorMessage(localWipeErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function confirmWipe() {
    if (!access || !armed || !canWipe || wiping) return;

    Alert.alert(
      tr('Xóa dữ liệu trên thiết bị và đăng xuất?'),
      tr('Thao tác này sẽ xóa hồ sơ bệnh nhân, kết quả kiểm tra, dữ liệu theo dõi mắt, ghi chú, nhật ký hoạt động, thông tin phân quyền, hàng đợi đồng bộ và khóa mã hóa trên thiết bị. Không thể khôi phục từ dữ liệu trên thiết bị.'),
      [
        { text: tr('HỦY'), style: 'cancel' },
        {
          text: tr('XÓA VÀ ĐĂNG XUẤT'),
          style: 'destructive',
          onPress: () => {
            void performWipe();
          },
        },
      ],
    );
  }

  async function performWipe() {
    if (!access) return;

    setWiping(true);
    setErrorMessage('');
    try {
      await wipeAllLocalDataForSharedDevice(access);
      await signOutClinician();
      router.replace('/auth/login');
    } catch (error) {
      setErrorMessage(localWipeErrorMessage(error));
      setWiping(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.brand}></Text>
              <Text style={styles.headerTitle}>Xóa dữ liệu trên thiết bị dùng chung</Text>
            </View>
            <AppEmblem compact />
          </View>
          <Text style={styles.headerSubtitle}>
            Tùy chọn xóa toàn bộ dữ liệu ứng dụng trên thiết bị khi đăng xuất khỏi thiết bị dùng chung.
          </Text>
        </View>

        <View style={styles.sheet}>
          {loading ? <Text style={styles.loading}>Đang kiểm tra phạm vi dữ liệu trên thiết bị...</Text> : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Không thể tiếp tục</Text>
              <Text style={styles.errorBody}>{errorMessage}</Text>
            </View>
          ) : null}

          {access && summary ? (
            <>
              <View style={access.role === 'admin' ? styles.adminPill : styles.clinicianPill}>
                <Text style={access.role === 'admin' ? styles.adminPillText : styles.clinicianPillText}>
                  {roleLabel(access.role)}
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Dữ liệu sẽ bị xóa</Text>
              <View style={styles.countCard}>
                <View style={styles.countRow}><Text style={styles.countLabel}>Hồ sơ bệnh nhân</Text><Text style={styles.countValue}>{summary.counts.patients}</Text></View>
                <View style={styles.countRow}><Text style={styles.countLabel}>Phiên kiểm tra / kết quả</Text><Text style={styles.countValue}>{summary.counts.testSessions + summary.counts.testResults}</Text></View>
                <View style={styles.countRow}><Text style={styles.countLabel}>Dữ liệu theo dõi mắt</Text><Text style={styles.countValue}>{summary.counts.eyeTraces}</Text></View>
                <View style={styles.countRow}><Text style={styles.countLabel}>Ghi chú chuyên viên</Text><Text style={styles.countValue}>{summary.counts.clinicianNotes}</Text></View>
                <View style={styles.countRow}><Text style={styles.countLabel}>Nhật ký hoạt động</Text><Text style={styles.countValue}>{summary.counts.auditLogs}</Text></View>
                <View style={styles.countRowLast}><Text style={styles.countLabel}>Tổng số bản ghi</Text><Text style={styles.totalValue}>{summary.totalRows}</Text></View>
              </View>

              <View style={styles.cryptoCard}>
                <Text style={styles.cryptoTitle}>Phạm vi xóa dữ liệu mã hóa</Text>
                <Text style={styles.cryptoBody}>
                  03R bật cơ chế secure_delete của SQLite, xóa các bản ghi, dọn cơ sở dữ liệu và nhật ký ghi, sau đó xóa khóa AES-256 trong SecureStore. Tài khoản Firebase không bị xóa; chỉ phiên đăng nhập hiện tại được đăng xuất.
                </Text>
              </View>

              {!canWipe ? (
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>CHUYÊN VIÊN LÂM SÀNG · KHÔNG CHO PHÉP</Text>
                  <Text style={styles.warningBody}>
                    Xóa toàn bộ dữ liệu trên thiết bị có thể ảnh hưởng đến dữ liệu của nhiều người dùng, vì vậy chỉ Quản trị viên được phép thực hiện thao tác này.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.armCard}>
                    <View style={styles.armCopy}>
                      <Text style={styles.armTitle}>Xóa dữ liệu trên thiết bị khi đăng xuất</Text>
                      <Text style={styles.armBody}>
                        Mặc định đang tắt. Bật công tắc để cho phép nút xóa dữ liệu bên dưới.
                      </Text>
                    </View>
                    <Switch
                      value={armed}
                      onValueChange={setArmed}
                      disabled={wiping}
                    />
                  </View>

                  <View style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Không thể khôi phục từ dữ liệu trên thiết bị</Text>
                    <Text style={styles.warningBody}>
                      Thông tin vai trò trên thiết bị cũng sẽ bị xóa. Ở bản thử nghiệm hiện tại, tài khoản xác minh đầu tiên đăng nhập lại có thể được khởi tạo thành Quản trị viên. Bản phát hành chính thức phải xác thực quyền từ máy chủ.
                    </Text>
                  </View>

                  <AppButton
                    label={wiping ? 'ĐANG XÓA DỮ LIỆU...' : 'ĐĂNG XUẤT + XÓA DỮ LIỆU'}
                    disabled={!armed || wiping}
                    onPress={confirmWipe}
                  />
                  <View style={styles.buttonGap} />
                </>
              )}

              <AppButton
                label="VỀ PHIÊN LÀM VIỆC"
                variant="outline"
                disabled={wiping}
                onPress={() => router.replace('/auth/session')}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
