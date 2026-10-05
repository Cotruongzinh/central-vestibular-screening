import { GENERATED_CLINICAL_RESEARCH_RUNTIME } from '@/ai/generated-clinical-research-runtime';
import type {
  AIClinicalResearchInferenceResult,
  AIClinicalResearchLabel,
  AIClinicalResearchRuntimeModel,
} from '@/types/ai-clinical-research-runtime';

const LABELS: AIClinicalResearchLabel[] = ['normal', 'peripheral', 'central'];

export function getAIClinicalResearchRuntime(): AIClinicalResearchRuntimeModel {
  return GENERATED_CLINICAL_RESEARCH_RUNTIME;
}

function softmax(logits: number[]) {
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((value) => value / sum);
}

function argmax(values: number[]) {
  let best = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > values[best]) best = index;
  }
  return best;
}

export function runFullBatteryMetricDemo(
  rawFeatures: readonly number[],
): AIClinicalResearchInferenceResult {
  const runtime = GENERATED_CLINICAL_RESEARCH_RUNTIME;

  if (runtime.status !== 'demo-metric-runtime') {
    throw new Error('AI metric runtime is unavailable.');
  }
  if (
    !runtime.guard.demoOnly ||
    !runtime.guard.researchOnly ||
    runtime.guard.useForClinicalDiagnosis !== false
  ) {
    throw new Error('AI metric runtime guard is invalid.');
  }
  if (rawFeatures.length !== runtime.featureNames.length) {
    throw new Error('AI full-battery feature length mismatch.');
  }

  const x = rawFeatures.map((rawValue, index) => {
    if (!Number.isFinite(rawValue)) {
      throw new Error(`AI feature ${index} is not finite.`);
    }

    const lower = runtime.featureBounds.min[index] ?? rawValue;
    const upper = runtime.featureBounds.max[index] ?? rawValue;
    const clipped = Math.min(upper, Math.max(lower, rawValue));
    const mean = runtime.scaler.mean[index] ?? 0;
    const std = runtime.scaler.std[index] ?? 1;
    return (clipped - mean) / (Math.abs(std) < 1e-9 ? 1 : std);
  });

  const logits = LABELS.map((_, classIndex) => {
    const row = runtime.weights[classIndex];
    if (!row || row.length !== x.length) {
      throw new Error('AI model weight shape mismatch.');
    }
    return (
      (runtime.bias[classIndex] ?? 0) +
      x.reduce((sum, value, index) => sum + value * (row[index] ?? 0), 0)
    );
  });

  const probabilities = softmax(logits);
  const predictedLabel = LABELS[argmax(probabilities)] ?? 'normal';

  return {
    predictedLabel,
    probabilities: {
      normal: probabilities[0] ?? 0,
      peripheral: probabilities[1] ?? 0,
      central: probabilities[2] ?? 0,
    },
  };
}
