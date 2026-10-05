import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CLINICAL_TESTS, FULL_BATTERY_TESTS } from '@/constants/clinical-tests';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getLocalizedClinicalTest } from '@/i18n/clinical-test-copy';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { testInstructionsHref } from '@/navigation/test-routes';
import { ensureTrainingMode, isTrainingPatientId, stopTrainingMode } from '@/services/training-mode.service';
import { testAdministrationStyles as styles } from '@/styles/screens/tests/test-administration.styles';
import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function TestSelectScreen() {
  const router = useRouter();
  const language = useAppLanguage();
  const copy = getCoreFlowCopy(language).testSelect;
  const params = useLocalSearchParams();

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const trainingMode = isTrainingPatientId(patientId);

  useEffect(() => {
    if (trainingMode) ensureTrainingMode();
  }, [trainingMode]);

  const [mode, setMode] = useState<TestRunMode>('single');
  const [selectedTestId, setSelectedTestId] = useState<ClinicalTestId>('smooth-pursuit');

  const selectedTest = useMemo(
    () => CLINICAL_TESTS.find((test) => test.id === selectedTestId) ?? CLINICAL_TESTS[0],
    [selectedTestId],
  );

  const continueFlow = () => {
    if (!patientId) return;

    if (mode === 'battery') {
      const first = FULL_BATTERY_TESTS[0];
      router.push(
        testInstructionsHref({
          patientId,
          testId: first.id,
          mode: 'battery',
          batteryIndex: 0,
        }),
      );
      return;
    }

    if (selectedTest.id === 'npc') {
      router.push('/tests/npc');
      return;
    }

    router.push(
      testInstructionsHref({
        patientId,
        testId: selectedTest.id,
        mode: 'single',
        batteryIndex: 0,
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {trainingMode ? copy.phaseTraining : copy.phaseNormal}
          </Text>
          <Text style={styles.heroTitle}>
            {trainingMode ? copy.titleTraining : copy.titleNormal}
          </Text>
          <Text style={styles.heroSubtitle}>
            {trainingMode ? copy.subtitleTraining : copy.subtitleNormal}
          </Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{copy.sheetTitle}</Text>
          <Text style={styles.sheetBody}>{copy.sheetBody}</Text>

          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>
              {trainingMode ? copy.contextTraining : copy.contextPatient}
            </Text>
            <Text style={styles.contextValue}>
              {trainingMode ? copy.contextNoSave : patientId ? copy.contextCurrent : copy.contextMissing}
            </Text>
          </View>

          {trainingMode ? (
            <View style={styles.infoBoxCompact}>
              <Text style={styles.infoBoxTitle}>{copy.noPersistenceTitle}</Text>
              <Text style={styles.infoBoxBody}>{copy.noPersistenceBody}</Text>
            </View>
          ) : null}

          {!patientId ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>{copy.missingTitle}</Text>
              <Text style={styles.warningBody}>{copy.missingBody}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{copy.runMode}</Text>

          <View style={styles.modeGrid}>
            <Pressable
              onPress={() => setMode('single')}
              style={({ pressed }) => [
                styles.modeCard,
                mode === 'single' && styles.modeCardSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.modeTitle}>{copy.single}</Text>
              <Text style={styles.modeBody}>{copy.singleBody}</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('battery')}
              style={({ pressed }) => [
                styles.modeCard,
                mode === 'battery' && styles.modeCardSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.modeTitle}>{copy.battery}</Text>
              <Text style={styles.modeBody}>{copy.batteryBody}</Text>
            </Pressable>
          </View>

          <RequirementEvidenceStrip
            items={[
              {
                requirement: 'FR-13',
                value: mode === 'battery' ? 'Bộ kiểm tra đầy đủ · 6 bài' : 'Một bài kiểm tra',
              },
            ]}
          />

          {mode === 'battery' ? (
            <>
              <Text style={styles.sectionTitle}>{copy.batteryOrder}</Text>
              <View style={styles.batteryBox}>
                <Text style={styles.batteryTitle}>{copy.batteryTitle}</Text>
                {FULL_BATTERY_TESTS.map((test, index) => (
                  <View key={test.id} style={styles.batteryRow}>
                    <Text style={styles.batteryIndex}>{index + 1}</Text>
                    <Text style={styles.batteryItem}>
                      {getLocalizedClinicalTest(test, language).name}
                    </Text>
                    <Text style={styles.batteryDuration}>
                      {getLocalizedClinicalTest(test, language).duration}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{copy.chooseTest}</Text>
              <View style={styles.testList}>
                {CLINICAL_TESTS.map((test) => {
                  const selected = test.id === selectedTestId;
                  const protocolOnly = test.availability === 'protocol';
                  const localized = getLocalizedClinicalTest(test, language);

                  return (
                    <Pressable
                      key={test.id}
                      onPress={() => setSelectedTestId(test.id)}
                      style={({ pressed }) => [
                        styles.testCard,
                        selected && styles.testCardSelected,
                        protocolOnly && styles.testCardProtocol,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <View style={styles.testTopRow}>
                        <View style={styles.testTitleWrap}>
                          <Text style={styles.testName}>
                            {`${test.order}. ${localized.name}`}
                          </Text>
                          <Text style={styles.testMeta}>{localized.duration}</Text>
                        </View>

                        <View style={[styles.badge, protocolOnly && styles.badgeProtocol]}>
                          <Text style={[styles.badgeText, protocolOnly && styles.badgeProtocolText]}>
                            {protocolOnly ? 'BÀI RIÊNG' : copy.ready}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Pressable
            disabled={!patientId}
            onPress={continueFlow}
            style={({ pressed }) => [
              styles.button,
              !patientId && styles.disabled,
              pressed && patientId ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>
              {mode === 'battery'
                ? copy.startBattery
                : selectedTest.id === 'npc'
                  ? copy.openNpc
                  : copy.openInstructions}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (trainingMode) {
                stopTrainingMode();
                router.replace('/auth/session');
                return;
              }
              router.back();
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {trainingMode ? copy.exitTraining : copy.backPatient}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            {trainingMode ? copy.trainingFootnote : copy.normalFootnote}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
