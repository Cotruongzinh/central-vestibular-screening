import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedPipelineText } from '@/components/i18n/LocalizedPipelineText';
import { RequirementEvidenceStrip } from '@/components/tests/RequirementEvidenceStrip';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { testStoredSessionHref } from '@/navigation/test-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getPersistedTestSession,
  getStoredEyeTrace,
} from '@/services/test-session.service';
import { replayStyles as styles } from '@/styles/screens/tests/replay.styles';
import type { EyeTraceResult, RuntimeQualityLevel } from '@/types/test-runtime';
import type { PersistedTestSession } from '@/types/test-session';

type ReplaySpeed = 0.25 | 0.5 | 1;

type ReplayKhung = {
  elapsedMs: number;
  gazeX: number;
  gazeY: number;
  targetX: number;
  targetY: number;
  quality: RuntimeQualityLevel;
  trackingFps: number | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function coordinateOrCenter(value: number | null | undefined) {
  return isFiniteNumber(value) ? clamp01(value) : 0.5;
}

function buildReplayKhungs(trace: EyeTraceResult): ReplayKhung[] {
  return trace.samples
    .filter(
      (sample) =>
        isFiniteNumber(sample.elapsedMs) &&
        (isFiniteNumber(sample.gazeX) || isFiniteNumber(sample.gazeY)),
    )
    .map((sample) => ({
      elapsedMs: sample.elapsedMs,
      gazeX: coordinateOrCenter(sample.gazeX),
      gazeY: coordinateOrCenter(sample.gazeY),
      targetX: coordinateOrCenter(
        isFiniteNumber(sample.stimulusX) ? sample.stimulusX : sample.expectedX,
      ),
      targetY: coordinateOrCenter(
        isFiniteNumber(sample.stimulusY) ? sample.stimulusY : sample.expectedY,
      ),
      quality: sample.quality,
      trackingFps: sample.trackingFps,
    }));
}

function formatSeconds(milliseconds: number) {
  return `${(Math.max(0, milliseconds) / 1000).toFixed(1)} s`;
}

export default function TraceReplayScreen() {
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const patientId = firstParam(params.patientId as string | string[] | undefined);
  const sessionId = firstParam(params.sessionId as string | string[] | undefined);

  const [session, setSession] = useState<PersistedTestSession | null>(null);
  const [trace, setTrace] = useState<EyeTraceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [frameIndex, setKhungIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(0.25);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified || !sessionId) {
        if (active) {
          setErrorMessage('Thiếu phiên kiểm tra hoặc tài khoản chưa được xác minh.');
          setLoading(false);
        }
        return;
      }

      try {
        const [storedSession, storedTrace] = await Promise.all([
          getPersistedTestSession(user.uid, sessionId),
          getStoredEyeTrace(user.uid, sessionId),
        ]);

        if (
          !storedSession ||
          !storedTrace ||
          (patientId && storedSession.patientId !== patientId) ||
          storedTrace.patientId !== storedSession.patientId ||
          storedTrace.id !== storedSession.result.sourceTraceId
        ) {
          throw new Error('REPLAY_CONTEXT_INVALID');
        }

        if (active) {
          setSession(storedSession);
          setTrace(storedTrace);
        }
      } catch {
        if (active) {
          setErrorMessage('Không thể ghép phiên kiểm tra với dữ liệu theo dõi mắt để phát lại.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [patientId, sessionId]);

  const frames = useMemo(() => (trace ? buildReplayKhungs(trace) : []), [trace]);
  const currentKhung = frames[frameIndex];
  const test = session && isClinicalTestId(session.testId)
    ? getClinicalTest(session.testId)
    : undefined;

  useEffect(() => {
    if (!playing || frames.length < 2) {
      return;
    }

    if (frameIndex >= frames.length - 1) {
      setPlaying(false);
      return;
    }

    const current = frames[frameIndex];
    const next = frames[frameIndex + 1];
    const sourceDelay = Math.max(16, next.elapsedMs - current.elapsedMs);
    const replayDelay = Math.max(16, Math.round(sourceDelay / speed));

    const timer = setTimeout(() => {
      setKhungIndex((value) => Math.min(value + 1, frames.length - 1));
    }, replayDelay);

    return () => clearTimeout(timer);
  }, [frameIndex, frames, playing, speed]);

  useEffect(() => {
    setKhungIndex(0);
    setPlaying(false);
  }, [trace?.id]);

  const totalElapsed = frames.length > 0 ? frames[frames.length - 1].elapsedMs : 0;
  const progress = frames.length > 1 ? frameIndex / (frames.length - 1) : 0;
  const stageReady = stageSize.width > 0 && stageSize.height > 0 && currentKhung;

  const qualityStyle = currentKhung?.quality === 'green'
    ? styles.qualityGreen
    : currentKhung?.quality === 'yellow'
      ? styles.qualityYellow
      : styles.qualityRed;

  function togglePlayback() {
    if (frames.length < 2) {
      return;
    }

    if (frameIndex >= frames.length - 1) {
      setKhungIndex(0);
      setPlaying(true);
      return;
    }

    setPlaying((value) => !value);
  }

  function restart() {
    setPlaying(false);
    setKhungIndex(0);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.hero}>
          <LocalizedPipelineText language={language} style={styles.heroEyebrow}></LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroTitle}>Phát lại dữ liệu theo dõi mắt</LocalizedPipelineText>
          <LocalizedPipelineText language={language} style={styles.heroSubtitle}>
            Phát lại chậm ước lượng hướng nhìn và vị trí mục tiêu từ dữ liệu đã lưu; không giữ video camera gốc.
          </LocalizedPipelineText>
        </View>

        <View style={styles.sheet}>
          <RequirementEvidenceStrip items={[{ requirement: 'FR-30', value: 'Phát lại 0,25× + lớp phủ hướng nhìn' }]} />

          <View style={[styles.badge, Boolean(errorMessage) && styles.badgeError]}>
            <LocalizedPipelineText language={language} style={[styles.badgeText, Boolean(errorMessage) && styles.badgeTextError]}>
              {session && trace
                ? 'PHÁT LẠI DỮ LIỆU MẮT SẴN SÀNG'
                : errorMessage
                  ? 'LỖI DỮ LIỆU PHÁT LẠI'
                  : 'ĐANG TẢI DỮ LIỆU'}
            </LocalizedPipelineText>
          </View>

          {loading ? <LocalizedPipelineText language={language} style={styles.loading}>Đang giải mã dữ liệu theo dõi mắt...</LocalizedPipelineText> : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <LocalizedPipelineText language={language} style={styles.errorTitle}>Không mở được chế độ phát lại</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.errorBody}>{errorMessage}</LocalizedPipelineText>
            </View>
          ) : null}

          {session && trace ? (
            <>
              <LocalizedPipelineText language={language} style={styles.title}>{test?.nameVi ?? session.testId}</LocalizedPipelineText>
              <LocalizedPipelineText language={language} style={styles.body}>
                Phát lại chậm hướng nhìn và vị trí mục tiêu của phiên kiểm tra.
              </LocalizedPipelineText>

              <View style={styles.compatibilityCard}>
                <LocalizedPipelineText language={language} style={styles.compatibilityTitle}>Phát lại hướng nhìn</LocalizedPipelineText>
                <LocalizedPipelineText language={language} style={styles.compatibilityBody}>
                  Phát lại đường nhìn đã xử lý cùng vị trí mục tiêu.
                </LocalizedPipelineText>
              </View>

              {frames.length > 0 ? (
                <>
                  <View
                    style={styles.stage}
                    onLayout={(event) => {
                      const { width, height } = event.nativeEvent.layout;
                      setStageSize({ width, height });
                    }}
                  >
                    <View style={styles.stageHorizontalGuide} />
                    <View style={styles.stageVerticalGuide} />

                    {stageReady ? (
                      <>
                        <View
                          style={[
                            styles.targetDot,
                            {
                              left: currentKhung.targetX * stageSize.width - 9,
                              top: currentKhung.targetY * stageSize.height - 9,
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.gazeDot,
                            {
                              left: currentKhung.gazeX * stageSize.width - 7,
                              top: currentKhung.gazeY * stageSize.height - 7,
                            },
                          ]}
                        />
                      </>
                    ) : null}

                    <View style={styles.legend}>
                      <View style={styles.legendRow}>
                        <View style={styles.legendTarget} />
                        <LocalizedPipelineText language={language} style={styles.legendText}>Mục tiêu</LocalizedPipelineText>
                      </View>
                      <View style={styles.legendRow}>
                        <View style={styles.legendGaze} />
                        <LocalizedPipelineText language={language} style={styles.legendText}>Ước lượng hướng nhìn</LocalizedPipelineText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(progress * 100)}%` },
                      ]}
                    />
                  </View>

                  <View style={styles.timeRow}>
                    <LocalizedPipelineText language={language} style={styles.timeText}>
                      {formatSeconds(currentKhung?.elapsedMs ?? 0)}
                    </LocalizedPipelineText>
                    <LocalizedPipelineText language={language} style={styles.timeText}>{formatSeconds(totalElapsed)}</LocalizedPipelineText>
                  </View>

                  <View style={styles.telemetryCard}>
                    <View style={styles.telemetryRow}>
                      <LocalizedPipelineText language={language} style={styles.telemetryLabel}>Chất lượng theo dõi</LocalizedPipelineText>
                      <View style={[styles.qualityBadge, qualityStyle]}>
                        <LocalizedPipelineText language={language} style={styles.qualityText}>
                          {(currentKhung?.quality ?? 'red').toUpperCase()}
                        </LocalizedPipelineText>
                      </View>
                    </View>
                    <View style={styles.telemetryRow}>
                      <LocalizedPipelineText language={language} style={styles.telemetryLabel}>Tốc độ theo dõi</LocalizedPipelineText>
                      <LocalizedPipelineText language={language} style={styles.telemetryValue}>
                        {currentKhung && isFiniteNumber(currentKhung.trackingFps)
                          ? currentKhung.trackingFps.toFixed(1)
                          : '—'}
                      </LocalizedPipelineText>
                    </View>
                    <View style={styles.telemetryRowLast}>

                    </View>
                  </View>

                  <LocalizedPipelineText language={language} style={styles.sectionTitle}>Tốc độ phát lại</LocalizedPipelineText>
                  <View style={styles.speedRow}>
                    {([0.25, 0.5, 1] as ReplaySpeed[]).map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setSpeed(item)}
                        style={({ pressed }) => [
                          styles.speedButton,
                          speed === item && styles.speedButtonSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <LocalizedPipelineText language={language}
                          style={[
                            styles.speedText,
                            speed === item && styles.speedTextSelected,
                          ]}
                        >
                          {item}×
                        </LocalizedPipelineText>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable
                    onPress={togglePlayback}
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  >
                    <LocalizedPipelineText language={language} style={styles.primaryButtonText}>
                      {playing
                        ? 'TẠM DỪNG PHÁT LẠI'
                        : frameIndex >= frames.length - 1
                          ? 'PHÁT LẠI TỪ ĐẦU'
                          : 'BẮT ĐẦU PHÁT LẠI'}
                    </LocalizedPipelineText>
                  </Pressable>

                  <Pressable
                    onPress={restart}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>PHÁT LẠI TỪ ĐẦU</LocalizedPipelineText>
                  </Pressable>
                </>
              ) : (
                <View style={styles.errorBox}>
                  <LocalizedPipelineText language={language} style={styles.errorTitle}>Không có mapped gaze frames</LocalizedPipelineText>
                  <LocalizedPipelineText language={language} style={styles.errorBody}>
                    Dữ liệu theo dõi mắt đã lưu nhưng không đủ tọa độ hướng nhìn để dựng phát lại.
                  </LocalizedPipelineText>
                </View>
              )}

              <Pressable
                onPress={() => router.replace(testStoredSessionHref(session.patientId, session.id))}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <LocalizedPipelineText language={language} style={styles.secondaryButtonText}>VỀ CHI TIẾT PHIÊN KIỂM TRA</LocalizedPipelineText>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
