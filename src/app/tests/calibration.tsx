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
import { testReadyHref } from '@/navigation/test-routes';
import { calibrationStyles as styles } from '@/styles/screens/tests/calibration.styles';
import {
  aggregateCalibrationPoint,
  CALIBRATION_POINTS,
  calibrationSpans,
  COLLECT_MS,
  HEAD_PITCH_LIMIT,
  HEAD_ROLL_LIMIT,
  HEAD_SHIFT_LIMIT,
  HEAD_YAW_LIMIT,
  MAX_ATTEMPTS_PER_POINT,
  SETTLE_MS,
} from '@/tracking/calibration/calibration';
import { saveCalibrationDataset } from '@/tracking/calibration/calibration-store';
import { createCalibrationTrackerHtml } from '@/tracking/calibration/createCalibrationTrackerHtml';
import type {
  CalibrationPhase,
  CalibrationPointResult,
  CalibrationSample,
} from '@/types/calibration';
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

export default function TestCalibrationScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const webViewRef = useRef<WebView>(null);

  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const testIdParam = firstParam(params.testId as string | string[] | undefined);
  const modeParam = firstParam(params.mode as string | string[] | undefined);
  const batteryIndexParam = firstParam(params.batteryIndex as string | string[] | undefined);

  const mode: TestRunMode = modeParam === 'battery' ? 'battery' : 'single';
  const batteryIndex = Math.max(0, Number.parseInt(batteryIndexParam ?? '0', 10) || 0);
  const test = isClinicalTestId(testIdParam) ? getClinicalTest(testIdParam) : undefined;

  const trackerHtml = useMemo(() => createCalibrationTrackerHtml(), []);

  const [environment, setEnvironment] = useState<EnvironmentState>();
  const [assetStatus, setAssetStatus] = useState<AssetState>();
  const [camera, setCamera] = useState<CameraState>();
  const [mediaPipe, setMediaPipe] = useState<MediaPipeState>();
  const [baseline, setBaseline] = useState<BaselineState>();
  const [tracking, setTracking] = useState<TrackingState>();

  const [phase, setPhase] = useState<CalibrationPhase>('ready');
  const phaseRef = useRef<CalibrationPhase>('ready');
  const [countdown, setCountdown] = useState(3);
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

  const setPhaseBoth = (next: CalibrationPhase) => {
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

  const beginPoint = (index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
    sampleBufferRef.current = [];
    finalizingRef.current = false;

    const now = Date.now();
    settleUntilRef.current = now + SETTLE_MS;
    collectUntilRef.current = now + SETTLE_MS + COLLECT_MS;

    setPointStatus(`Nhìn vào điểm ${index + 1}/9 · giữ đầu yên`);
  };

  const finishPoint = () => {
    if (finalizingRef.current) {
      return;
    }

    finalizingRef.current = true;

    const index = activeIndexRef.current;
    const point = CALIBRATION_POINTS[index];
    const aggregated = aggregateCalibrationPoint(point, sampleBufferRef.current);

    if (!aggregated) {
      if (attemptRef.current < MAX_ATTEMPTS_PER_POINT) {
        attemptRef.current += 1;
        setPointStatus(`Điểm ${index + 1}: dữ liệu chưa ổn định · tự thử lại`);
        transitionTimerRef.current = setTimeout(() => beginPoint(index), 650);
        return;
      }

      setPhaseBoth('failed');
      setErrorMessage(
        `Điểm ${index + 1}/9 không đủ dữ liệu ổn định. Giữ điện thoại và đầu cố định hơn rồi chạy lại calibration.`,
      );
      return;
    }

    const nextResults = [...resultsRef.current, aggregated];
    resultsRef.current = nextResults;
    setResults(nextResults);
    attemptRef.current = 1;

    if (index >= CALIBRATION_POINTS.length - 1) {
      setPhaseBoth('complete');
      setPointStatus('DỮ LIỆU HIỆU CHỈNH SẴN SÀNG');
      return;
    }

    setPointStatus(`Điểm ${index + 1}/9 đã lưu`);
    transitionTimerRef.current = setTimeout(() => beginPoint(index + 1), 450);
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

  const handleTrackingForCalibration = (value: TrackingState) => {
    if (phaseRef.current !== 'calibrating') {
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
          `Điểm ${activeIndexRef.current + 1}/9 · đang ghi nhận (${sampleBufferRef.current.length})`,
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
          handleTrackingForCalibration(parsed);
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

  const startCalibration = () => {
    if (!trackerReady) {
      return;
    }

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    resultsRef.current = [];
    setResults([]);
    setErrorMessage(undefined);
    attemptRef.current = 1;
    setCountdown(3);
    setPhaseBoth('countdown');

    scrollRef.current?.scrollTo({ y: Math.max(0, stageY - 12), animated: true });

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
      setPhaseBoth('calibrating');
      beginPoint(0);
    }, 1000);
  };

  const restartCalibration = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setPhaseBoth('ready');
    resultsRef.current = [];
    setResults([]);
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

  const continueAfterCalibration = () => {
    if (!patientId || !test || resultsRef.current.length !== 9) {
      return;
    }

    const { hSpan, vSpan } = calibrationSpans(resultsRef.current);
    const acceptedSamples = resultsRef.current.reduce(
      (sum, result) => sum + result.acceptedCount,
      0,
    );
    const rawSamples = resultsRef.current.reduce(
      (sum, result) => sum + result.rawCount,
      0,
    );

    const dataset = saveCalibrationDataset({
      patientId,
      testId: test.id,
      mode,
      batteryIndex,
      createdAt: Date.now(),
      points: resultsRef.current,
      hSpan,
      vSpan,
      acceptedSamples,
      rawSamples,
      trackerFps: tracking?.trackingFps ?? null,
    });

    router.push(
      testReadyHref({
        patientId,
        testId: test.id,
        mode,
        batteryIndex,
        calibrationId: dataset.id,
      }),
    );
  };

  if (!patientId || !test) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView style={styles.page} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.heroTitle}>Không mở được bước hiệu chỉnh</LocalizedPipelineText>
          </View>
          <View style={styles.sheet}>
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorTitle}>Thiếu dữ liệu điều hướng</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.errorBody}>
                Thông tin bệnh nhân hoặc bài kiểm tra không hợp lệ. Hãy quay lại hướng dẫn và thử lại.
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

  const activePoint = CALIBRATION_POINTS[activeIndex];
  const shouldShowTarget = phase === 'countdown' || phase === 'calibrating';
  const currentTarget = phase === 'countdown' ? CALIBRATION_POINTS[0] : activePoint;
  const { hSpan, vSpan } = calibrationSpans(results);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={phase !== 'countdown' && phase !== 'calibrating'}
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Hiệu chỉnh 9 điểm</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>{test.nameVi} · trước mỗi lần test</LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <View style={styles.contextCard}>
            <LocalizedPipelineText language={language} style={styles.contextLabel}>HỒ SƠ</LocalizedPipelineText>
            <LocalizedPipelineText language={language} style={styles.contextValue}>Hồ sơ hiện tại</LocalizedPipelineText>
          </View>

          <LocalizedPipelineText language={language} style={styles.sheetTitle}>Hiệu chuẩn theo ánh nhìn</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.sheetBody}>
            Giữ điện thoại cố định, giữ đầu thẳng và chỉ di chuyển mắt theo chấm xanh.
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
                <LocalizedPipelineText language={language} style={styles.centerMessageTitle}>Chuẩn bị hiệu chỉnh</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Chờ hệ thống theo dõi báo sẵn sàng. Sau đó nhìn lần lượt 9 điểm và không xoay đầu theo mục tiêu.
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
                <LocalizedPipelineText language={language} style={styles.progressText}>{activeIndex + 1}/9</LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'complete' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.completeTitle}>9/9 HOÀN TẤT</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Dữ liệu hiệu chỉnh đã sẵn sàng cho bước ánh xạ và ghi nhận chuyển động mắt tiếp theo.
                </LocalizedPipelineText>
              </View>
            ) : null}

            {phase === 'failed' ? (
              <View style={styles.centerMessage}>
                <LocalizedPipelineText language={language} style={styles.failedTitle}>Hiệu chỉnh chưa đạt</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.centerMessageBody}>
                  Có điểm không đủ dữ liệu ổn định. Cố định đầu tốt hơn rồi chạy lại.
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
              { requirement: 'FR-15', value: `Hiệu chỉnh ${results.length}/9 điểm` },
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
              onPress={startCalibration}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                {trackerReady ? 'BẮT ĐẦU HIỆU CHỈNH 9 ĐIỂM' : 'ĐANG CHUẨN BỊ CAMERA...'}
              </LocalizedPipelineText>
            </Pressable>
          ) : null}

          {phase === 'countdown' || phase === 'calibrating' ? (
            <LocalizedPipelineText language={language} style={styles.liveInstruction}>
              {phase === 'countdown' ? 'Giữ đầu ở tư thế trung tâm.' : pointStatus}
            </LocalizedPipelineText>
          ) : null}

          {phase === 'complete' ? (
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              onPress={continueAfterCalibration}
            >
              <LocalizedPipelineText language={language} style={styles.primaryButtonText}>TIẾP TỤC</LocalizedPipelineText>
            </Pressable>
          ) : null}

          {phase === 'complete' || phase === 'failed' ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              onPress={restartCalibration}
            >
              <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>HIỆU CHỈNH LẠI</LocalizedPipelineText>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorTitle}>Lỗi theo dõi / hiệu chỉnh</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.errorBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          <Pressable
            disabled={phase === 'countdown' || phase === 'calibrating'}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              (phase === 'countdown' || phase === 'calibrating') && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>QUAY LẠI HƯỚNG DẪN</LocalizedPipelineText>
          </Pressable>

          <LocalizedPipelineText language={language} style={styles.footnote}>
            Giữ đầu và điện thoại ổn định trong suốt quá trình hiệu chỉnh.
          </LocalizedPipelineText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
