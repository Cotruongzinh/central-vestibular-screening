import type { TrainingModeState } from '@/types/training-mode';

export const TRAINING_PATIENT_ID = 'DEMO-TRAINING-CASE';

let state: TrainingModeState = {
  active: false,
  runId: null,
  patientId: TRAINING_PATIENT_ID,
  startedAt: null,
};

function newRunId() {
  return `TRAINING-${Date.now().toString(36).toUpperCase()}`;
}

export function startTrainingMode(): TrainingModeState {
  state = {
    active: true,
    runId: newRunId(),
    patientId: TRAINING_PATIENT_ID,
    startedAt: Date.now(),
  };

  return { ...state };
}

export function ensureTrainingMode(): TrainingModeState {
  if (!state.active) {
    return startTrainingMode();
  }

  return { ...state };
}

export function stopTrainingMode(): TrainingModeState {
  state = {
    active: false,
    runId: null,
    patientId: TRAINING_PATIENT_ID,
    startedAt: null,
  };

  return { ...state };
}

export function getTrainingModeState(): TrainingModeState {
  return { ...state };
}

export function isTrainingModeActive(): boolean {
  return state.active;
}

export function isTrainingPatientId(patientId: string | null | undefined): boolean {
  return patientId === TRAINING_PATIENT_ID;
}
