import type { ClinicianProfileView } from '@/types/clinician-profile';
import type { PatientRecord } from '@/types/patient';
import type { EyeTraceResult } from '@/types/test-runtime';
import type { PersistedTestSession } from '@/types/test-session';

export type SessionClinicianNote = {
  id: string;
  patientId: string;
  sessionId: string;
  clinicianUid: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type SessionReportBundle = {
  patient: PatientRecord;
  session: PersistedTestSession;
  trace: EyeTraceResult;
  clinicianEmail: string;
  clinicianProfile: ClinicianProfileView | null;
  clinicianLogoDataUri?: string;
  clinicianNote: SessionClinicianNote | null;
  deviceModel: string;
};
