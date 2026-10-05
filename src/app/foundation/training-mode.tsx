import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getTrainingModeState,
  startTrainingMode,
  stopTrainingMode,
  TRAINING_PATIENT_ID,
} from '@/services/training-mode.service';
import { styles } from '@/styles/screens/foundation/training-mode.styles';
import type { TrainingModeState } from '@/types/training-mode';

export default function TrainingModeScreen() {
  const [state, setState] = useState<TrainingModeState>(() => getTrainingModeState());

  useEffect(() => {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
    }
  }, []);

  function beginTraining() {
    const next = startTrainingMode();
    setState(next);
    router.push({
      pathname: '/tests/select',
      params: { patientId: TRAINING_PATIENT_ID },
    } as never);
  }

  function continueTraining() {
    router.push({
      pathname: '/tests/select',
      params: { patientId: TRAINING_PATIENT_ID },
    } as never);
  }

  function stop() {
    setState(stopTrainingMode());
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CENTRAL VESTIBULAR</Text>
          <Text style={styles.heroTitle}>Demo / training</Text>
          <Text style={styles.heroBody}>
            Chạy thử quy trình kiểm tra mà không lưu dữ liệu vào hồ sơ bệnh nhân.
          </Text>
        </View>

        <View style={styles.sheet}>
          <View style={[styles.statusPill, state.active && styles.statusPillActive]}>
            <Text style={[styles.statusText, state.active && styles.statusTextActive]}>
              {state.active ? 'ĐANG DEMO' : 'CHƯA BẮT ĐẦU'}
            </Text>
          </View>

          <Text style={styles.title}>
            {state.active ? 'Phiên demo đang hoạt động' : 'Chạy thử không lưu dữ liệu'}
          </Text>
          <Text style={styles.body}>
            Bạn vẫn có thể chạy một bài hoặc bộ 6 bài. Kết quả demo chỉ tồn tại
            tạm thời và bị chặn ở bước lưu.
          </Text>

          <View style={styles.checklist}>
            <View style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.rowText}>Không tạo hồ sơ hoặc lưu kết quả bệnh nhân.</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.rowText}>Vẫn chạy đầy đủ calibration, test và metrics.</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.dot} />
              <Text style={styles.rowText}>Có thể chọn một bài hoặc Full Battery 6 bài.</Text>
            </View>
          </View>

          <View style={{ height: 18 }} />

          <AppButton
            label={state.active ? 'TIẾP TỤC DEMO' : 'BẮT ĐẦU DEMO'}
            onPress={state.active ? continueTraining : beginTraining}
          />

          {state.active ? (
            <>
              <View style={styles.buttonGap} />
              <AppButton
                label="KẾT THÚC DEMO"
                variant="outline"
                onPress={stop}
              />
            </>
          ) : null}

          <View style={styles.buttonGap} />
          <AppButton
            label="VỀ PHIÊN LÀM VIỆC"
            variant="text"
            onPress={() => router.replace('/auth/session')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
