import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { FULL_BATTERY_TESTS, getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { getStimulusRequirementSummary } from '@/constants/test-requirement-evidence';
import { translateUiText } from '@/i18n/global-ui-copy';
import { trackingStatusVi } from '@/i18n/technical-copy';
import { testRuntimeReadyHref } from '@/navigation/test-routes';
import { runtimeStyles as styles } from '@/styles/screens/tests/runtime.styles';
import { createCalibrationTrackerHtml } from '@/tracking/calibration/createCalibrationTrackerHtml';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { getGazeMappingResult } from '@/tracking/mapping/mapping-store';
import { predictGaze } from '@/tracking/mapping/gaze-mapper';
import { saveEyeTrace } from '@/tracking/runtime/eye-trace-store';
import { assessRuntimeQuality } from '@/tracking/runtime/runtime-quality';
import {
  getStimulusDurationMs,
  getStimulusFrame,
  getStimulusKind,
} from '@/tracking/runtime/stimulus-runtime';
import { getFixationValidation } from '@/tracking/validation/validation-store';
import type { EyeTraceSample, RuntimeQualityLevel } from '@/types/test-runtime';
import type { TestRunMode } from '@/types/test-administration';
import type { EyeTrackingSpikeMessage } from '@/types/tracking';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type RuntimePhase =
  | 'ready'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'complete';

type AssetState = Extract<EyeTrackingSpikeMessage, { type: 'asset-status' }>;
type CameraState = Extract<EyeTrackingSpikeMessage, { type: 'camera-status' }>;
type MediaPipeState = Extract<EyeTrackingSpikeMessage, { type: 'mediapipe-status' }>;
type BaselineState = Extract<EyeTrackingSpikeMessage, { type: 'baseline-status' }>;
type TrackingState = Extract<EyeTrackingSpikeMessage, { type: 'tracking' }>;

export default function TestRuntimeScreen() {
  const language = useAppLanguage();
  const tr = (text: string) => translateUiText(language, text);
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const webViewRef = useRef<WebView>(null);
  const sheetYRef = useRef(0);
  const stageYRef = useRef(0);

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const calibrationId = firstParam(params.calibrationId as string | string[] | undefined);
  const mappingId = firstParam(params.mappingId as string | string[] | undefined);
  const validationId = firstParam(params.validationId as string | string[] | undefined);
  const setupModeParam = firstParam(params.setupMode as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(
    0,
    Number.parseInt(batteryIndexParam ?? '0', 10) || 0,
  );
  const quickSetup = setupModeParam === 'quick';
  const test = isClinicalTestId(testIdParam)
    ? getClinicalTest(testIdParam)
    : undefined;

  const calibration = getCalibrationDataset(calibrationId);
  const mapping = getGazeMappingResult(mappingId);
  const validation = getFixationValidation(validationId);

  const contextValid = Boolean(
    patientId &&
      test &&
      calibration &&
      mapping &&
      validation &&
      validation.technicalQualityPass &&
      mapping.id === validation.mappingId &&
      mapping.calibrationId === calibration.id &&
      validation.patientId === patientId &&
      validation.testId === test.id &&
      validation.mode === mode &&
      validation.batteryIndex === batteryIndex,
  );

  const trackerHtml = useMemo(() => createCalibrationTrackerHtml(), []);
  const stimulusKind = test ? getStimulusKind(test.id) : 'unsupported';
  const expectedDurationMs = test ? getStimulusDurationMs(test.id) : 0;

  const [assetStatus, setAssetStatus] = useState<AssetState>();
  const [camera, setCamera] = useState<CameraState>();
  const [mediaPipe, setMediaPipe] = useState<MediaPipeState>();
  const [baseline, setBaseline] = useState<BaselineState>();
  const [tracking, setTracking] = useState<TrackingState>();

  const [phase, setPhase] = useState<RuntimePhase>('ready');
  const phaseRef = useRef<RuntimePhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const [stimulusFrame, setStimulusFrame] = useState(() =>
    getStimulusFrame(stimulusKind, 0),
  );
  const [errorMessage, setErrorMessage] = useState<string>();

  const traceRef = useRef<EyeTraceSample[]>([]);
  const qualityCountsRef = useRef<Record<RuntimeQualityLevel, number>>({
    green: 0,
    yellow: 0,
    red: 0,
  });
  const [qualityCounts, setQualityCounts] = useState(qualityCountsRef.current);

  const startedAtRef = useRef(0);
  const lastTickRef = useRef(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runtimeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (runtimeTimerRef.current) {
        clearInterval(runtimeTimerRef.current);
      }
    };
  }, []);

  const setPhaseBoth = (next: RuntimePhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const currentQuality = assessRuntimeQuality(tracking);

  const scrollStageIntoView = (animated = true) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, sheetYRef.current + stageYRef.current - 8),
      animated,
    });
  };

  const trackerReady =
    contextValid &&
    stimulusKind !== 'unsupported' &&
    assetStatus?.status === 'ready' &&
    mediaPipe?.status === 'ready' &&
    camera?.status === 'ready' &&
    baseline?.status === 'ready' &&
    tracking?.faceDetected === true;

  const updateRuntimeClock = () => {
    if (phaseRef.current !== 'running') {
      return;
    }

    const now = Date.now();
    const delta = Math.max(0, now - lastTickRef.current);
    lastTickRef.current = now;

    const nextElapsed = Math.min(
      expectedDurationMs,
      elapsedRef.current + delta,
    );

    elapsedRef.current = nextElapsed;
    setElapsedMs(nextElapsed);
    setStimulusFrame(getStimulusFrame(stimulusKind, nextElapsed));

    if (nextElapsed >= expectedDurationMs) {
      if (runtimeTimerRef.current) {
        clearInterval(runtimeTimerRef.current);
        runtimeTimerRef.current = null;
      }
      setPhaseBoth('complete');
    }
  };

  const startRuntimeTimer = () => {
    if (runtimeTimerRef.current) {
      clearInterval(runtimeTimerRef.current);
    }

    lastTickRef.current = Date.now();
    runtimeTimerRef.current = setInterval(updateRuntimeClock, 33);
  };

  const startRuntime = () => {
    traceRef.current = [];
    qualityCountsRef.current = { green: 0, yellow: 0, red: 0 };
    setQualityCounts({ ...qualityCountsRef.current });
    elapsedRef.current = 0;
    setElapsedMs(0);
    setStimulusFrame(getStimulusFrame(stimulusKind, 0));
    startedAtRef.current = Date.now();
    setErrorMessage(undefined);
    setCountdown(3);
    setPhaseBoth('countdown');

    webViewRef.current?.injectJavaScript(`
      if (window.__resetHeadBaseline) {
        window.__resetHeadBaseline();
      }
      true;
    `);

    scrollStageIntoView(true);

    let remaining = 3;

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;

      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }

      setCountdown(0);
      setPhaseBoth('running');
      startRuntimeTimer();
    }, 1000);
  };

  const pauseRuntime = () => {
    if (phaseRef.current !== 'running') {
      return;
    }

    if (runtimeTimerRef.current) {
      clearInterval(runtimeTimerRef.current);
      runtimeTimerRef.current = null;
    }

    setPhaseBoth('paused');
  };

  const resumeRuntime = () => {
    if (phaseRef.current !== 'paused') {
      return;
    }

    scrollStageIntoView(true);
    setPhaseBoth('running');
    startRuntimeTimer();
  };

  const cancelRuntime = () => {
    Alert.alert(
      tr('Hủy bài kiểm tra?'),
      tr('Dữ liệu theo dõi mắt của lần chạy hiện tại sẽ không được lưu.'),
      [
        { text: tr('Tiếp tục'), style: 'cancel' },
        {
          text: tr('Hủy bài kiểm tra'),
          style: 'destructive',
          onPress: () => {
            if (runtimeTimerRef.current) {
              clearInterval(runtimeTimerRef.current);
              runtimeTimerRef.current = null;
            }
            traceRef.current = [];
            router.back();
          },
        },
      ],
    );
  };

  const recordTrackingSample = (value: TrackingState) => {
    if (phaseRef.current !== 'running' || !mapping) {
      return;
    }

    const eye = value.binocularEye;
    const head = value.headPose;
    const quality = assessRuntimeQuality(value);
    qualityCountsRef.current[quality.level] += 1;

    const h =
      eye?.horizontal === null || eye?.horizontal === undefined
        ? null
        : eye.horizontal;
    const v =
      eye?.vertical === null || eye?.vertical === undefined
        ? null
        : eye.vertical;

    let gazeX: number | null = null;
    let gazeY: number | null = null;

    if (h !== null && v !== null) {
      const prediction = predictGaze(mapping.model, h, v);

      if (Number.isFinite(prediction.x) && Number.isFinite(prediction.y)) {
        gazeX = prediction.x;
        gazeY = prediction.y;
      }
    }

    const frame = getStimulusFrame(stimulusKind, elapsedRef.current);

    traceRef.current.push({
      timestamp: Date.now(),
      elapsedMs: elapsedRef.current,
      h,
      v,
      gazeX,
      gazeY,
      stimulusX: frame.stimulusX,
      stimulusY: frame.stimulusY,
      expectedX: frame.expectedX,
      expectedY: frame.expectedY,
      trackingFps: value.trackingFps ?? null,
      faceDetected: value.faceDetected,
      yaw: head?.yawDeltaDeg ?? null,
      pitch: head?.pitchDeltaDeg ?? null,
      roll: head?.rollDeltaDeg ?? null,
      shiftX: head?.shiftX ?? null,
      shiftY: head?.shiftY ?? null,
      quality: quality.level,
    });

    if (traceRef.current.length % 10 === 0) {
      setQualityCounts({ ...qualityCountsRef.current });
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as EyeTrackingSpikeMessage;

      switch (parsed.type) {
        case 'asset-status':
          setAssetStatus(parsed);
          if (parsed.status === 'error' && parsed.message) {
            setErrorMessage(parsed.message);
          }
          break;
        case 'camera-status':
          setCamera(parsed);
          if (parsed.status === 'error' && parsed.message) {
            setErrorMessage(parsed.message);
          }
          break;
        case 'mediapipe-status':
          setMediaPipe(parsed);
          if (parsed.status === 'error' && parsed.message) {
            setErrorMessage(parsed.message);
          }
          break;
        case 'baseline-status':
          setBaseline(parsed);
          break;
        case 'tracking':
          setTracking(parsed);
          recordTrackingSample(parsed);
          break;
        case 'tracking-error':
        case 'boot-error':
          setErrorMessage(parsed.message);
          break;
      }
    } catch {
      // Ignore non-JSON bridge messages.
    }
  };

  const saveTraceAndContinue = () => {
    if (
      !contextValid ||
      !patientId ||
      !test ||
      !calibration ||
      !mapping ||
      !validation ||
      phase !== 'complete'
    ) {
      return;
    }

    const samples = [...traceRef.current];
    const qualityCountsFinal = { ...qualityCountsRef.current };
    const mappedSamples = samples.filter(
      (sample) => sample.gazeX !== null && sample.gazeY !== null,
    );

    if (mappedSamples.length < 50) {
      setErrorMessage(
        'Dữ liệu theo dõi mắt chưa đủ mẫu hợp lệ để hoàn tất 03E. Hãy chạy lại bài kiểm tra.',
      );
      return;
    }

    const trace = saveEyeTrace({
      patientId,
      testId: test.id,
      mode,
      batteryIndex,
      calibrationId: calibration.id,
      mappingId: mapping.id,
      validationId: validation.id,
      startedAt: startedAtRef.current,
      finishedAt: Date.now(),
      expectedDurationMs,
      activeDurationMs: elapsedRef.current,
      samples,
      qualityCounts: qualityCountsFinal,
      completed: elapsedRef.current >= expectedDurationMs,
    });

    router.push(
      testRuntimeReadyHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId: calibration.id,
        mappingId: mapping.id,
        validationId: validation.id,
        traceId: trace.id,
      }),
    );
  };

  const progress = expectedDurationMs > 0 ? elapsedMs / expectedDurationMs : 0;
  const remainingMs = Math.max(0, expectedDurationMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const mappedCount = traceRef.current.filter(
    (sample) => sample.gazeX !== null && sample.gazeY !== null,
  ).length;

  const oknBars =
    stimulusKind === 'okn'
      ? Array.from({ length: 10 }, (_, index) => {
          const x = ((index * 0.14 + stimulusFrame.oknPhase) % 1.4) - 0.2;
          return x;
        })
      : [];

  if (!contextValid || !patientId || !test || !calibration || !mapping || !validation) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Không mở được bước chạy bài kiểm tra</LocalizedPipelineText>
          </View>
          <View
          style={styles.sheet}
          onLayout={(event) => {
            sheetYRef.current = event.nativeEvent.layout.y;
          }}
        >
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Chưa sẵn sàng</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>
                Hãy quay lại bước chuẩn bị và thử lại.
              </LocalizedPipelineText>
            </View>
            <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
              <LocalizedPipelineText language={language} style={styles.secondaryText}>QUAY LẠI</LocalizedPipelineText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stimulusKind === 'unsupported') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Quy trình chưa hỗ trợ bước chạy bài này</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroSubtitle}>{test.nameVi}</LocalizedPipelineText>
          </View>
          <View style={styles.sheet}>
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>NPC / quy trình riêng</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>
                03E hiện hỗ trợ bước chạy cho 6 bài trong bộ kiểm tra đầy đủ. Convergence / NPC tiếp tục dùng quy trình riêng theo FR-22.
              </LocalizedPipelineText>
            </View>
            <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
              <LocalizedPipelineText language={language} style={styles.secondaryText}>QUAY LẠI</LocalizedPipelineText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={phase !== 'running' && phase !== 'countdown'}
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>{test.nameVi}</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Giữ đầu và điện thoại ổn định trong suốt bài kiểm tra.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>
              'SẴN SÀNG'
            </LocalizedPipelineText>
          </View>

          <View style={styles.contextCard}>
            <LocalizedPipelineText language={language} style={styles.contextLabel}>CHẾ ĐỘ</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.contextValue}>
              {mode === 'battery' ? `Bộ kiểm tra · bài ${batteryIndex + 1}/${FULL_BATTERY_TESTS.length}` : 'Một bài kiểm tra'}
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>Thực hiện bài kiểm tra</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            Theo dõi mục tiêu trên màn hình theo hướng dẫn.
          </LocalizedPipelineText>

          <View
            style={styles.stage}
            onLayout={(event) => {
              stageYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <WebView
              ref={webViewRef}
              source={{ html: trackerHtml, baseUrl: 'http://localhost' }}
              style={styles.hiddenTracker}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
              mixedContentMode="always"
              onMessage={handleMessage}
              originWhitelist={['*']}
            />

            <View style={styles.stageSurface} pointerEvents="none" />

            {phase === 'ready' ? (
              <View style={styles.stageCenter}>
                <LocalizedPipelineText language={language} style={styles.stageCenterTitle}>Chuẩn bị bài kiểm tra</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.stageCenterBody}>
                  Chờ hệ thống theo dõi báo sẵn sàng. Sau khi bắt đầu, giữ đầu và điện thoại ổn định.
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'countdown' ? (
              <View style={styles.stageCenter}>
                <LocalizedPipelineText language={language} style={styles.countdownNumber}>{countdown}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.stageCenterBody}>
                  Giữ đầu ở tư thế trung tâm
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'running' || phase === 'paused' ? (
              <>
                {stimulusKind === 'okn'
                  ? oknBars.map((x, index) => (
                      <View
                        key={`${index}-${x}`}
                        pointerEvents="none"
                        style={[
                          styles.oknBar,
                          { left: `${x * 100}%` },
                        ]}
                      />
                    ))
                  : stimulusFrame.stimulusX !== null &&
                    stimulusFrame.stimulusY !== null && (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.targetOuter,
                          stimulusKind === 'anti-saccade' && styles.antiCueOuter,
                          {
                            left: `${stimulusFrame.stimulusX * 100}%`,
                            top: `${stimulusFrame.stimulusY * 100}%`,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.targetInner,
                            stimulusKind === 'anti-saccade' && styles.antiCueInner,
                          ]}
                        />
                      </View>
                    )}

                {stimulusKind === 'anti-saccade' &&
                stimulusFrame.expectedX !== null &&
                stimulusFrame.expectedY !== null ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.expectedMarker,
                      {
                        left: `${stimulusFrame.expectedX * 100}%`,
                        top: `${stimulusFrame.expectedY * 100}%`,
                      },
                    ]}
                  />
                ) : null}

                <View style={styles.runtimeHud} pointerEvents="none">
                  <View style={styles.qualityPill}>
                    <View
                      style={[
                        styles.qualityDot,
                        currentQuality.level === 'green'
                          ? styles.dotGreen
                          : currentQuality.level === 'yellow'
                            ? styles.dotYellow
                            : styles.dotRed,
                      ]}
                    />
                    <LocalizedPipelineText language={language} style={styles.qualityText}>
                      {currentQuality.level.toUpperCase()}
                    </LocalizedPipelineText>
                  </View>
                  <LocalizedPipelineText language={language} style={styles.timerText}>{remainingSeconds}s</LocalizedPipelineText>
                </View>

                {phase === 'paused' ? (
                  <View style={styles.stageCenter}>
                    <LocalizedPipelineText language={language} style={styles.stageCenterTitle}>ĐÃ TẠM DỪNG</LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.stageCenterBody}>
                      Bộ đếm thời gian và kích thích thị giác đang tạm dừng.
                    </LocalizedPipelineText>
                  </View>
                ) : null}
              </>
            ) : null}

            {phase === 'complete' ? (
              <View style={styles.stageCenter}>
                <LocalizedPipelineText language={language} style={styles.stageCenterTitle}>BÀI KIỂM TRA HOÀN TẤT</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.stageCenterBody}>
                  Đã thu {mappedCount} mẫu hợp lệ cho lần chạy này.
                </LocalizedPipelineText>
              </View>
            ) : null}
          </View>

          <View style={styles.statusStrip}>
      <LocalizedPipelineText language={language} style={styles.statusText}>
        {trackerReady ? 'Hệ thống theo dõi: Sẵn sàng' : 'Hệ thống theo dõi: Đang chuẩn bị'}
      </LocalizedPipelineText>
    </View>

          <RequirementEvidenceStrip
            items={[
              { requirement: 'FR-16', value: getStimulusRequirementSummary(test.id) },
              {
                requirement: 'FR-17',
                value: `Camera ${camera?.frameRate ? `${camera.frameRate.toFixed(0)} FPS` : '— FPS'} · timestamp đồng bộ`,
              },
              {
                requirement: 'FR-18',
                value: `Theo dõi mắt ${tracking?.trackingFps ? `${tracking.trackingFps.toFixed(1)} FPS` : '— FPS'}`,
              },
              {
                requirement: 'FR-21',
                value: `Chất lượng ${currentQuality.level === 'green' ? 'Tốt' : currentQuality.level === 'yellow' ? 'Cần chú ý' : 'Không đạt'}`,
              },
            ]}
          />

          {phase === 'running' || phase === 'paused' ? (
            <LocalizedPipelineText language={language} style={styles.qualityMessage}>{currentQuality.message}</LocalizedPipelineText>
          ) : null}

          {phase === 'ready' ? (
            <Pressable
              disabled={!trackerReady}
              onPress={startRuntime}
              style={({ pressed }) => [
                styles.primaryButton,
                !trackerReady && styles.disabled,
                pressed && trackerReady && styles.pressed,
              ]}
            >
              <LocalizedPipelineText language={language} style={styles.buttonText}>
                {trackerReady
                  ? `BẮT ĐẦU · ${Math.round(expectedDurationMs / 1000)} GIÂY`
                  : 'ĐANG CHỜ HỆ THỐNG THEO DÕI...'}
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          {phase === 'running' || phase === 'paused' ? (
            <View style={styles.controlsRow}>
              <Pressable
                onPress={phase === 'running' ? pauseRuntime : resumeRuntime}
                style={({ pressed }) => [
                  styles.halfButton,
                  { backgroundColor: '#1682BC' },
                  pressed && styles.pressed,
                ]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>
                  {phase === 'running' ? 'TẠM DỪNG' : 'TIẾP TỤC'}
                </LocalizedPipelineText>
              </Pressable>

              <Pressable
                onPress={cancelRuntime}
                style={({ pressed }) => [
                  styles.halfButton,
                  styles.dangerButton,
                  pressed && styles.pressed,
                ]}
              >
                <LocalizedPipelineText language={language} style={styles.dangerText}>HỦY BÀI KIỂM TRA</LocalizedPipelineText>
              </Pressable>
            </View>
          ) : null}

          {phase === 'complete' ? (
            <>
              <View style={styles.summaryCard}>
      <LocalizedPipelineText language={language} style={styles.summaryLabel}>HOÀN TẤT</LocalizedPipelineText>
      <LocalizedPipelineText language={language} style={styles.summaryValue}>Đã ghi nhận bài kiểm tra</LocalizedPipelineText>
      <LocalizedPipelineText language={language} style={styles.summaryMetric}>
        Thời gian {(elapsedMs / 1000).toFixed(0)} giây
      </LocalizedPipelineText>
    </View>

              <Pressable
                onPress={saveTraceAndContinue}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <LocalizedPipelineText language={language} style={styles.buttonText}>
                  TIẾP TỤC XEM KẾT QUẢ
                </LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Lưu ý về quá trình ghi nhận</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          <Pressable
            disabled={phase === 'countdown' || phase === 'running' || phase === 'paused'}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              (phase === 'countdown' || phase === 'running' || phase === 'paused') &&
                styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryText}>
              'QUAY LẠI'
            </LocalizedPipelineText>
          </Pressable>

          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
