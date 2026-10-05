export type NpcPhase =
  | 'idle'
  | 'countdown'
  | 'approach'
  | 'break-recorded'
  | 'recovery'
  | 'complete';

export type NpcTrial = {
  trialNumber: number;
  breakDistanceCm: number;
  recoveryDistanceCm: number;
};

export type NpcSummary = {
  trialCount: number;
  medianBreakCm: number;
  medianRecoveryCm: number;
  breakRangeCm: number;
  recoveryRangeCm: number;
  trials: NpcTrial[];
  mode: 'clinician-assisted-expo-go';
};

export type NpcDraftTrial = {
  breakDistanceCm: string;
  recoveryDistanceCm: string;
};
