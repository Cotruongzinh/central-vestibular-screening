import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { trackingStageVi, trackingStatusVi } from '@/i18n/technical-copy';
import { testRuntimeHref } from '@/navigation/test-routes';
import { calibrationStyles as styles } from '@/styles/screens/tests/calibration.styles';
import {
  HEAD_PITCH_LIMIT,
  HEAD_ROLL_LIMIT,
  HEAD_SHIFT_LIMIT,
  HEAD_YAW_LIMIT,
  aggregateCalibrationPoint,
} from '@/tracking/calibration/calibration';
import { saveCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { createCalibrationTrackerHtml } from '@/tracking/calibration/createCalibrationTrackerHtml';
import {
  QUICK_BATTERY_CALIBRATION_POINTS,
  QUICK_BATTERY_VALIDATION_POINT,
  QUICK_COLLECT_MS,
  QUICK_MAX_ATTEMPTS,
  QUICK_SETTLE_MS,
  buildQuickBatteryMapping,
  buildQuickBatteryValidationDraft,
  quickCalibrationSpans,
} from '@/tracking/calibration/quick-battery-calibration';
import { saveGazeMappingResult } from '@/tracking/mapping/mapping-store';
import { saveFixationValidation } from '@/tracking/validation/validation-store';
import type {
  CalibrationDataset,
  CalibrationPointResult,
  CalibrationSample,
} from '@/types/calibration';
import type { GazeMappingResult } from '@/types/gaze-mapping';
import type { FixationValidationResult } from '@/types/fixation-validation';
import type { EyeTrackingSpikeMessage } from '@/types/tracking';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type QuickPhase =
  | 'ready'
  | 'countdown'
  | 'calibrating'
  | 'validating'
  | 'complete'
  | 'failed';

type AssetState = Extract<EyeTrackingSpikeMessage, { type: 'asset-status' }>;
type CameraState = Extract<EyeTrackingSpikeMessage, { type: 'camera-status' }>;
type MediaPipeState = Extract<EyeTrackingSpikeMessage, { type: 'mediapipe-status' }>;
type BaselineState = Extract<EyeTrackingSpikeMessage, { type: 'baseline-status' }>;
type TrackingState = Extract<EyeTrackingSpikeMessage, { type: 'tracking' }>;

export default function BatteryQuickCalibrationScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const webViewRef = useRef<WebView>(null);

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;

  const trackerHtml = useMemo(() => createCalibrationTrackerHtml(), []);

  const [assetStatus, setAssetStatus] = useState<AssetState>();
  const [camera, setCamera] = useState<CameraState>();
  const [mediaPipe, setMediaPipe] = useState<MediaPipeState>();
  const [baseline, setBaseline] = useState<BaselineState>();
  const [tracking, setTracking] = useState<TrackingState>();

  const [phase, setPhase] = useState<QuickPhase>('ready');
  const phaseRef = useRef<QuickPhase>('ready');
  const [countdown, setCountdown] = useState(2);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const [pointStatus, setPointStatus] = useState('Chờ tracker sẵn sàng');
  const [results, setResults] = useState<CalibrationPointResult[]>([]);
  const resultsRef = useRef<CalibrationPointResult[]>([]);
  const sampleBufferRef = useRef<CalibrationSample[]>([]);
  const settleUntilRef = useRef(0);
  const collectUntilRef = useRef(0);
  const finalizingRef = useRef(false);
  const attemptRef = useRef(1);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [stageY, setStageY] = useState(0);
  const [quickValidation, setQuickValidation] = useState<FixationValidationResult>();

  const datasetRef = useRef<CalibrationDataset | undefined>(undefined);
  const mappingRef = useRef<GazeMappingResult | undefined>(undefined);
  const validationRef = useRef<FixationValidationResult | undefined>(undefined);

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

  const setPhaseBoth = (next: QuickPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const trackerReady =
    assetStatus?.status === 'ready' &&
    mediaPipe?.status === 'ready' &&
    camera?.status === 'ready' &&
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

  const beginCalibrationPoint = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
    sampleBufferRef.current = [];
    finalizingRef.current = false;

    const now = Date.now();
    settleUntilRef.current = now + QUICK_SETTLE_MS;
    collectUntilRef.current = now + QUICK_SETTLE_MS + QUICK_COLLECT_MS;
    setPointStatus(`Hiệu chỉnh ${index + 1}/5 · giữ đầu yên`);
  };

  const beginValidation = () => {
    sampleBufferRef.current = [];
    finalizingRef.current = false;
    const now = Date.now();
    settleUntilRef.current = now + QUICK_SETTLE_MS;
    collectUntilRef.current = now + QUICK_SETTLE_MS + QUICK_COLLECT_MS;
    setPointStatus('Kiểm định nhanh · nhìn điểm kiểm tra');
    setPhaseBoth('validating');
  };

  const fail = (message: string) => {
    setErrorMessage(message);
    setPhaseBoth('failed');
  };

  const finishCalibrationPoint = () => {
    if (finalizingRef.current) {
      return;
    }

    finalizingRef.current = true;
    const index = activeIndexRef.current;
    const point = QUICK_BATTERY_CALIBRATION_POINTS[index];
    const aggregated = aggregateCalibrationPoint(point, sampleBufferRef.current);

    if (!aggregated) {
      if (attemptRef.current < QUICK_MAX_ATTEMPTS) {
        attemptRef.current += 1;
        setPointStatus(`Điểm ${index + 1}/5 chưa ổn định · tự thử lại`);
        transitionTimerRef.current = setTimeout(
          () => beginCalibrationPoint(index),
          450,
        );
        return;
      }

      fail(`Điểm ${index + 1}/5 không đủ sample ổn định. Giữ đầu và điện thoại cố định hơn rồi chạy lại quick setup.`);
      return;
    }

    const nextResults = [...resultsRef.current, aggregated];
    resultsRef.current = nextResults;
    setResults(nextResults);
    attemptRef.current = 1;

    if (index < QUICK_BATTERY_CALIBRATION_POINTS.length - 1) {
      setPointStatus(`Điểm ${index + 1}/5 đã lưu`);
      transitionTimerRef.current = setTimeout(
        () => beginCalibrationPoint(index + 1),
        300,
      );
      return;
    }

    if (!patientId || !test) {
      fail('Không thể hoàn tất hiệu chỉnh nhanh. Hãy quay lại và thử lại.');
      return;
    }

    const { hSpan, vSpan } = quickCalibrationSpans(nextResults);
    const acceptedSamples = nextResults.reduce(
      (sum, result) => sum + result.acceptedCount,
      0,
    );
    const rawSamples = nextResults.reduce(
      (sum, result) => sum + result.rawCount,
      0,
    );

    const dataset = saveCalibrationDataset({
      patientId,
      testId: test.id,
      mode: 'battery',
      batteryIndex,
      createdAt: Date.now(),
      points: nextResults,
      hSpan,
      vSpan,
      acceptedSamples,
      rawSamples,
      trackerFps: tracking?.trackingFps ?? null,
    });

    const mapping = buildQuickBatteryMapping(dataset);

    if (!mapping) {
      fail('Hiệu chỉnh nhanh chưa hoàn tất. Hãy thử lại.');
      return;
    }

    saveGazeMappingResult(mapping);
    datasetRef.current = dataset;
    mappingRef.current = mapping;
    setPointStatus('Đã ghi nhận 5/5 điểm · đang hoàn tất');
    transitionTimerRef.current = setTimeout(beginValidation, 350);
  };

  const finishValidation = () => {
    if (finalizingRef.current) {
      return;
    }

    finalizingRef.current = true;
    const dataset = datasetRef.current;
    const mapping = mappingRef.current;

    if (!dataset || !mapping) {
      fail('Dữ liệu ánh xạ nhanh không còn. Hãy chạy lại thiết lập nhanh.');
      return;
    }

    const draft = buildQuickBatteryValidationDraft({
      dataset,
      mapping,
      samples: sampleBufferRef.current,
      trackerFps: tracking?.trackingFps ?? null,
    });

    if (!draft) {
      if (attemptRef.current < QUICK_MAX_ATTEMPTS) {
        attemptRef.current += 1;
        setPointStatus('Kiểm định nhanh chưa ổn định · đang tự thử lại');
        transitionTimerRef.current = setTimeout(beginValidation, 450);
        return;
      }

      fail('Kiểm định nhanh chưa đủ mẫu ổn định. Hãy chạy lại thiết lập nhanh.');
      return;
    }

    const validation = saveFixationValidation(draft);
    validationRef.current = validation;
    setQuickValidation(validation);
    setPointStatus('THIẾT LẬP NHANH SẴN SÀNG');
    setPhaseBoth('complete');

    transitionTimerRef.current = setTimeout(() => {
      if (!patientId || !test || !datasetRef.current || !mappingRef.current || !validationRef.current) {
        return;
      }

      router.replace(
        testRuntimeHref({
          patientId,
          testId: test.id,
          mode: 'battery',
          batteryIndex,
          calibrationId: datasetRef.current.id,
          mappingId: mappingRef.current.id,
          validationId: validationRef.current.id,
          setupMode: 'quick',
        }),
      );
    }, 650);
  };

  const handleTrackingForQuickSetup = (value: TrackingState) => {
    if (phaseRef.current !== 'calibrating' && phaseRef.current !== 'validating') {
      return;
    }

    const now = Date.now();

    if (now < settleUntilRef.current) {
      return;
    }

    if (now <= collectUntilRef.current) {
      const sample = validSampleFromTracking(value);

      if (sample) {
        sampleBufferRef.current.push(sample);
        setPointStatus(
          phaseRef.current === 'calibrating'
            ? `Hiệu chỉnh ${activeIndexRef.current + 1}/5 · samples ${sampleBufferRef.current.length}`
            : `Kiểm tra độ chính xác · ${sampleBufferRef.current.length}`,
        );
      }
      return;
    }

    if (phaseRef.current === 'calibrating') {
      finishCalibrationPoint();
    } else {
      finishValidation();
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
          handleTrackingForQuickSetup(parsed);
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

  const startQuickSetup = () => {
    if (!trackerReady) {
      return;
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    resultsRef.current = [];
    setResults([]);
    datasetRef.current = undefined;
    mappingRef.current = undefined;
    validationRef.current = undefined;
    setQuickValidation(undefined);
    setErrorMessage(undefined);
    attemptRef.current = 1;
    setCountdown(2);
    setPhaseBoth('countdown');

    scrollRef.current?.scrollTo({ y: Math.max(0, stageY - 12), animated: true });

    webViewRef.current?.injectJavaScript(`
      if (window.__resetHeadBaseline) {
        window.__resetHeadBaseline();
      }
      true;
    `);

    let remaining = 2;
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
      setPhaseBoth('calibrating');
      beginCalibrationPoint(0);
    }, 1000);
  };

  const restartQuickSetup = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setPhaseBoth('ready');
    resultsRef.current = [];
    setResults([]);
    datasetRef.current = undefined;
    mappingRef.current = undefined;
    validationRef.current = undefined;
    setQuickValidation(undefined);
    setActiveIndex(0);
    activeIndexRef.current = 0;
    setPointStatus('Sẵn sàng chạy lại');
    setErrorMessage(undefined);

    webViewRef.current?.injectJavaScript(`
      if (window.__resetHeadBaseline) {
        window.__resetHeadBaseline();
      }
      true;
    `);
  };

  if (!patientId || !test || batteryIndex <= 0 || !test.inFullBattery) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Không mở được bước hiệu chỉnh nhanh</LocalizedPipelineText>
          </View>
          <View style={styles.sheet}>
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorTitle}>Không thể mở hiệu chỉnh nhanh</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.errorBody}>
                Thiết lập nhanh 03L chỉ dùng cho bài 2–6 trong bộ kiểm tra đầy đủ. Bài đầu vẫn dùng hiệu chỉnh 9 điểm, ánh xạ và kiểm định độc lập đầy đủ.
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

  const activePoint = QUICK_BATTERY_CALIBRATION_POINTS[activeIndex];
  const currentTarget =
    phase === 'validating'
      ? QUICK_BATTERY_VALIDATION_POINT
      : phase === 'countdown'
        ? QUICK_BATTERY_CALIBRATION_POINTS[0]
        : activePoint;
  const shouldShowTarget =
    phase === 'countdown' || phase === 'calibrating' || phase === 'validating';
  const { hSpan, vSpan } = quickCalibrationSpans(results);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={
          phase !== 'countdown' && phase !== 'calibrating' && phase !== 'validating'
        }
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Hiệu chỉnh nhanh 5 điểm</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            {test.nameVi} · bài trong bộ kiểm tra đầy đủ {batteryIndex + 1}/6
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.contextCard}>
            <LocalizedPipelineText language={language} style={styles.contextLabel}>THIẾT LẬP NHANH BỘ 6 BÀI</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.contextValue}>
              Hiệu chỉnh nhanh 5 điểm
            </LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.sheetTitle}>Hiệu chỉnh nhanh</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.sheetBody}>
            Nhìn lần lượt 5 điểm để cập nhật hiệu chỉnh trước khi tiếp tục bài kiểm tra.
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
                <LocalizedPipelineText language={language} style={styles.centerMessageTitle}>Chuẩn bị hiệu chỉnh nhanh</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Chỉ di chuyển mắt theo chấm. Giữ đầu và điện thoại ổn định.
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'countdown' ? (
              <View style={styles.countdownBadge}>
                <LocalizedPipelineText language={language} style={styles.countdownNumber}>{countdown}</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.countdownText}>Nhìn chấm giữa và giữ đầu yên</LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'calibrating' ? (
              <View style={styles.progressBadge}>
                <LocalizedPipelineText language={language} style={styles.progressText}>{activeIndex + 1}/5</LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'validating' ? (
              <View style={styles.progressBadge}>
                <LocalizedPipelineText language={language} style={styles.progressText}>KIỂM TRA</LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'complete' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.completeTitle}>THIẾT LẬP NHANH SẴN SÀNG</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Đang mở kích thích thị giác...
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'failed' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.failedTitle}>Hiệu chỉnh nhanh chưa đạt</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Dữ liệu theo dõi chưa đủ ổn định. Hãy thực hiện lại bước hiệu chỉnh nhanh.
                </LocalizedPipelineText>
              </View>
            ) : null}
          </View>

          <View style={styles.statusStrip}>
      <LocalizedPipelineText language={language} style={styles.statusStripText}>
        {trackerReady ? 'Hệ thống theo dõi: Sẵn sàng' : 'Hệ thống theo dõi: Đang chuẩn bị'}
      </LocalizedPipelineText>
    </View>

          <RequirementEvidenceStrip
            items={[
              { requirement: 'FR-15', value: `Hiệu chỉnh ${results.length}/5 điểm` },
              {
                requirement: 'FR-17',
                value: `Camera ${camera?.frameRate ? `${camera.frameRate.toFixed(0)} FPS` : '— FPS'}`,
              },
              {
                requirement: 'FR-18',
                value: `Theo dõi mắt ${tracking?.trackingFps ? `${tracking.trackingFps.toFixed(1)} FPS` : '— FPS'}`,
              },
            ]}
          />

          {phase === 'ready' ? (
            <Pressable
              disabled={!trackerReady}
              style={({ pressed }) => [
                styles.primaryButton,
                !trackerReady && styles.buttonDisabled,
                pressed && trackerReady && styles.buttonPressed,
              ]}
              onPress={startQuickSetup}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                {trackerReady ? 'BẮT ĐẦU HIỆU CHỈNH NHANH 5 ĐIỂM' : 'ĐANG CHỜ TRACKER...'}
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          {phase === 'countdown' || phase === 'calibrating' || phase === 'validating' ? (
            <LocalizedPipelineText language={language} style={styles.liveInstruction}>
              {phase === 'countdown' ? 'Giữ đầu ở tư thế trung tâm.' : pointStatus}
            </LocalizedPipelineText>
          ) : null}

          {phase === 'failed' ? (
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={restartQuickSetup}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>LÀM LẠI HIỆU CHỈNH NHANH</LocalizedPipelineText>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorTitle}>Lưu ý về hiệu chỉnh nhanh</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.errorBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          <Pressable
            disabled={phase === 'countdown' || phase === 'calibrating' || phase === 'validating' || phase === 'complete'}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              (phase === 'countdown' || phase === 'calibrating' || phase === 'validating' || phase === 'complete') && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>QUAY LẠI HƯỚNG DẪN</LocalizedPipelineText>
          </Pressable>

          <LocalizedPipelineText language={language} style={styles.footnote}>
            Bài đầu dùng hiệu chỉnh đầy đủ; các bài tiếp theo dùng hiệu chỉnh nhanh.
          </LocalizedPipelineText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
