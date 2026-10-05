import type { ClinicalTestId } from '@/types/test-administration';
import type { NormativeReferencePopulationId } from '@/types/normative-reference';

export type ReferenceFlag = 'green' | 'yellow' | 'red';

export type ReferenceFeatureSet = {
  protocolId: string;
  pursuitGain?: number;
  medianLatencyMs?: number;
  meanEndpointAccuracyPercent?: number;
  antiSaccadeErrorRatePercent?: number;
};

export type ReferenceMetricAssessment = {
  id: string;
  labelVi: string;
  labelEn: string;
  value: number | null;
  formattedValue: string;
  referenceText: string;
  flag: ReferenceFlag;
  reason:
    | 'within_reference'
    | 'outside_reference'
    | 'limited_quality'
    | 'protocol_mismatch'
    | 'age_out_of_range'
    | 'reference_profile_unavailable'
    | 'metric_unavailable';
  sourceId?: string;
};

export type SessionReferenceAssessment = {
  testId: ClinicalTestId;
  populationId: NormativeReferencePopulationId;
  flag: ReferenceFlag;
  evaluable: boolean;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  metrics: ReferenceMetricAssessment[];
};

export type BatteryScreeningAssessment = {
  flag: ReferenceFlag;
  evaluableTests: number;
  deviationTests: number;
  limitedTests: number;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
};
