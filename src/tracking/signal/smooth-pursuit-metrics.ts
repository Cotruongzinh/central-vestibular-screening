import type { EyeTraceResult, EyeTraceSample } from '@/types/test-runtime';
import type { SmoothPursuitMetricDraft } from '@/types/smooth-pursuit-metrics';

type PursuitRow = {
  t: number;
  gazeX: number;
  targetX: number;
  trackingFps: number | null;
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function mean(values: number[]) {
  if (!values.length) {
    return Number.NaN;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) {
    return Number.NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values: number[], ratio: number) {
  if (!values.length) {
    return Number.NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.max(
    0,
    Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)),
  );

  return sorted[position];
}

function movingAverage(values: number[], radius = 1) {
  return values.map((_, index) => {
    let sum = 0;
    let count = 0;

    for (
      let cursor = Math.max(0, index - radius);
      cursor <= Math.min(values.length - 1, index + radius);
      cursor += 1
    ) {
      sum += values[cursor];
      count += 1;
    }

    return count > 0 ? sum / count : values[index];
  });
}

function correlation(a: number[], b: number[]) {
  if (a.length !== b.length || a.length < 3) {
    return Number.NaN;
  }

  const meanA = mean(a);
  const meanB = mean(b);
  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    denominatorA += da * da;
    denominatorB += db * db;
  }

  const denominator = Math.sqrt(denominatorA * denominatorB);
  return denominator > 1e-12 ? numerator / denominator : Number.NaN;
}

function toPursuitRows(samples: EyeTraceSample[]) {
  return samples
    .filter(
      (sample) =>
        sample.quality !== 'red' &&
        isFiniteNumber(sample.elapsedMs) &&
        isFiniteNumber(sample.gazeX) &&
        isFiniteNumber(sample.stimulusX),
    )
    .map<PursuitRow>((sample) => ({
      t: sample.elapsedMs,
      gazeX: sample.gazeX as number,
      targetX: sample.stimulusX as number,
      trackingFps: isFiniteNumber(sample.trackingFps)
        ? sample.trackingFps
        : null,
    }))
    .sort((a, b) => a.t - b.t);
}

export function computeSmoothPursuitMetrics(
  trace: EyeTraceResult,
): SmoothPursuitMetricDraft | null {
  if (!trace.completed || trace.testId !== 'smooth-pursuit') {
    return null;
  }

  const rows = toPursuitRows(trace.samples);

  if (rows.length < 12) {
    return null;
  }

  const times = rows.map((row) => row.t);
  const gaze = movingAverage(rows.map((row) => row.gazeX), 1);
  const target = movingAverage(rows.map((row) => row.targetX), 1);

  const eyeVelocity: number[] = [];
  const targetVelocity: number[] = [];

  for (let index = 1; index < rows.length - 1; index += 1) {
    const dtSeconds = (times[index + 1] - times[index - 1]) / 1000;

    if (dtSeconds < 0.03 || dtSeconds > 0.5) {
      continue;
    }

    const eye = (gaze[index + 1] - gaze[index - 1]) / dtSeconds;
    const stimulus = (target[index + 1] - target[index - 1]) / dtSeconds;

    if (!Number.isFinite(eye) || !Number.isFinite(stimulus)) {
      continue;
    }

    eyeVelocity.push(eye);
    targetVelocity.push(stimulus);
  }

  if (eyeVelocity.length < 10) {
    return null;
  }

  const targetSpeedScale = percentile(
    targetVelocity.map((value) => Math.abs(value)),
    0.8,
  );
  const speedThreshold = Math.max(0.03, targetSpeedScale * 0.15);

  let numerator = 0;
  let denominator = 0;
  const keptEyeVelocity: number[] = [];
  const keptTargetVelocity: number[] = [];

  for (let index = 0; index < targetVelocity.length; index += 1) {
    const stimulus = targetVelocity[index];
    const eye = eyeVelocity[index];

    // Near the sinusoid turning points the target velocity approaches zero,
    // making a ratio unstable. Those technical samples are excluded from gain.
    if (Math.abs(stimulus) < speedThreshold) {
      continue;
    }

    numerator += eye * stimulus;
    denominator += stimulus * stimulus;
    keptEyeVelocity.push(eye);
    keptTargetVelocity.push(stimulus);
  }

  if (keptEyeVelocity.length < 8 || denominator < 1e-10) {
    return null;
  }

  const pursuitGain = numerator / denominator;
  const positionErrors = gaze.map((value, index) => value - target[index]);
  const positionRmse = Math.sqrt(
    mean(positionErrors.map((value) => value * value)),
  );
  const positionCorrelation = correlation(gaze, target);
  const fpsValues = rows
    .map((row) => row.trackingFps)
    .filter(isFiniteNumber);

  const usableRatio = rows.length / Math.max(1, trace.samples.length);
  const technicalReady =
    Number.isFinite(pursuitGain) &&
    Number.isFinite(positionRmse) &&
    Number.isFinite(positionCorrelation) &&
    rows.length >= 30 &&
    keptEyeVelocity.length >= 20;

  return {
    traceId: trace.id,
    patientId: trace.patientId,
    testId: 'smooth-pursuit',
    mode: trace.mode,
    batteryIndex: trace.batteryIndex,
    createdAt: Date.now(),
    durationMs: trace.activeDurationMs,
    totalSamples: trace.samples.length,
    usableSamples: rows.length,
    usableRatio,
    velocityPairCount: keptEyeVelocity.length,
    pursuitGain,
    meanAbsEyeVelocity: mean(keptEyeVelocity.map((value) => Math.abs(value))),
    meanAbsTargetVelocity: mean(
      keptTargetVelocity.map((value) => Math.abs(value)),
    ),
    positionRmse,
    positionDiagonalPercent: (positionRmse / Math.SQRT2) * 100,
    positionCorrelation,
    medianTrackingFps: fpsValues.length ? median(fpsValues) : null,
    qualityCounts: { ...trace.qualityCounts },
    technicalReady,
  };
}
