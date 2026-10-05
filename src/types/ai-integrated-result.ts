export type AIIntegratedLabel = 'normal' | 'peripheral' | 'central';

export type AIIntegratedProbabilities = Record<AIIntegratedLabel, number>;

export type AIIntegratedPrediction = {
  predictedLabel: AIIntegratedLabel;
  confidence: number;
  probabilities: AIIntegratedProbabilities;
};

export type AIFullBatteryFeatureVector = {
  schemaVersion: '08d-real-metric-full-battery-v1';
  features: number[];
  testCount: 6;
};
