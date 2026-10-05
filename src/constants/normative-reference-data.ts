export type NormativeMetricRule = {
  id: string;
  testId: 'smooth-pursuit' | 'horizontal-saccades' | 'vertical-saccades' | 'anti-saccade' | 'npc';
  labelVi: string;
  labelEn: string;
  unit: string;
  lower: number | null;
  upper: number | null;
  protocolId: string;
  sourceId: 'kullmann-2021' | 'scheiman-2003';
};

export const ACTIVE_REFERENCE_PROFILE_ID = 'adult_western' as const;

export const REFERENCE_SOURCES = {
  'kullmann-2021': {
    title:
      'Portable eye-tracking as a reliable assessment of oculomotor, cognitive and reaction time function: Normative data for 18–45 year old',
    year: 2021,
    journal: 'PLOS ONE',
    doi: '10.1371/journal.pone.0260351',
    scope:
      'Healthy adults aged 18–45; 95% reference intervals for random saccades, smooth pursuit and antisaccades.',
  },
  'scheiman-2003': {
    title: 'Nearpoint of convergence: test procedure, target selection, and normative data',
    year: 2003,
    journal: 'Optometry and Vision Science',
    doi: '10.1097/00006324-200303000-00011',
    scope:
      'Adult near-point-of-convergence break and recovery reference cutoffs.',
  },
} as const;

export const NORMATIVE_METRIC_RULES: readonly NormativeMetricRule[] = [
  {
    id: 'smooth-pursuit-horizontal-gain-01hz',
    testId: 'smooth-pursuit',
    labelVi: 'Gain vận tốc Smooth Pursuit ngang',
    labelEn: 'Horizontal smooth-pursuit velocity gain',
    unit: 'ratio',
    lower: 0.78,
    upper: 1.07,
    protocolId: 'sp-horizontal-0.1hz-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'horizontal-saccade-latency',
    testId: 'horizontal-saccades',
    labelVi: 'Độ trễ saccade ngẫu nhiên ngang',
    labelEn: 'Horizontal random-saccade latency',
    unit: 'ms',
    lower: null,
    upper: 220,
    protocolId: 'saccade-horizontal-random-1to2s-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'horizontal-saccade-accuracy',
    testId: 'horizontal-saccades',
    labelVi: 'Độ chính xác saccade ngẫu nhiên ngang',
    labelEn: 'Horizontal random-saccade accuracy',
    unit: '%',
    lower: 81,
    upper: 103,
    protocolId: 'saccade-horizontal-random-1to2s-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'vertical-saccade-latency',
    testId: 'vertical-saccades',
    labelVi: 'Độ trễ saccade ngẫu nhiên dọc',
    labelEn: 'Vertical random-saccade latency',
    unit: 'ms',
    lower: null,
    upper: 230,
    protocolId: 'saccade-vertical-random-1to2s-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'vertical-saccade-accuracy',
    testId: 'vertical-saccades',
    labelVi: 'Độ chính xác saccade ngẫu nhiên dọc',
    labelEn: 'Vertical random-saccade accuracy',
    unit: '%',
    lower: 75,
    upper: 109,
    protocolId: 'saccade-vertical-random-1to2s-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'anti-saccade-error-rate',
    testId: 'anti-saccade',
    labelVi: 'Tỷ lệ lỗi prosaccade trong Anti-Saccade',
    labelEn: 'Anti-saccade prosaccade error rate',
    unit: '%',
    lower: 0,
    upper: 50,
    protocolId: 'antisaccade-central-cue-random-v1',
    sourceId: 'kullmann-2021',
  },
  {
    id: 'npc-break',
    testId: 'npc',
    labelVi: 'Điểm BREAK của NPC',
    labelEn: 'Near point of convergence break',
    unit: 'cm',
    lower: null,
    upper: 5,
    protocolId: 'npc-clinician-assisted-v1',
    sourceId: 'scheiman-2003',
  },
  {
    id: 'npc-recovery',
    testId: 'npc',
    labelVi: 'Điểm RECOVERY của NPC',
    labelEn: 'Near point of convergence recovery',
    unit: 'cm',
    lower: null,
    upper: 7,
    protocolId: 'npc-clinician-assisted-v1',
    sourceId: 'scheiman-2003',
  },
] as const;

export const ACTIVE_REFERENCE_AGE_MIN = 18;
export const ACTIVE_REFERENCE_AGE_MAX = 45;
