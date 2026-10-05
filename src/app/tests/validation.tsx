import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { trackingStageVi, trackingStatusVi } from '@/i18n/technical-copy';
import { testValidationReadyHref } from '@/navigation/test-routes';
import { validationStyles as styles } from '@/styles/screens/tests/validation.styles';
import {
  HEAD_PITCH_LIMIT,
  HEAD_ROLL_LIMIT,
  HEAD_SHIFT_LIMIT,
  HEAD_YAW_LIMIT,
} from '@/tracking/calibration/calibration';
import { createCalibrationTrackerHtml } from '@/tracking/calibration/createCalibrationTrackerHtml';
import { getCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { getGazeMappingResult } from '@/tracking/mapping/mapping-store';
import {
  aggregateValidationPoint,
  summarizeValidation,
  VALIDATION_COLLECT_MS,
  VALIDATION_MAX_ATTEMPTS_PER_POINT,
  VALIDATION_POINTS,
  VALIDATION_SETTLE_MS,
} from '@/tracking/validation/fixation-validation';
import { saveFixationValidation } from '@/tracking/validation/validation-store';
import type { CalibrationSample } from '@/types/calibration';
import type {
  FixationValidationPhase,
  FixationValidationPointResult,
} from '@/types/fixation-validation';
import type { TestRunMode } from '@/types/test-administration';
import type { EyeTrackingSpikeMessage } from '@/types/tracking';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type EnvironmentState = Extract<EyeTrackingSpikeMessage, { type: 'environment' }>;
type AssetState = Extract<EyeTrackingSpikeMessage, { type: 'asset-status' }>;
type CameraState = Extract<EyeTrackingSpikeMessage, { type: 'camera-status' }>;
type MediaPipeState = Extract<EyeTrackingSpikeMessage, { type: 'mediapipe-status' }>;
type BaselineState = Extract<EyeTrackingSpikeMessage, { type: 'baseline-status' }>;
type TrackingState = Extract<EyeTrackingSpikeMessage, { type: 'tracking' }>;

export default function TestValidationScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const webViewRef = useRef<WebView>(null);

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const calibrationId = firstParam(params.calibrationId as string | string[] | undefined);
  const mappingId = firstParam(params.mappingId as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;
  const calibration = getCalibrationDataset(calibrationId);
  const mapping = getGazeMappingResult(mappingId);

  const contextValid = Boolean(
    patientId &&
      test &&
      calibration &&
      mapping &&
      mapping.calibrationId === calibration.id &&
      mapping.patientId === patientId &&
      mapping.testId === test.id &&
      mapping.mode === mode &&
      mapping.batteryIndex === batteryIndex,
  );

  const trackerHtml = useMemo(() => createCalibrationTrackerHtml(), []);

  const [environment, setEnvironment] = useState<EnvironmentState>();
  const [assetStatus, setAssetStatus] = useState<AssetState>();
  const [camera, setCamera] = useState<CameraState>();
  const [mediaPipe, setMediaPipe] = useState<MediaPipeState>();
  const [baseline, setBaseline] = useState<BaselineState>();
  const [tracking, setTracking] = useState<TrackingState>();

  const [phase, setPhase] = useState<FixationValidationPhase>('ready');
  const phaseRef = useRef<FixationValidationPhase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [pointStatus, setPointStatus] = useState('Chờ tracker sẵn sàng');
  const [results, setResults] = useState<FixationValidationPointResult[]>([]);
  const resultsRef = useRef<FixationValidationPointResult[]>([]);
  const sampleBufferRef = useRef<CalibrationSample[]>([]);
  const rawCountRef = useRef(0);
  const settleUntilRef = useRef(0);
  const collectUntilRef = useRef(0);
  const attemptRef = useRef(1);
  const finalizingRef = useRef(false);
  const [stageY, setStageY] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const setPhaseBoth = (next: FixationValidationPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const trackerReady =
    contextValid &&
    assetStatus?.status === 'ready' &&
    mediaPipe?.status === 'ready' &&
    camera?.status === 'ready' &&
    baseline?.status === 'ready' &&
    tracking?.faceDetected === true;

  const onStageLayout = (event: LayoutChangeEvent) => {
    setStageY(event.nativeEvent.layout.y);
  };

  const validSampleFromTracking = (value: TrackingState): CalibrationSample | null => {
    const eye = value.binocularEye;
    const head = value.headPose;

    if (
      !value.faceDetected ||
      !head?.baselineReady ||
      eye?.horizontal === null ||
      eye?.horizontal === undefined ||
      eye?.vertical === null ||
      eye?.vertical === undefined ||
      head.yawDeltaDeg === null ||
      head.pitchDeltaDeg === null ||
      head.rollDeltaDeg === null ||
      head.shiftX === null ||
      head.shiftY === null
    ) {
      return null;
    }

    if (
      Math.abs(head.yawDeltaDeg) > HEAD_YAW_LIMIT ||
      Math.abs(head.pitchDeltaDeg) > HEAD_PITCH_LIMIT ||
      Math.abs(head.rollDeltaDeg) > HEAD_ROLL_LIMIT ||
      Math.abs(head.shiftX) > HEAD_SHIFT_LIMIT ||
      Math.abs(head.shiftY) > HEAD_SHIFT_LIMIT
    ) {
      return null;
    }

    if (value.trackingFps > 0 && value.trackingFps < 20) {
      return null;
    }

    return {
      h: eye.horizontal,
      v: eye.vertical,
      yaw: head.yawDeltaDeg,
      pitch: head.pitchDeltaDeg,
      roll: head.rollDeltaDeg,
      shiftX: head.shiftX,
      shiftY: head.shiftY,
      fps: value.trackingFps,
    };
  };

  const beginPoint = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
    sampleBufferRef.current = [];
    rawCountRef.current = 0;
    finalizingRef.current = false;

    const now = Date.now();
    settleUntilRef.current = now + VALIDATION_SETTLE_MS;
    collectUntilRef.current = now + VALIDATION_SETTLE_MS + VALIDATION_COLLECT_MS;

    setPointStatus(
      `Validation ${index + 1}/${VALIDATION_POINTS.length} · chỉ di chuyển mắt`,
    );
  };

  const finishPoint = () => {
    if (finalizingRef.current || !mapping) {
      return;
    }

    finalizingRef.current = true;

    const index = activeIndexRef.current;
    const point = VALIDATION_POINTS[index];
    const aggregated = aggregateValidationPoint(
      point,
      sampleBufferRef.current,
      rawCountRef.current,
      mapping.model,
    );

    if (!aggregated) {
      if (attemptRef.current < VALIDATION_MAX_ATTEMPTS_PER_POINT) {
        attemptRef.current += 1;
        setPointStatus(
          `Điểm ${index + 1}: chưa đủ sample ổn định · tự thử lại`,
        );
        transitionTimerRef.current = setTimeout(() => beginPoint(index), 650);
        return;
      }

      setPhaseBoth('failed');
      setErrorMessage(
        `Validation point ${index + 1}/${VALIDATION_POINTS.length} không đủ sample kỹ thuật. Giữ đầu và điện thoại cố định hơn rồi chạy lại.`,
      );
      return;
    }

    const nextResults = [...resultsRef.current, aggregated];
    resultsRef.current = nextResults;
    setResults(nextResults);
    attemptRef.current = 1;

    if (index >= VALIDATION_POINTS.length - 1) {
      setPhaseBoth('complete');
      setPointStatus('ĐÃ HOÀN TẤT TẬP ĐIỂM NHÌN ĐỘC LẬP');
      return;
    }

    transitionTimerRef.current = setTimeout(
      () => beginPoint(index + 1),
      450,
    );
  };

  const handleTrackingForValidation = (value: TrackingState) => {
    if (phaseRef.current !== 'validating') {
      return;
    }

    const now = Date.now();

    if (now < settleUntilRef.current) {
      return;
    }

    if (now <= collectUntilRef.current) {
      rawCountRef.current += 1;
      const sample = validSampleFromTracking(value);

      if (sample) {
        sampleBufferRef.current.push(sample);
        setPointStatus(
          `Điểm ${activeIndexRef.current + 1}/${VALIDATION_POINTS.length} · accepted ${sampleBufferRef.current.length}/${rawCountRef.current}`,
        );
      }
      return;
    }

    finishPoint();
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as EyeTrackingSpikeMessage;

      switch (parsed.type) {
        case 'environment':
          setEnvironment(parsed);
          break;
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
          handleTrackingForValidation(parsed);
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

  const startValidation = () => {
    if (!trackerReady) {
      return;
    }

    resultsRef.current = [];
    setResults([]);
    setErrorMessage(undefined);
    attemptRef.current = 1;
    setCountdown(3);
    setPhaseBoth('countdown');

    scrollRef.current?.scrollTo({
      y: Math.max(0, stageY - 12),
      animated: true,
    });

    webViewRef.current?.injectJavaScript(`
      if (window.__resetHeadBaseline) {
        window.__resetHeadBaseline();
      }
      true;
    `);

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
      setPhaseBoth('validating');
      beginPoint(0);
    }, 1000);
  };

  const restartValidation = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    resultsRef.current = [];
    setResults([]);
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setErrorMessage(undefined);
    setPointStatus('Sẵn sàng chạy lại');
    setPhaseBoth('ready');

    webViewRef.current?.injectJavaScript(`
      if (window.__resetHeadBaseline) {
        window.__resetHeadBaseline();
      }
      true;
    `);
  };

  const continueAfterValidation = () => {
    if (
      !contextValid ||
      !patientId ||
      !test ||
      !calibration ||
      !mapping ||
      resultsRef.current.length !== VALIDATION_POINTS.length
    ) {
      return;
    }

    const summary = summarizeValidation(
      resultsRef.current,
      tracking?.trackingFps ?? null,
    );

    if (!summary.technicalQualityPass) {
      setErrorMessage(
        'Kiểm tra chất lượng kỹ thuật chưa đạt. Hãy chạy lại kiểm định khi đầu và điện thoại ổn định hơn.',
      );
      return;
    }

    const validation = saveFixationValidation({
      patientId,
      testId: test.id,
      mode,
      batteryIndex,
      calibrationId: calibration.id,
      mappingId: mapping.id,
      createdAt: Date.now(),
      points: resultsRef.current,
      meanError: summary.meanError,
      maxError: summary.maxError,
      meanDiagonalPercent: summary.meanDiagonalPercent,
      acceptedSamples: summary.acceptedSamples,
      rawSamples: summary.rawSamples,
      acceptedRatio: summary.acceptedRatio,
      trackerFps: tracking?.trackingFps ?? null,
      technicalQualityPass: summary.technicalQualityPass,
    });

    router.push(
      testValidationReadyHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId: calibration.id,
        mappingId: mapping.id,
        validationId: validation.id,
      }),
    );
  };

  const activePoint = VALIDATION_POINTS[activeIndex];
  const shouldShowTarget = phase === 'countdown' || phase === 'validating';
  const currentTarget =
    phase === 'countdown' ? VALIDATION_POINTS[0] : activePoint;

  const summary =
    results.length === VALIDATION_POINTS.length
      ? summarizeValidation(results, tracking?.trackingFps ?? null)
      : null;

  if (!contextValid || !patientId || !test || !calibration || !mapping) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Không mở được bước kiểm tra độ chính xác</LocalizedPipelineText>
          </View>
          <View style={styles.sheet}>
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Thiếu dữ liệu hiệu chỉnh</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>
                Hãy quay lại hiệu chỉnh và thử lại.
              </LocalizedPipelineText>
            </View>
            <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
              <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>QUAY LẠI</LocalizedPipelineText>
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
        scrollEnabled={phase !== 'countdown' && phase !== 'validating'}
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Kiểm tra độ chính xác</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            {test.nameVi} · 5 điểm kiểm tra
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badge}>
            <LocalizedPipelineText language={language} style={styles.badgeText}>HIỆU CHỈNH ĐÃ SẴN SÀNG</LocalizedPipelineText>
          </View>

          <View style={styles.contextCard}>
            <LocalizedPipelineText language={language} style={styles.contextLabel}>TRẠNG THÁI</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.contextValue}>Sẵn sàng kiểm tra</LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.title}>Kiểm tra 5 điểm nhìn</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.body}>
            Nhìn lần lượt 5 chấm. Chỉ di chuyển mắt và giữ đầu ổn định.
          </LocalizedPipelineText>

          <View style={styles.stage} onLayout={onStageLayout}>
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

            {shouldShowTarget ? (
              <View
                pointerEvents="none"
                style={[
                  styles.targetOuter,
                  {
                    left: `${currentTarget.x * 100}%`,
                    top: `${currentTarget.y * 100}%`,
                  },
                ]}
              >
                <View style={styles.targetInner} />
              </View>
            ) : null}

            {phase === 'ready' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.centerTitle}>Chuẩn bị kiểm định</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerBody}>
                  Chỉ di chuyển mắt theo chấm. Không xoay đầu theo mục tiêu.
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'countdown' ? (
              <View style={styles.countdownBadge}>
                <LocalizedPipelineText language={language} style={styles.countdownNumber}>{countdown}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.countdownText}>
                  Giữ đầu ở tư thế trung tâm
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'validating' ? (
              <View style={styles.progressBadge}>
                <LocalizedPipelineText language={language} style={styles.progressText}>
                  {activeIndex + 1}/{VALIDATION_POINTS.length}
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'complete' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.completeTitle}>5/5 HOÀN TẤT</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerBody}>
                  Đã thu xong bộ điểm kiểm định độc lập.
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'failed' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.failedTitle}>Kiểm định chưa đạt</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerBody}>
                  Chưa đủ mẫu kỹ thuật ổn định.
                </LocalizedPipelineText>
              </View>
            ) : null}
          </View>

          <View style={styles.statusStrip}>
      <LocalizedPipelineText language={language} style={styles.statusStripText}>
        {trackerReady ? 'Hệ thống theo dõi: Sẵn sàng' : 'Hệ thống theo dõi: Đang chuẩn bị'}
      </LocalizedPipelineText>
    </View>

          {phase === 'ready' ? (
            <Pressable
              disabled={!trackerReady}
              style={({ pressed }) => [
                styles.primaryButton,
                !trackerReady && styles.buttonDisabled,
                pressed && trackerReady && styles.buttonPressed,
              ]}
              onPress={startValidation}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                {trackerReady
                  ? 'BẮT ĐẦU KIỂM ĐỊNH 5 ĐIỂM'
                  : 'ĐANG CHỜ HỆ THỐNG THEO DÕI...'}
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          {phase === 'countdown' || phase === 'validating' ? (
            <LocalizedPipelineText language={language} style={styles.liveInstruction}>
              {phase === 'countdown'
                ? 'Giữ đầu và điện thoại cố định.'
                : pointStatus}
            </LocalizedPipelineText>
          ) : null}

          {phase === 'complete' && summary ? (
            <>
              <View style={styles.summaryCard}>
                <LocalizedPipelineText language={language} style={styles.summaryLabel}>ĐỘ CHÍNH XÁC</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.summaryValue}>
                  {summary.technicalQualityPass ? 'ĐẠT' : 'THỬ LẠI'}
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.summaryMetric}>
                  Sai số trung bình độc lập: {summary.meanError.toFixed(4)} chuẩn hóa ·{' '}
                  {summary.meanDiagonalPercent.toFixed(1)}% đường chéo màn hình
                </LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.summaryMetric}>
                  Sai số lớn nhất: {summary.maxError.toFixed(4)} · mẫu được chấp nhận:{' '}
                  {summary.acceptedSamples}/{summary.rawSamples}
                </LocalizedPipelineText>
              </View>

              <Pressable
                disabled={!summary.technicalQualityPass}
                style={({ pressed }) => [
                  styles.primaryButton,
                  !summary.technicalQualityPass && styles.buttonDisabled,
                  pressed && summary.technicalQualityPass && styles.buttonPressed,
                ]}
                onPress={continueAfterValidation}
              >
                <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                  TIẾP TỤC
                </LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}

          {phase === 'complete' || phase === 'failed' ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={restartValidation}
            >
              <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>KIỂM ĐỊNH LẠI</LocalizedPipelineText>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <View style={styles.warningBox}>
              <LocalizedPipelineText language={language} style={styles.warningTitle}>Lưu ý về kiểm định / theo dõi</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.warningBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          <Pressable
            disabled={phase === 'countdown' || phase === 'validating'}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              (phase === 'countdown' || phase === 'validating') &&
                styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>QUAY LẠI</LocalizedPipelineText>
          </Pressable>

          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
