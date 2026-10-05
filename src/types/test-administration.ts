export type ClinicalTestId =
  | 'smooth-pursuit'
  | 'horizontal-saccades'
  | 'vertical-saccades'
  | 'anti-saccade'
  | 'gaze-evoked-nystagmus'
  | 'okn'
  | 'npc';

export type TestRunMode = 'single' | 'battery';

export type TestAvailability = 'active' | 'protocol';

export interface ClinicalTestDefinition {
  id: ClinicalTestId;
  order: number;
  nameVi: string;
  nameEn: string;
  shortName: string;
  durationLabel: string;
  purpose: string;
  clinicianInstruction: string;
  patientInstruction: string;
  stimulusSummary: string;
  measurements: string[];
  inFullBattery: boolean;
  availability: TestAvailability;
  requirement: string;
}

export interface TestInstructionRouteParams {
  patientId: string;
  testId: ClinicalTestId;
  mode: TestRunMode;
  batteryIndex?: number;
}
