import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';
import type { RuntimeQualityLevel } from '@/types/test-runtime';

export type NystagmusMetricTestId = Extract<
  ClinicalTestId,
  'gaze-evoked-nystagmus' | 'okn'
>;

export type GenHoldDirection = 'RIGHT' | 'LEFT' | 'UP' | 'DOWN';

export type GenHoldMetric = {
  holdIndex: number;
  direction: GenHoldDirection;
  startMs: number;
  endMs: number;
  expectedX: number;
  expectedY: number;
  slowPhaseVelocity: number;
  absoluteSlowPhaseVelocity: number;
  quickPhaseCandidates: number;
  velocityPairs: number;
  meanPositionError: number;
};

export type OknDirectionMetric = {
  direction: 'RIGHTWARD' | 'LEFTWARD';
  blockCount: number;
  slowPhaseVelocityMagnitude: number;
  directionAgreementRatio: number;
  quickPhaseCandidates: number;
  velocityPairs: number;
};

type CommonMetricDraft = {
  traceId: string;
  patientId: string;
  testId: NystagmusMetricTestId;
  mode: TestRunMode;
  batteryIndex: number;
  createdAt: number;
  durationMs: number;
  totalSamples: number;
  usableSamples: number;
  usableRatio: number;
  medianTrackingFps: number | null;
  qualityCounts: Record<RuntimeQualityLevel, number>;
  technicalReady: boolean;
};

export type GazeEvokedMetricDraft = CommonMetricDraft & {
  testId: 'gaze-evoked-nystagmus';
  kind: 'gaze-evoked';
  eccentricHoldsAnalyzed: number;
  meanAbsoluteSlowPhaseVelocity: number;
  maxAbsoluteSlowPhaseVelocity: number;
  quickPhaseCandidateRatePerMinute: number;
  meanPositionError: number;
  holds: GenHoldMetric[];
};

export type OknMetricDraft = CommonMetricDraft & {
  testId: 'okn';
  kind: 'okn';
  rightward: OknDirectionMetric;
  leftward: OknDirectionMetric;
  directionalAsymmetryRatio: number;
  combinedQuickPhaseCandidateRatePerMinute: number;
};

export type NystagmusMetricDraft = GazeEvokedMetricDraft | OknMetricDraft;

export type NystagmusMetricResult = NystagmusMetricDraft & {
  id: string;
};
