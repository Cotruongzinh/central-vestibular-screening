import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { npcStyles as styles } from '@/styles/screens/tests/npc.styles';

function numberParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

export default function NpcReadyScreen() {
  const language = useAppLanguage();
  const params = useLocalSearchParams<{
    breakCm?: string;
    recoveryCm?: string;
    breakRangeCm?: string;
    recoveryRangeCm?: string;
  }>();

  const breakCm = numberParam(params.breakCm);
  const recoveryCm = numberParam(params.recoveryCm);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.eyebrow}>
            KẾT QUẢ NPC
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>
            Convergence / NPC
          </LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroBody}>
            Đã hoàn tất 3 lần đo với chuyên viên.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip
            items={[{ requirement: 'FR-22', value: 'NPC · BREAK / RECOVERY' }]}
          />

          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>
              HOÀN TẤT
            </LocalizedPipelineText>
          </View>

          <View style={styles.greenCard}>
            <LocalizedPipelineText language={language} style={styles.greenTitle}>
              BREAK TRUNG VỊ
            </LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.summaryValue}>
              {Number.isFinite(breakCm) ? breakCm.toFixed(1) : '—'} cm
            </LocalizedPipelineText>

            <View style={styles.row}>
              <LocalizedPipelineText language={language} style={styles.rowLabel}>
                RECOVERY trung vị
              </LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.rowValue}>
                {Number.isFinite(recoveryCm) ? recoveryCm.toFixed(1) : '—'} cm
              </LocalizedPipelineText>
            </View>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/tests/npc')}
          >
            <LocalizedPipelineText language={language} style={styles.primaryText}>
              ĐO LẠI NPC
            </LocalizedPipelineText>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/tests/select')}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryText}>
              VỀ DANH SÁCH BÀI KIỂM TRA
            </LocalizedPipelineText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
