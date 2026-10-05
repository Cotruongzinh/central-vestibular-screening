export type AIClinicalResearchLabel = 'normal' | 'peripheral' | 'central';

export type AIClinicalResearchProbability = Record<AIClinicalResearchLabel, number>;

export type AIClinicalResearchRuntimeModel = {
  schemaVersion: 'central-vestibular-clinical-research-runtime-v2';
  phase: '08D';
  status: 'demo-metric-runtime';
  generatedAt: string;
  source: 'synthetic-metric-demo-only';
  featureSchema: '08d-real-metric-full-battery-v1';
  featureNames: string[];
  labels: ['normal', 'peripheral', 'central'];
  algorithm: 'class-weighted-multinomial-logistic-regression';
  scaler: { mean: number[]; std: number[] };
  featureBounds: { min: number[]; max: number[] };
  weights: number[][];
  bias: number[];
  heldOutAccuracy: number;
  macroF1: number;
  guard: {
    demoOnly: true;
    researchOnly: true;
    clinicalReviewApproved: false;
    externalValidationCompleted: false;
    useForClinicalDiagnosis: false;
  };
};

export type AIClinicalResearchInferenceResult = {
  predictedLabel: AIClinicalResearchLabel;
  probabilities: AIClinicalResearchProbability;
};
