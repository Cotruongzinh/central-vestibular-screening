import type { EyeTraceResult, EyeTraceSample } from '@/types/test-runtime';
import type {
  SaccadeMetricDraft,
  SaccadeMetricTestId,
  SaccadeTrialMetric,
} from '@/types/saccade-metrics';

type AxisRow = {
  t: number;
  gaze: number;
  expected: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isSaccadeMetricTestId(value: EyeTraceResult['testId']): value is SaccadeMetricTestId {
  return (
    value === 'horizontal-saccades' ||
    value === 'vertical-saccades' ||
    value === 'anti-saccade'
  );
}

function toAxisRows(trace: EyeTraceResult) {
  const useY = trace.testId === 'vertical-saccades';

  return trace.samples
    .filter((sample) => {
      if (sample.quality === 'red' || !isFiniteNumber(sample.elapsedMs)) {
        return false;
      }

      const gaze = useY ? sample.gazeY : sample.gazeX;
      const expected = useY ? sample.expectedY : sample.expectedX;

      return isFiniteNumber(gaze) && isFiniteNumber(expected);
    })
    .map<AxisRow>((sample) => ({
      t: sample.elapsedMs,
      gaze: (useY ? sample.gazeY : sample.gazeX) as number,
      expected: (useY ? sample.expectedY : sample.expectedX) as number,
      trackingFps: isFiniteNumber(sample.trackingFps)
        ? sample.trackingFps
        : null,
    }))
    .sort((a, b) => a.t - b.t);
}

function rowsBetween(rows: AxisRow[], startMs: number, endMs: number) {
  return rows.filter((row) => row.t >= startMs && row.t <= endMs);
}

function getBaseline(rows: AxisRow[], transitionIndex: number) {
  const transition = rows[transitionIndex];
  const window = rowsBetween(rows, transition.t - 350, transition.t - 40);

  if (window.length >= 2) {
    return median(window.map((row) => row.gaze));
  }

  const fallback = rows.slice(Math.max(0, transitionIndex - 4), transitionIndex);
  return fallback.length ? median(fallback.map((row) => row.gaze)) : Number.NaN;
}

function computePeakVelocity(rows: AxisRow[], startMs: number, endMs: number) {
  const window = rowsBetween(rows, startMs, endMs);
  let peak = 0;

  for (let index = 1; index < window.length - 1; index += 1) {
    const previous = window[index - 1];
    const next = window[index + 1];
    const dtSeconds = (next.t - previous.t) / 1000;

    if (dtSeconds < 0.03 || dtSeconds > 0.35) {
      continue;
    }

    const velocity = Math.abs((next.gaze - previous.gaze) / dtSeconds);

    if (Number.isFinite(velocity)) {
      peak = Math.max(peak, velocity);
    }
  }

  return peak > 0 ? peak : Number.NaN;
}

function analyzeTransition(
  rows: AxisRow[],
  transitionIndex: number,
  nextTransitionTimeMs: number | undefined,
  ordinal: number,
): SaccadeTrialMetric | null {
  const transition = rows[transitionIndex];
  const previous = rows[transitionIndex - 1];
  const targetAmplitude = transition.expected - previous.expected;
  const absAmplitude = Math.abs(targetAmplitude);

  if (absAmplitude < 0.15) {
    return null;
  }

  const baseline = getBaseline(rows, transitionIndex);

  if (!Number.isFinite(baseline)) {
    return null;
  }

  const targetDirection = Math.sign(targetAmplitude);
  const responseThreshold = Math.max(0.025, Math.min(0.08, absAmplitude * 0.12));
  const responseWindowEnd = Math.min(
    transition.t + 900,
    nextTransitionTimeMs ? nextTransitionTimeMs - 60 : transition.t + 900,
  );

  const responseRows = rowsBetween(rows, transition.t + 25, responseWindowEnd);
  const firstResponse = responseRows.find(
    (row) => Math.abs(row.gaze - baseline) >= responseThreshold,
  );

  if (!firstResponse) {
    return null;
  }

  const responseDirection = Math.sign(firstResponse.gaze - baseline);
  const firstResponseDirectionCorrect = responseDirection === targetDirection;
  const firstResponseLatencyMs = firstResponse.t - transition.t;

  const peakVelocity = computePeakVelocity(
    rows,
    transition.t,
    Math.min(
      transition.t + 900,
      nextTransitionTimeMs ? nextTransitionTimeMs - 40 : transition.t + 900,
    ),
  );

  if (!Number.isFinite(peakVelocity)) {
    return null;
  }

  const endpointStart = transition.t + 500;
  const endpointEnd = Math.min(
    transition.t + 1100,
    nextTransitionTimeMs ? nextTransitionTimeMs - 80 : transition.t + 1100,
  );
  const endpointRows = rowsBetween(rows, endpointStart, endpointEnd);

  if (!endpointRows.length) {
    return null;
  }

  const endpoint = median(endpointRows.map((row) => row.gaze));
  const endpointError = Math.abs(endpoint - transition.expected);
  const amplitudeRatio = Math.abs(endpoint - baseline) / absAmplitude;
  const endpointAccuracy = clamp(1 - endpointError / absAmplitude, 0, 1);

  const movementRows = rowsBetween(
    rows,
    transition.t,
    Math.min(
      transition.t + 1000,
      nextTransitionTimeMs ? nextTransitionTimeMs - 50 : transition.t + 1000,
    ),
  );
  const directedPeakDisplacement = movementRows.reduce((peak, row) => {
    const directed = (row.gaze - baseline) * targetDirection;
    return Math.max(peak, directed);
  }, 0);
  const overshootRatio = Math.max(0, directedPeakDisplacement / absAmplitude - 1);

  return {
    transitionIndex: ordinal,
    transitionTimeMs: transition.t,
    targetAmplitude: absAmplitude,
    firstResponseLatencyMs,
    firstResponseDirectionCorrect,
    peakVelocity,
    endpointError,
    endpointAccuracy,
    amplitudeRatio,
    overshootRatio,
  };
}

export function computeSaccadeMetrics(
  trace: EyeTraceResult,
): SaccadeMetricDraft | null {
  if (!trace.completed || !isSaccadeMetricTestId(trace.testId)) {
    return null;
  }

  const rows = toAxisRows(trace);

  if (rows.length < 20) {
    return null;
  }

  const transitionIndexes: number[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const changed = Math.abs(rows[index].expected - rows[index - 1].expected) >= 0.15;
    const antiCueTransition =
      trace.testId !== 'anti-saccade' || Math.abs(rows[index].expected - 0.5) >= 0.15;

    if (changed && antiCueTransition) {
      transitionIndexes.push(index);
    }
  }

  const trials: SaccadeTrialMetric[] = [];

  transitionIndexes.forEach((rowIndex, index) => {
    const nextRowIndex = transitionIndexes[index + 1];
    const trial = analyzeTransition(
      rows,
      rowIndex,
      nextRowIndex !== undefined ? rows[nextRowIndex].t : undefined,
      index + 1,
    );

    if (trial) {
      trials.push(trial);
    }
  });

  if (trials.length < 3) {
    return null;
  }

  const latencies = trials.map((trial) => trial.firstResponseLatencyMs);
  const peakVelocities = trials.map((trial) => trial.peakVelocity);
  const endpointErrors = trials.map((trial) => trial.endpointError);
  const endpointAccuracies = trials.map((trial) => trial.endpointAccuracy);
  const amplitudeRatios = trials.map((trial) => trial.amplitudeRatio);
  const overshoots = trials.map((trial) => trial.overshootRatio);
  const directionCorrectTrials = trials.filter(
    (trial) => trial.firstResponseDirectionCorrect,
  ).length;
  const fpsValues = rows
    .map((row) => row.trackingFps)
    .filter(isFiniteNumber);

  const usableRatio = rows.length / Math.max(1, trace.samples.length);
  const meanLatencyMs = mean(latencies);
  const medianLatencyMs = median(latencies);
  const meanPeakVelocity = mean(peakVelocities);
  const medianPeakVelocity = median(peakVelocities);
  const meanEndpointError = mean(endpointErrors);
  const meanEndpointAccuracy = mean(endpointAccuracies);
  const meanAmplitudeRatio = mean(amplitudeRatios);
  const meanOvershootRatio = mean(overshoots);
  const directionCorrectRatio = directionCorrectTrials / trials.length;

  const technicalReady =
    transitionIndexes.length >= 4 &&
    trials.length >= 3 &&
    Number.isFinite(meanLatencyMs) &&
    Number.isFinite(meanPeakVelocity) &&
    Number.isFinite(meanEndpointError) &&
    Number.isFinite(meanEndpointAccuracy) &&
    Number.isFinite(directionCorrectRatio);

  return {
    traceId: trace.id,
    patientId: trace.patientId,
    testId: trace.testId,
    mode: trace.mode,
    batteryIndex: trace.batteryIndex,
    createdAt: Date.now(),
    durationMs: trace.activeDurationMs,
    totalSamples: trace.samples.length,
    usableSamples: rows.length,
    usableRatio,
    totalTransitions: transitionIndexes.length,
    analyzedTransitions: trials.length,
    meanLatencyMs,
    medianLatencyMs,
    meanPeakVelocity,
    medianPeakVelocity,
    meanEndpointError,
    meanEndpointAccuracy,
    meanAmplitudeRatio,
    meanOvershootRatio,
    directionCorrectTrials,
    directionCorrectRatio,
    medianTrackingFps: fpsValues.length ? median(fpsValues) : null,
    qualityCounts: { ...trace.qualityCounts },
    trials,
    technicalReady,
  };
}
