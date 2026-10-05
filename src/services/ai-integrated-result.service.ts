import { runFullBatteryMetricDemo } from '@/services/ai-clinical-research-runtime.service';
import type {
  AIFullBatteryFeatureVector,
  AIIntegratedPrediction,
} from '@/types/ai-integrated-result';

export function getAIIntegratedPrediction(
  input: AIFullBatteryFeatureVector,
): AIIntegratedPrediction {
  const result = runFullBatteryMetricDemo(input.features);

  return {
    predictedLabel: result.predictedLabel,
    confidence: result.probabilities[result.predictedLabel],
    probabilities: result.probabilities,
  };
}
