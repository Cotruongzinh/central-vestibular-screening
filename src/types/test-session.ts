import type { ClinicalTestId, TestRunMode } from '@/types/test-administration';
import type { RuntimeQualityLevel } from '@/types/test-runtime';
import type { ReferenceFeatureSet } from '@/types/screening-assessment';

export type AITestFeatureSet = Record<string, number>;

export type UnifiedResultDetail = {
  label: string;
  value: string;
};

export type UnifiedTechnicalResult = {
  schemaVersion: 1 | 2 | 3;
  testId: ClinicalTestId;
  metricKind: 'smooth-pursuit' | 'saccade' | 'gaze-evoked' | 'okn';
  sourceMetricId: string;
  sourceTraceId: string;
  headlineLabel: string;
  headlineValue: string;
  details: UnifiedResultDetail[];
  quality: {
    totalSamples: number;
    usableSamples: number;
    usableRatio: number;
    qualityCounts: Record<RuntimeQualityLevel, number>;
    greenRatio: number;
    medianTrackingFps: number | null;
  };
  technicalOnly: true;
  referenceFeatures?: ReferenceFeatureSet;
  aiFeatures?: AITestFeatureSet;
};

export type PersistedSessionContext = {
  schemaVersion: 1;
  mode: TestRunMode;
  batteryIndex: number;
  calibrationId: string;
  mappingId: string;
  validationId: string;
  sourceTraceId: string;
  sourceMetricId: string;
  storage: 'local-sqlite';
  encrypted: true;
};

export type PersistedTestSession = {
  id: string;
  patientId: string;
  clinicianUid: string;
  testId: ClinicalTestId;
  status: 'completed';
  startedAt: number;
  completedAt: number;
  createdAt: number;
  updatedAt: number;
  traceSampleCount: number;
  result: UnifiedTechnicalResult;
};
