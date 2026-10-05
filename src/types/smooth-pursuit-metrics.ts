import type { TestRunMode } from '@/types/test-administration';
import type { RuntimeQualityLevel } from '@/types/test-runtime';

export type SmoothPursuitMetricDraft = {
  traceId: string;
  patientId: string;
  testId: 'smooth-pursuit';
  mode: TestRunMode;
  batteryIndex: number;
  createdAt: number;
  durationMs: number;
  totalSamples: number;
  usableSamples: number;
  usableRatio: number;
  velocityPairCount: number;
  pursuitGain: number;
  meanAbsEyeVelocity: number;
  meanAbsTargetVelocity: number;
  positionRmse: number;
  positionDiagonalPercent: number;
  positionCorrelation: number;
  medianTrackingFps: number | null;
  qualityCounts: Record<RuntimeQualityLevel, number>;
  technicalReady: boolean;
};

export type SmoothPursuitMetricResult = SmoothPursuitMetricDraft & {
  id: string;
};
