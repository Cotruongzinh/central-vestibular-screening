import type { ClinicalTestId } from '@/types/test-administration';

export type LongitudinalComparisonPoint = {
  sessionId: string;
  completedAt: number;
  value: number;
  valueText: string;
  usableRatio: number;
  greenRatio: number;
};

export type LongitudinalComparisonSeries = {
  testId: ClinicalTestId;
  testName: string;
  shortName: string;
  metricLabel: string;
  unit: 'ratio' | 'ms' | '/s' | '%';
  points: LongitudinalComparisonPoint[];
  firstValue: number;
  latestValue: number;
  absoluteDelta: number;
};
