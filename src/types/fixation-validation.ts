import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

export type FixationValidationPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type FixationValidationPointResult = {
  point: FixationValidationPoint;
  predictedX: number;
  predictedY: number;
  error: number;
  diagonalPercent: number;
  acceptedCount: number;
  rawCount: number;
};

export type FixationValidationPhase =
  | 'ready'
  | 'countdown'
  | 'validating'
  | 'complete'
  | 'failed';

export type FixationValidationResult = {
  id: string;
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex: number;
  calibrationId: string;
  mappingId: string;
  createdAt: number;
  points: FixationValidationPointResult[];
  meanError: number;
  maxError: number;
  meanDiagonalPercent: number;
  acceptedSamples: number;
  rawSamples: number;
  acceptedRatio: number;
  trackerFps: number | null;
  technicalQualityPass: boolean;
};
