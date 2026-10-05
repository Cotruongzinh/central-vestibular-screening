import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/i18n/AppTextInput';
import { AppText as Text } from '@/components/i18n/AppText';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { npcStyles as styles } from '@/styles/screens/tests/npc.styles';
import { buildNpcSummary, NPC_REQUIRED_TRIALS, parseNpcDistance } from '@/tracking/npc/npc-protocol';
import type { NpcDraftTrial, NpcPhase, NpcTrial } from '@/types/npc';

const EMPTY_DRAFT: NpcDraftTrial = { breakDistanceCm: '', recoveryDistanceCm: '' };

export default function NpcProtocolScreen() {
  const language = useAppLanguage();
  const [phase, setPhase] = useState<NpcPhase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [trials, setTrials] = useState<NpcTrial[]>([]);
  const [draft, setDraft] = useState<NpcDraftTrial>(EMPTY_DRAFT);
  const currentTrial = trials.length + 1;
  const summary = useMemo(() => (trials.length ? buildNpcSummary(trials) : null), [trials]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, 3 - elapsed);
      setCountdown(remaining);
      if (remaining <= 0) { clearInterval(id); setPhase('approach'); }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  const resetDraft = () => setDraft(EMPTY_DRAFT);
  const startTrial = () => { if (trials.length < NPC_REQUIRED_TRIALS) { resetDraft(); setPhase('countdown'); } };

  const recordBreak = () => {
    const value = parseNpcDistance(draft.breakDistanceCm);
    if (value === null) {
      Alert.alert(
        language === 'en' ? 'Invalid BREAK distance' : 'Khoảng cách BREAK chưa hợp lệ',
        language === 'en'
          ? 'Enter a measured distance in centimeters greater than 0.'
          : 'Nhập khoảng cách đo được bằng cm, lớn hơn 0.',
      );
      return;
    }
    setPhase('break-recorded');
  };

  const saveRecovery = () => {
    const breakDistance = parseNpcDistance(draft.breakDistanceCm);
    const recoveryDistance = parseNpcDistance(draft.recoveryDistanceCm);
    if (breakDistance === null || recoveryDistance === null) {
      Alert.alert(
        language === 'en' ? 'Invalid distance' : 'Khoảng cách chưa hợp lệ',
        language === 'en'
          ? 'Both BREAK and RECOVERY require a measured distance in centimeters.'
          : 'BREAK và RECOVERY đều cần khoảng cách đo được bằng cm.',
      );
      return;
    }
    const next: NpcTrial = { trialNumber: currentTrial, breakDistanceCm: breakDistance, recoveryDistanceCm: recoveryDistance };
    const nextTrials = [...trials, next];
    setTrials(nextTrials);
    if (nextTrials.length >= NPC_REQUIRED_TRIALS) setPhase('complete');
    else { resetDraft(); setPhase('idle'); }
  };

  const restart = () => { setTrials([]); resetDraft(); setPhase('idle'); };

  const phaseContent = () => {
    if (phase === 'countdown') return <View style={styles.phaseBox}><LocalizedPipelineText language={language} style={styles.countdown}>{countdown || 'GO'}</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.phaseText}>Giữ đầu bệnh nhân ổn định. Chuẩn bị đưa mục tiêu từ xa lại gần mũi.</LocalizedPipelineText></View>;

    if (phase === 'approach') return <>
      <View style={styles.phaseBox}><LocalizedPipelineText language={language} style={styles.phaseBig}>ĐƯA MỤC TIÊU LẠI GẦN</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.phaseText}>Di chuyển mục tiêu chậm và đều về phía sống mũi. Khi bệnh nhân báo nhìn đôi hoặc chuyên viên xác nhận điểm BREAK, đo khoảng cách từ mục tiêu đến mũi rồi nhập bên dưới.</LocalizedPipelineText></View>
      <LocalizedPipelineText language={language} style={styles.label}>BREAK distance (cm)</LocalizedPipelineText>
      <TextInput value={draft.breakDistanceCm} onChangeText={(value) => setDraft((current) => ({ ...current, breakDistanceCm: value }))} keyboardType="decimal-pad" placeholder={language === 'en' ? 'Example: 6.5' : 'Ví dụ 6.5'} style={styles.input} />
      <Pressable style={styles.primaryButton} onPress={recordBreak}><LocalizedPipelineText language={language} style={styles.primaryText}>GHI NHẬN BREAK</LocalizedPipelineText></Pressable>
    </>;

    if (phase === 'break-recorded') return <>
      <View style={styles.phaseBox}><LocalizedPipelineText language={language} style={styles.phaseBig}>BREAK ĐÃ GHI</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.phaseText}>Bây giờ đưa mục tiêu ra xa dần cho tới khi bệnh nhân nhìn đơn trở lại hoặc chuyên viên xác nhận điểm RECOVERY.</LocalizedPipelineText></View>
      <Pressable style={styles.primaryButton} onPress={() => setPhase('recovery')}><LocalizedPipelineText language={language} style={styles.primaryText}>BẮT ĐẦU RECOVERY</LocalizedPipelineText></Pressable>
    </>;

    if (phase === 'recovery') return <>
      <View style={styles.phaseBox}><LocalizedPipelineText language={language} style={styles.phaseBig}>ĐƯA MỤC TIÊU RA XA</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.phaseText}>Khi hình ảnh đơn trở lại, đo khoảng cách từ mục tiêu đến mũi và nhập giá trị RECOVERY.</LocalizedPipelineText></View>
      <LocalizedPipelineText language={language} style={styles.label}>RECOVERY distance (cm)</LocalizedPipelineText>
      <TextInput value={draft.recoveryDistanceCm} onChangeText={(value) => setDraft((current) => ({ ...current, recoveryDistanceCm: value }))} keyboardType="decimal-pad" placeholder={language === 'en' ? 'Example: 9.0' : 'Ví dụ 9.0'} style={styles.input} />
      <Pressable style={styles.primaryButton} onPress={saveRecovery}><LocalizedPipelineText language={language} style={styles.primaryText}>LƯU LẦN ĐO {currentTrial}/{NPC_REQUIRED_TRIALS}</LocalizedPipelineText></Pressable>
    </>;

    if (phase === 'complete' && summary) return <>
      <View style={styles.greenCard}>
        <LocalizedPipelineText language={language} style={styles.greenTitle}>HOÀN TẤT NPC</LocalizedPipelineText>
        <LocalizedPipelineText language={language} style={styles.summaryValue}>{summary.medianBreakCm.toFixed(1)} cm</LocalizedPipelineText>
        <LocalizedPipelineText language={language} style={styles.cardBody}>Khoảng cách BREAK trung vị · {summary.trialCount}/{NPC_REQUIRED_TRIALS} lần đo</LocalizedPipelineText>
        <View style={styles.row}><LocalizedPipelineText language={language} style={styles.rowLabel}>RECOVERY trung vị</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.rowValue}>{summary.medianRecoveryCm.toFixed(1)} cm</LocalizedPipelineText></View>
        <View style={styles.row}><LocalizedPipelineText language={language} style={styles.rowLabel}>Break range</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.rowValue}>{summary.breakRangeCm.toFixed(1)} cm</LocalizedPipelineText></View>
        <View style={styles.row}><LocalizedPipelineText language={language} style={styles.rowLabel}>Recovery range</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.rowValue}>{summary.recoveryRangeCm.toFixed(1)} cm</LocalizedPipelineText></View>
      </View>
      {summary.trials.map((trial) => <View key={trial.trialNumber} style={styles.trialCard}><LocalizedPipelineText language={language} style={styles.trialHeader}>Lần đo {trial.trialNumber}</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.cardBody}>BREAK {trial.breakDistanceCm.toFixed(1)} cm · RECOVERY {trial.recoveryDistanceCm.toFixed(1)} cm</LocalizedPipelineText></View>)}
      <Pressable style={styles.primaryButton} onPress={() => router.push({ pathname: '/tests/npc-ready', params: { breakCm: String(summary.medianBreakCm), recoveryCm: String(summary.medianRecoveryCm), breakRangeCm: String(summary.breakRangeCm), recoveryRangeCm: String(summary.recoveryRangeCm) } })}><LocalizedPipelineText language={language} style={styles.primaryText}>XEM KẾT QUẢ NPC</LocalizedPipelineText></Pressable>
      <Pressable style={styles.secondaryButton} onPress={restart}><LocalizedPipelineText language={language} style={styles.secondaryText}>LÀM LẠI NPC</LocalizedPipelineText></Pressable>
    </>;

    return <>
      <View style={styles.phaseBox}><LocalizedPipelineText language={language} style={styles.phaseBig}>LẦN ĐO {currentTrial}/{NPC_REQUIRED_TRIALS}</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.phaseText}>Đặt mục tiêu ở xa trước khi bắt đầu. Chỉ bắt đầu khi bệnh nhân sẵn sàng và đầu ở tư thế ổn định.</LocalizedPipelineText></View>
      <Pressable style={styles.primaryButton} onPress={startTrial}><LocalizedPipelineText language={language} style={styles.primaryText}>BẮT ĐẦU LẦN ĐO {currentTrial}</LocalizedPipelineText></Pressable>
    </>;
  };

  return <SafeAreaView style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.eyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Điểm hội tụ gần (NPC)</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroBody}>Đo NPC với chuyên viên hướng dẫn.</LocalizedPipelineText>
        </View>
        <View style={styles.sheet}>
          <View style={styles.badge}><LocalizedPipelineText language={language} style={styles.badgeText}>CHẾ ĐỘ CÓ CHUYÊN VIÊN HỖ TRỢ</LocalizedPipelineText></View>
          <RequirementEvidenceStrip
            items={[{ requirement: 'FR-22', value: 'BREAK + RECOVERY · cm' }]}
          />
          <LocalizedPipelineText language={language} style={styles.title}>Quy trình NPC</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>Chuyên viên đưa mục tiêu lại gần mũi, ghi nhận BREAK, sau đó đưa ra xa để ghi RECOVERY. Thực hiện 3 lần đo và lấy trung vị.</LocalizedPipelineText>
          <View style={styles.infoCard}><LocalizedPipelineText language={language} style={styles.sectionTitle}>Cách đo</LocalizedPipelineText><LocalizedPipelineText language={language} style={styles.cardBody}>Đo khoảng cách bằng cm tại thời điểm BREAK và RECOVERY.</LocalizedPipelineText></View>
          
          {phaseContent()}
          <LocalizedPipelineText language={language} style={styles.footerNote}>Kết quả được lưu dưới dạng số đo BREAK và RECOVERY.</LocalizedPipelineText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
