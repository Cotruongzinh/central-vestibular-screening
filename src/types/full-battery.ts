import type { ClinicalTestId } from '@/types/test-administration';
import type { PersistedTestSession } from '@/types/test-session';

export type FullBatteryRunStatus = 'active' | 'completed' | 'cancelled';

export type FullBatteryRunPayload = {
  schemaVersion: 1;
  sessionIds: Array<string | null>;
};

export type FullBatteryRunEntry = {
  batteryIndex: number;
  testId: ClinicalTestId;
  sessionId: string;
  completedAt: number;
  headlineLabel: string;
  headlineValue: string;
  greenRatio: number;
  usableRatio: number;
  traceSampleCount: number;
};

export type FullBatteryRun = {
  id: string;
  patientId: string;
  clinicianUid: string;
  status: FullBatteryRunStatus;
  completedCount: number;
  startedAt: number;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
  entries: FullBatteryRunEntry[];
};

export type FullBatteryRunWithSessions = FullBatteryRun & {
  sessions: PersistedTestSession[];
};
