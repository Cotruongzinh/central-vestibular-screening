import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

export type RuntimeQualityLevel = 'green' | 'yellow' | 'red';

export type EyeTraceSample = {
  timestamp: number;
  elapsedMs: number;
  h: number | null;
  v: number | null;
  gazeX: number | null;
  gazeY: number | null;
  stimulusX: number | null;
  stimulusY: number | null;
  expectedX: number | null;
  expectedY: number | null;
  trackingFps: number | null;
  faceDetected: boolean;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  shiftX: number | null;
  shiftY: number | null;
  quality: RuntimeQualityLevel;
};

export type EyeTraceResult = {
  id: string;
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex: number;
  calibrationId: string;
  mappingId: string;
  validationId: string;
  startedAt: number;
  finishedAt: number;
  expectedDurationMs: number;
  activeDurationMs: number;
  samples: EyeTraceSample[];
  qualityCounts: Record<RuntimeQualityLevel, number>;
  completed: boolean;
};
