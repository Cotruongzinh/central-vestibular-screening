import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppTextInput as TextInput } from '@/components/i18n/AppTextInput';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getClinicianAccessContext, roleLabel } from '@/services/access-control.service';
import {
  getClinicianLogoErrorMessage,
  persistClinicianLogo,
  removeManagedClinicianLogo,
} from '@/services/clinician-logo.service';
import {
  getClinicianProfile,
  getClinicianProfileErrorMessage,
  updateClinicianProfile,
} from '@/services/clinician-profile.service';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import { styles } from '@/styles/screens/foundation/clinician-profile.styles';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { ClinicianProfileInput, ClinicianProfileView } from '@/types/clinician-profile';

const EMPTY_INPUT: ClinicianProfileInput = {
  displayName: '',
  specialty: '',
  facility: '',
  clinicLogoUri: '',
};

export default function ClinicianProfileScreen() {
  const [access, setAccess] = useState<ClinicianAccessContext | null>(null);
  const [profile, setProfile] = useState<ClinicianProfileView | null>(null);
  const [form, setForm] = useState<ClinicianProfileInput>(EMPTY_INPUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = getCurrentClinician();
        if (!user?.emailVerified) {
          router.replace('/auth/login');
          return;
        }

        const nextAccess = await getClinicianAccessContext(user.uid, user.email ?? '');
        const nextProfile = await getClinicianProfile(user.uid, user.email ?? '');
        if (!active) return;

        setAccess(nextAccess);
        setProfile(nextProfile);
        setForm({
          displayName: nextProfile.displayName,
          specialty: nextProfile.specialty,
          facility: nextProfile.facility,
          clinicLogoUri: nextProfile.clinicLogoUri,
        });
      } catch (error) {
        if (active) setErrorMessage(getClinicianProfileErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function setField<K extends keyof ClinicianProfileInput>(
    key: K,
    value: ClinicianProfileInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
    setErrorMessage('');
    if (key === 'clinicLogoUri') setLogoLoadFailed(false);
  }

  async function handlePickLogo() {
    if (!access || logoBusy) return;

    setLogoBusy(true);
    setMessage('');
    setErrorMessage('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Cần quyền truy cập thư viện ảnh để chọn logo cơ sở.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const nextUri = await persistClinicianLogo({
        sourceUri: asset.uri,
        clinicianUid: access.uid,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });

      const currentDraftUri = form.clinicLogoUri.trim();
      const persistedUri = profile?.clinicLogoUri.trim() ?? '';

      if (currentDraftUri && currentDraftUri !== persistedUri) {
        await removeManagedClinicianLogo(currentDraftUri).catch(() => undefined);
      }

      setField('clinicLogoUri', nextUri);
      setMessage('Đã chọn logo. Nhấn Lưu hồ sơ chuyên viên để xác nhận thay đổi.');
    } catch (error) {
      setErrorMessage(getClinicianLogoErrorMessage(error));
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleRemoveLogo() {
    if (logoBusy) return;

    setLogoBusy(true);
    setMessage('');
    setErrorMessage('');

    try {
      const currentDraftUri = form.clinicLogoUri.trim();
      const persistedUri = profile?.clinicLogoUri.trim() ?? '';

      if (currentDraftUri && currentDraftUri !== persistedUri) {
        await removeManagedClinicianLogo(currentDraftUri).catch(() => undefined);
      }

      setField('clinicLogoUri', '');
      setMessage('Logo sẽ được xóa khi bạn lưu hồ sơ.');
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleSave() {
    if (!access) return;

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      const previousLogoUri = profile?.clinicLogoUri.trim() ?? '';
      const saved = await updateClinicianProfile(access, form);

      setProfile(saved);
      setForm({
        displayName: saved.displayName,
        specialty: saved.specialty,
        facility: saved.facility,
        clinicLogoUri: saved.clinicLogoUri,
      });

      if (previousLogoUri && previousLogoUri !== saved.clinicLogoUri.trim()) {
        await removeManagedClinicianLogo(previousLogoUri).catch(() => undefined);
      }

      setMessage('Đã lưu hồ sơ chuyên viên.');
    } catch (error) {
      setErrorMessage(getClinicianProfileErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const logoUri = form.clinicLogoUri.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>CENTRAL VESTIBULAR</Text>
              <Text style={styles.title}>Hồ sơ chuyên viên</Text>
              <Text style={styles.subtitle}>
                Thông tin chuyên môn và cơ sở làm việc dùng trong hồ sơ và báo cáo.
              </Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          {loading ? <Text style={styles.loading}>Đang tải hồ sơ chuyên viên...</Text> : null}

          {!loading && access && profile ? (
            <>
              <View style={styles.identityCard}>
                <View style={styles.identityCopy}>
                  <Text style={styles.identityLabel}>TÀI KHOẢN</Text>
                  <Text style={styles.email}>{profile.email}</Text>
                </View>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{roleLabel(access.role)}</Text>
                </View>
              </View>

              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                value={form.displayName}
                onChangeText={(value) => setField('displayName', value)}
                placeholder="Ví dụ: Nguyễn Văn B"
                placeholderTextColor="#9AAAB5"
                autoCapitalize="words"
                style={styles.input}
                maxLength={80}
              />

              <Text style={styles.label}>Chuyên khoa / vai trò chuyên môn</Text>
              <TextInput
                value={form.specialty}
                onChangeText={(value) => setField('specialty', value)}
                placeholder="Ví dụ: Bác sĩ / Kỹ thuật viên"
                placeholderTextColor="#9AAAB5"
                style={styles.input}
                maxLength={100}
              />

              <Text style={styles.label}>Cơ sở làm việc</Text>
              <TextInput
                value={form.facility}
                onChangeText={(value) => setField('facility', value)}
                placeholder="Ví dụ: Phòng khám ABC"
                placeholderTextColor="#9AAAB5"
                style={styles.input}
                maxLength={140}
              />

              <Text style={styles.label}>Logo cơ sở (tùy chọn)</Text>

              <View style={styles.logoCard}>
                {logoUri && !logoLoadFailed ? (
                  <Image
                    source={{ uri: logoUri }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                    onError={() => setLogoLoadFailed(true)}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>LOGO CƠ SỞ</Text>
                    <Text style={styles.logoPlaceholderSubtext}>
                      {logoUri ? 'Không thể hiển thị logo đã lưu.' : 'Chưa thiết lập logo.'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.logoActionGap} />
              <AppButton
                label={
                  logoBusy
                    ? 'ĐANG MỞ THƯ VIỆN...'
                    : logoUri
                      ? 'THAY ĐỔI LOGO'
                      : 'CHỌN ẢNH LOGO'
                }
                variant="outline"
                disabled={logoBusy || saving}
                onPress={() => void handlePickLogo()}
              />

              {logoUri ? (
                <>
                  <View style={styles.buttonGap} />
                  <AppButton
                    label="XÓA LOGO"
                    variant="text"
                    disabled={logoBusy || saving}
                    onPress={() => void handleRemoveLogo()}
                  />
                </>
              ) : null}

              <Text style={styles.helper}>
                Chọn ảnh vuông từ thư viện. Logo được lưu trên thiết bị và có thể
                xuất hiện trên báo cáo PDF.
              </Text>

              {message ? <Text style={styles.successMessage}>{message}</Text> : null}
              {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

              <View style={styles.primaryActionGap} />
              <AppButton
                label={saving ? 'ĐANG LƯU...' : 'LƯU HỒ SƠ CHUYÊN VIÊN'}
                disabled={saving || logoBusy}
                onPress={() => void handleSave()}
              />
              <View style={styles.buttonGap} />
              <AppButton
                label="VỀ PHIÊN LÀM VIỆC"
                variant="outline"
                onPress={() => router.replace(SESSION_HREF)}
              />
            </>
          ) : null}

          {!loading && (!access || !profile) ? (
            <Text style={styles.errorMessage}>
              {errorMessage || 'Không thể mở hồ sơ chuyên viên.'}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
