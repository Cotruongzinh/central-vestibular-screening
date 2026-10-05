import type { NystagmusMetricResult } from '@/types/nystagmus-metrics';
import type { SaccadeMetricResult } from '@/types/saccade-metrics';
import type { SmoothPursuitMetricResult } from '@/types/smooth-pursuit-metrics';
import type { EyeTraceResult, RuntimeQualityLevel } from '@/types/test-runtime';
import type { UnifiedTechnicalResult } from '@/types/test-session';

export type UnifiedMetricSource =
  | SmoothPursuitMetricResult
  | SaccadeMetricResult
  | NystagmusMetricResult;

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function qualitySummary(
  trace: EyeTraceResult,
  usableSamples: number,
  usableRatio: number,
  medianTrackingFps: number | null,
) {
  const counts: Record<RuntimeQualityLevel, number> = {
    green: trace.qualityCounts.green,
    yellow: trace.qualityCounts.yellow,
    red: trace.qualityCounts.red,
  };
  const total = Math.max(1, trace.samples.length);

  return {
    totalSamples: trace.samples.length,
    usableSamples,
    usableRatio,
    qualityCounts: counts,
    greenRatio: counts.green / total,
    medianTrackingFps,
  };
}

export function buildUnifiedTechnicalResult(
  trace: EyeTraceResult,
  metric: UnifiedMetricSource,
): UnifiedTechnicalResult {
  if (metric.testId === 'smooth-pursuit') {
    return {
      schemaVersion: 3,
      testId: metric.testId,
      metricKind: 'smooth-pursuit',
      sourceMetricId: metric.id,
      sourceTraceId: trace.id,
      headlineLabel: 'Pursuit gain estimate',
      headlineValue: metric.pursuitGain.toFixed(3),
      details: [
        { label: 'Mean |eye velocity|', value: `${metric.meanAbsEyeVelocity.toFixed(3)} /s` },
        { label: 'Mean |target velocity|', value: `${metric.meanAbsTargetVelocity.toFixed(3)} /s` },
        { label: 'Position RMSE', value: `${metric.positionRmse.toFixed(4)} · ${metric.positionDiagonalPercent.toFixed(1)}% diagonal` },
        { label: 'Position correlation', value: metric.positionCorrelation.toFixed(3) },
        { label: 'Velocity pairs', value: String(metric.velocityPairCount) },
      ],
      quality: qualitySummary(
        trace,
        metric.usableSamples,
        metric.usableRatio,
        metric.medianTrackingFps,
      ),
      technicalOnly: true,
      aiFeatures: {
        pursuitGain: metric.pursuitGain,
        positionRmse: metric.positionRmse,
        positionCorrelation: metric.positionCorrelation,
        usableRatio: metric.usableRatio,
        greenRatio: trace.qualityCounts.green / Math.max(1, trace.samples.length),
        medianTrackingFps: metric.medianTrackingFps ?? 0,
      },
      referenceFeatures: {
        protocolId: 'sp-horizontal-0.1hz-v1',
        pursuitGain: metric.pursuitGain,
      },
    };
  }

  if (
    metric.testId === 'horizontal-saccades' ||
    metric.testId === 'vertical-saccades' ||
    metric.testId === 'anti-saccade'
  ) {
    const responseLabel =
      metric.testId === 'anti-saccade'
        ? 'Expected-direction first responses'
        : 'Target-direction first responses';

    return {
      schemaVersion: 3,
      testId: metric.testId,
      metricKind: 'saccade',
      sourceMetricId: metric.id,
      sourceTraceId: trace.id,
      headlineLabel: 'Median response latency',
      headlineValue: `${Math.round(metric.medianLatencyMs)} ms`,
      details: [
        { label: 'Mean response latency', value: `${Math.round(metric.meanLatencyMs)} ms` },
        { label: 'Median peak velocity', value: `${metric.medianPeakVelocity.toFixed(3)} /s` },
        { label: 'Endpoint accuracy estimate', value: percent(metric.meanEndpointAccuracy) },
        { label: 'Mean amplitude ratio', value: metric.meanAmplitudeRatio.toFixed(3) },
        { label: 'Mean overshoot estimate', value: percent(metric.meanOvershootRatio) },
        { label: responseLabel, value: `${percent(metric.directionCorrectRatio)} · ${metric.directionCorrectTrials}/${metric.analyzedTransitions}` },
        { label: 'Transitions analyzed', value: `${metric.analyzedTransitions}/${metric.totalTransitions}` },
      ],
      quality: qualitySummary(
        trace,
        metric.usableSamples,
        metric.usableRatio,
        metric.medianTrackingFps,
      ),
      technicalOnly: true,
      aiFeatures: {
        medianLatencyMs: metric.medianLatencyMs,
        meanLatencyMs: metric.meanLatencyMs,
        medianPeakVelocity: metric.medianPeakVelocity,
        endpointAccuracyPercent: metric.meanEndpointAccuracy * 100,
        amplitudeRatio: metric.meanAmplitudeRatio,
        overshootPercent: metric.meanOvershootRatio * 100,
        directionCorrectPercent: metric.directionCorrectRatio * 100,
        antiSaccadeErrorRatePercent:
          metric.testId === 'anti-saccade'
            ? (1 - metric.directionCorrectRatio) * 100
            : 0,
        usableRatio: metric.usableRatio,
        greenRatio: trace.qualityCounts.green / Math.max(1, trace.samples.length),
        medianTrackingFps: metric.medianTrackingFps ?? 0,
      },
      referenceFeatures: {
        protocolId:
          metric.testId === 'horizontal-saccades'
            ? 'saccade-horizontal-random-1to2s-v1'
            : metric.testId === 'vertical-saccades'
              ? 'saccade-vertical-random-1to2s-v1'
              : 'antisaccade-central-cue-random-v1',
        medianLatencyMs: metric.medianLatencyMs,
        meanEndpointAccuracyPercent: metric.meanEndpointAccuracy * 100,
        antiSaccadeErrorRatePercent:
          metric.testId === 'anti-saccade'
            ? (1 - metric.directionCorrectRatio) * 100
            : undefined,
      },
    };
  }

  if (metric.testId === 'gaze-evoked-nystagmus' && metric.kind === 'gaze-evoked') {
    return {
      schemaVersion: 3,
      testId: metric.testId,
      metricKind: 'gaze-evoked',
      sourceMetricId: metric.id,
      sourceTraceId: trace.id,
      headlineLabel: 'Mean |slow-phase velocity| estimate',
      headlineValue: `${metric.meanAbsoluteSlowPhaseVelocity.toFixed(3)} /s`,
      details: [
        { label: 'Max |SPV estimate|', value: `${metric.maxAbsoluteSlowPhaseVelocity.toFixed(3)} /s` },
        { label: 'Eccentric holds analyzed', value: String(metric.eccentricHoldsAnalyzed) },
        { label: 'Candidate quick phases / min', value: metric.quickPhaseCandidateRatePerMinute.toFixed(1) },
        { label: 'Mean position error', value: metric.meanPositionError.toFixed(4) },
      ],
      quality: qualitySummary(
        trace,
        metric.usableSamples,
        metric.usableRatio,
        metric.medianTrackingFps,
      ),
      technicalOnly: true,
      aiFeatures: {
        meanAbsoluteSlowPhaseVelocity: metric.meanAbsoluteSlowPhaseVelocity,
        maxAbsoluteSlowPhaseVelocity: metric.maxAbsoluteSlowPhaseVelocity,
        quickPhaseCandidateRatePerMinute: metric.quickPhaseCandidateRatePerMinute,
        meanPositionError: metric.meanPositionError,
        usableRatio: metric.usableRatio,
        greenRatio: trace.qualityCounts.green / Math.max(1, trace.samples.length),
        medianTrackingFps: metric.medianTrackingFps ?? 0,
      },
    };
  }

  if (metric.testId === 'okn' && metric.kind === 'okn') {
    return {
      schemaVersion: 3,
      testId: metric.testId,
      metricKind: 'okn',
      sourceMetricId: metric.id,
      sourceTraceId: trace.id,
      headlineLabel: 'Directional asymmetry estimate',
      headlineValue: percent(metric.directionalAsymmetryRatio),
      details: [
        { label: 'Rightward |SPV estimate|', value: `${metric.rightward.slowPhaseVelocityMagnitude.toFixed(3)} /s` },
        { label: 'Leftward |SPV estimate|', value: `${metric.leftward.slowPhaseVelocityMagnitude.toFixed(3)} /s` },
        { label: 'Rightward agreement', value: percent(metric.rightward.directionAgreementRatio) },
        { label: 'Leftward agreement', value: percent(metric.leftward.directionAgreementRatio) },
        { label: 'Candidate quick phases / min', value: metric.combinedQuickPhaseCandidateRatePerMinute.toFixed(1) },
      ],
      quality: qualitySummary(
        trace,
        metric.usableSamples,
        metric.usableRatio,
        metric.medianTrackingFps,
      ),
      technicalOnly: true,
      aiFeatures: {
        directionalAsymmetryPercent: metric.directionalAsymmetryRatio * 100,
        rightSlowPhaseVelocity: metric.rightward.slowPhaseVelocityMagnitude,
        leftSlowPhaseVelocity: metric.leftward.slowPhaseVelocityMagnitude,
        rightAgreementPercent: metric.rightward.directionAgreementRatio * 100,
        leftAgreementPercent: metric.leftward.directionAgreementRatio * 100,
        quickPhaseCandidateRatePerMinute: metric.combinedQuickPhaseCandidateRatePerMinute,
        usableRatio: metric.usableRatio,
        greenRatio: trace.qualityCounts.green / Math.max(1, trace.samples.length),
        medianTrackingFps: metric.medianTrackingFps ?? 0,
      },
    };
  }

  throw new Error('UNSUPPORTED_METRIC_RESULT');
}
