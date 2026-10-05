import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';
import type { RuntimeQualityLevel } from '@/types/test-runtime';

export type SaccadeMetricTestId = Extract<
  ClinicalTestId,
  'horizontal-saccades' | 'vertical-saccades' | 'anti-saccade'
>;

export type SaccadeTrialMetric = {
  transitionIndex: number;
  transitionTimeMs: number;
  targetAmplitude: number;
  firstResponseLatencyMs: number;
  firstResponseDirectionCorrect: boolean;
  peakVelocity: number;
  endpointError: number;
  endpointAccuracy: number;
  amplitudeRatio: number;
  overshootRatio: number;
};

export type SaccadeMetricDraft = {
  traceId: string;
  patientId: string;
  testId: SaccadeMetricTestId;
  mode: TestRunMode;
  batteryIndex: number;
  createdAt: number;
  durationMs: number;
  totalSamples: number;
  usableSamples: number;
  usableRatio: number;
  totalTransitions: number;
  analyzedTransitions: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  meanPeakVelocity: number;
  medianPeakVelocity: number;
  meanEndpointError: number;
  meanEndpointAccuracy: number;
  meanAmplitudeRatio: number;
  meanOvershootRatio: number;
  directionCorrectTrials: number;
  directionCorrectRatio: number;
  medianTrackingFps: number | null;
  qualityCounts: Record<RuntimeQualityLevel, number>;
  trials: SaccadeTrialMetric[];
  technicalReady: boolean;
};

export type SaccadeMetricResult = SaccadeMetricDraft & {
  id: string;
};
