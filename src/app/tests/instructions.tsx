import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FULL_BATTERY_TESTS, getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getLocalizedClinicalTest } from '@/i18n/clinical-test-copy';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { TestStimulusPreview } from '@/components/tests/TestStimulusPreview';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import {
  testBatteryQuickCalibrationHref,
  testCalibrationHref,
} from '@/navigation/test-routes';
import { testAdministrationStyles as styles } from '@/styles/screens/tests/test-administration.styles';
import type { TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestInstructionsScreen() {
  const router = useRouter();
  const language = useAppLanguage();
  const copy = getCoreFlowCopy(language).instructions;
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const localizedTest = test ? getLocalizedClinicalTest(test, language) : undefined;

  if (!patientId || !test) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{copy.phaseError}</Text>
            <Text style={styles.heroTitle}>{copy.cantOpen}</Text>
          </View>
          <View style={styles.sheet}>
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>{copy.missingNavTitle}</Text>
              <Text style={styles.warningBody}>{copy.missingNavBody}</Text>
            </View>
            <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{getCoreFlowCopy(language).common.back}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const batteryPosition =
    mode === 'battery'
      ? `${Math.min(batteryIndex + 1, FULL_BATTERY_TESTS.length)}/${FULL_BATTERY_TESTS.length}`
      : null;

  const useQuickBatterySetup = mode === 'battery' && batteryIndex > 0;

  const continueToSetup = () => {
    if (useQuickBatterySetup) {
      router.push(
        testBatteryQuickCalibrationHref({
          patientId,
          testId: test.id,
          mode: 'battery',
          batteryIndex,
        }),
      );
      return;
    }

    router.push(
      testCalibrationHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{copy.phase}</Text>
          <Text style={styles.heroTitle}>{localizedTest?.name}</Text>
          <Text style={styles.heroSubtitle}>
            {mode === 'battery'
              ? `${copy.batteryStep} ${batteryPosition}`
              : copy.singleProtocol}
          </Text>
        </View>

        <View style={styles.sheet}>
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>{copy.context}</Text>
            <Text style={styles.contextValue}>{copy.contextCurrent}</Text>
          </View>

          <Text style={styles.sheetTitle}>{copy.title}</Text>
          <Text style={styles.sheetBody}>
            {useQuickBatterySetup ? copy.quickBody : copy.normalBody}
          </Text>

          <RequirementEvidenceStrip
            items={[
              { requirement: 'FR-14', value: 'Hướng dẫn trước kiểm tra' },
              {
                requirement: 'FR-15',
                value: useQuickBatterySetup ? 'Hiệu chỉnh 5 điểm' : 'Hiệu chỉnh 9 điểm',
              },
            ]}
          />

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionLabel}>{copy.purpose}</Text>
            <Text style={styles.instructionText}>{localizedTest?.purpose}</Text>
          </View>

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionLabel}>{copy.clinician}</Text>
            <Text style={styles.instructionText}>{localizedTest?.clinicianInstruction}</Text>
          </View>

          <View style={styles.instructionBlock}>
            <Text style={styles.instructionLabel}>{copy.patient}</Text>
            <Text style={styles.instructionText}>{localizedTest?.patientInstruction}</Text>
          </View>

          <Text style={styles.sectionTitle}>{copy.stimulusPreview}</Text>
          <TestStimulusPreview testId={test.id} language={language} />

          <View style={styles.measurementBox}>
            <Text style={styles.instructionLabel}>{copy.measurements}</Text>
            {localizedTest?.measurements.map((measurement) => (
              <Text key={measurement} style={styles.measurementItem}>
                • {measurement}
              </Text>
            ))}
          </View>

          {test.id === 'npc' ? (
            <View style={styles.infoBoxCompact}>
              <Text style={styles.infoBoxTitle}>{copy.npcTitle}</Text>
              <Text style={styles.infoBoxBody}>{copy.npcBody}</Text>
            </View>
          ) : null}

          {useQuickBatterySetup ? (
            <View style={styles.infoBoxCompact}>
              <Text style={styles.infoBoxTitle}>{copy.quickTitle}</Text>
              <Text style={styles.infoBoxBody}>
                {language === 'en'
                  ? `Test ${batteryIndex + 1}/6. ${copy.quickBody2}`
                  : `Bài ${batteryIndex + 1}/6. ${copy.quickBody2}`}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={continueToSetup}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>
              {useQuickBatterySetup ? copy.quickContinue : copy.continue}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>{copy.change}</Text>
          </Pressable>

          <Text style={styles.footnote}>{copy.footnote}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
