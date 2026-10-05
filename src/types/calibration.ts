import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

export type CalibrationSample = {
  h: number;
  v: number;
  yaw: number;
  pitch: number;
  roll: number;
  shiftX: number;
  shiftY: number;
  fps: number;
};

export type CalibrationPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type CalibrationPointResult = {
  point: CalibrationPoint;
  h: number;
  v: number;
  madH: number;
  madV: number;
  rawCount: number;
  acceptedCount: number;
};

export type CalibrationPhase =
  | 'ready'
  | 'countdown'
  | 'calibrating'
  | 'complete'
  | 'failed';

export type CalibrationDataset = {
  id: string;
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex: number;
  createdAt: number;
  points: CalibrationPointResult[];
  hSpan: number;
  vSpan: number;
  acceptedSamples: number;
  rawSamples: number;
  trackerFps: number | null;
};
