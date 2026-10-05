export type PatientSex = 'female' | 'male' | 'other' | 'unspecified';

export type PatientPayload = {
  fullName: string;
  dateOfBirth: string;
  sex: PatientSex;
  patientId: string;
  clinicalNotes: string;
};

export type PatientRecord = {
  id: string;
  clinicianUid: string;
  localCode: string;
  isAnonymous: boolean;
  payload: PatientPayload;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PatientSessionSummary = {
  id: string;
  testType: string;
  status: string;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
};

export type PatientInput = PatientPayload;
