import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';

export type GazeMapperKind = 'RIDGE_LINEAR' | 'POLYNOMIAL_2' | 'KNN_3';

export type GazePoint = {
  x: number;
  y: number;
};

export type GazeMapperScore = {
  kind: GazeMapperKind;
  label: string;
  meanError: number;
  diagonalPercent: number;
  maxError: number;
};

export type RegressionMapperSpec = {
  kind: 'RIDGE_LINEAR' | 'POLYNOMIAL_2';
  label: string;
  meanH: number;
  meanV: number;
  stdH: number;
  stdV: number;
  weightsX: number[];
  weightsY: number[];
};

export type KnnMapperSpec = {
  kind: 'KNN_3';
  label: string;
  meanH: number;
  meanV: number;
  stdH: number;
  stdV: number;
  train: Array<{
    h: number;
    v: number;
    x: number;
    y: number;
  }>;
};

export type GazeMapperSpec = RegressionMapperSpec | KnnMapperSpec;

export type GazeMappingResult = {
  id: string;
  calibrationId: string;
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex: number;
  createdAt: number;
  bestKind: GazeMapperKind;
  bestLabel: string;
  scores: GazeMapperScore[];
  model: GazeMapperSpec;
};
