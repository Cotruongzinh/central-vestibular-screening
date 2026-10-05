import { getStimulusFrame } from '@/tracking/runtime/stimulus-runtime';
import type { EyeTraceResult } from '@/types/test-runtime';
import type {
  GenHoldDirection,
  GenHoldMetric,
  GazeEvokedMetricDraft,
  NystagmusMetricDraft,
  OknDirectionMetric,
  OknMetricDraft,
} from '@/types/nystagmus-metrics';

type GenRow = {
  t: number;
  gazeX: number;
  gazeY: number;
  expectedX: number;
  expectedY: number;
  trackingFps: number | null;
};

type OknRow = {
  t: number;
  gazeX: number;
  trackingFps: number | null;
};

type VelocitySummary = {
  slowPhaseVelocity: number;
  absoluteSlowPhaseVelocity: number;
  quickPhaseCandidates: number;
  velocityPairs: number;
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

function medianAbsoluteDeviation(values: number[], center: number) {
  if (!values.length || !Number.isFinite(center)) {
    return Number.NaN;
  }

  return median(values.map((value) => Math.abs(value - center)));
}

function toVelocityPairs(rows: Array<{ t: number; value: number }>) {
  const velocities: number[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    const dtSeconds = (current.t - previous.t) / 1000;

    if (dtSeconds < 0.02 || dtSeconds > 0.25) {
      continue;
    }

    const velocity = (current.value - previous.value) / dtSeconds;

    if (Number.isFinite(velocity)) {
      velocities.push(velocity);
    }
  }

  return velocities;
}

function robustSlowPhaseVelocity(velocities: number[]): VelocitySummary | null {
  if (velocities.length < 4) {
    return null;
  }

  const center = median(velocities);
  const mad = medianAbsoluteDeviation(velocities, center);
  const robustSigma = Number.isFinite(mad) ? mad * 1.4826 : 0;
  const technicalLimit = Math.max(0.08, robustSigma * 4);
  const slowCandidates = velocities.filter(
    (value) => Math.abs(value - center) <= technicalLimit,
  );

  if (slowCandidates.length < 3) {
    return null;
  }

  const slowPhaseVelocity = median(slowCandidates);

  return {
    slowPhaseVelocity,
    absoluteSlowPhaseVelocity: Math.abs(slowPhaseVelocity),
    quickPhaseCandidates: velocities.length - slowCandidates.length,
    velocityPairs: velocities.length,
  };
}

function medianTrackingFps(values: Array<number | null>) {
  const finite = values.filter(isFiniteNumber);
  return finite.length ? median(finite) : null;
}

function baseDraft(trace: EyeTraceResult, usableSamples: number) {
  return {
    traceId: trace.id,
    patientId: trace.patientId,
    mode: trace.mode,
    batteryIndex: trace.batteryIndex,
    createdAt: Date.now(),
    durationMs: trace.activeDurationMs,
    totalSamples: trace.samples.length,
    usableSamples,
    usableRatio: trace.samples.length > 0 ? usableSamples / trace.samples.length : 0,
    qualityCounts: { ...trace.qualityCounts },
  };
}

function getGenDirection(expectedX: number, expectedY: number): GenHoldDirection | null {
  const dx = expectedX - 0.5;
  const dy = expectedY - 0.5;

  if (Math.abs(dx) < 0.08 && Math.abs(dy) < 0.08) {
    return null;
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'RIGHT' : 'LEFT';
  }

  return dy >= 0 ? 'DOWN' : 'UP';
}

function computeGazeEvokedMetrics(trace: EyeTraceResult): GazeEvokedMetricDraft | null {
  const rows = trace.samples
    .filter(
      (sample) =>
        sample.quality !== 'red' &&
        isFiniteNumber(sample.elapsedMs) &&
        isFiniteNumber(sample.gazeX) &&
        isFiniteNumber(sample.gazeY) &&
        isFiniteNumber(sample.expectedX) &&
        isFiniteNumber(sample.expectedY),
    )
    .map<GenRow>((sample) => ({
      t: sample.elapsedMs,
      gazeX: sample.gazeX as number,
      gazeY: sample.gazeY as number,
      expectedX: sample.expectedX as number,
      expectedY: sample.expectedY as number,
      trackingFps: isFiniteNumber(sample.trackingFps) ? sample.trackingFps : null,
    }))
    .sort((a, b) => a.t - b.t);

  if (rows.length < 30) {
    return null;
  }

  const blockStarts = [0];

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];

    if (
      Math.abs(current.expectedX - previous.expectedX) > 0.04 ||
      Math.abs(current.expectedY - previous.expectedY) > 0.04
    ) {
      blockStarts.push(index);
    }
  }

  const holds: GenHoldMetric[] = [];
  let totalQuickCandidates = 0;
  let analyzedDurationMs = 0;

  blockStarts.forEach((startIndex, blockIndex) => {
    const endIndex =
      blockIndex + 1 < blockStarts.length
        ? blockStarts[blockIndex + 1] - 1
        : rows.length - 1;
    const first = rows[startIndex];
    const last = rows[endIndex];
    const direction = getGenDirection(first.expectedX, first.expectedY);

    if (!direction || last.t - first.t < 1500) {
      return;
    }

    const windowStart = first.t + 650;
    const windowEnd = last.t - 180;
    const window = rows.filter(
      (row) => row.t >= windowStart && row.t <= windowEnd,
    );

    if (window.length < 8) {
      return;
    }

    const useY = direction === 'UP' || direction === 'DOWN';
    const axisRows = window.map((row) => ({
      t: row.t,
      value: useY ? row.gazeY : row.gazeX,
    }));
    const velocities = toVelocityPairs(axisRows);
    const summary = robustSlowPhaseVelocity(velocities);

    if (!summary) {
      return;
    }

    const positionErrors = window.map((row) =>
      Math.hypot(row.gazeX - row.expectedX, row.gazeY - row.expectedY),
    );

    totalQuickCandidates += summary.quickPhaseCandidates;
    analyzedDurationMs += Math.max(0, windowEnd - windowStart);

    holds.push({
      holdIndex: holds.length + 1,
      direction,
      startMs: first.t,
      endMs: last.t,
      expectedX: first.expectedX,
      expectedY: first.expectedY,
      slowPhaseVelocity: summary.slowPhaseVelocity,
      absoluteSlowPhaseVelocity: summary.absoluteSlowPhaseVelocity,
      quickPhaseCandidates: summary.quickPhaseCandidates,
      velocityPairs: summary.velocityPairs,
      meanPositionError: mean(positionErrors),
    });
  });

  if (holds.length < 4) {
    return null;
  }

  const meanAbsSpv = mean(holds.map((hold) => hold.absoluteSlowPhaseVelocity));
  const maxAbsSpv = Math.max(
    ...holds.map((hold) => hold.absoluteSlowPhaseVelocity),
  );
  const meanPositionError = mean(holds.map((hold) => hold.meanPositionError));
  const quickRate =
    analyzedDurationMs > 0
      ? totalQuickCandidates / (analyzedDurationMs / 60000)
      : 0;

  const common = baseDraft(trace, rows.length);

  return {
    ...common,
    testId: 'gaze-evoked-nystagmus',
    kind: 'gaze-evoked',
    medianTrackingFps: medianTrackingFps(rows.map((row) => row.trackingFps)),
    eccentricHoldsAnalyzed: holds.length,
    meanAbsoluteSlowPhaseVelocity: meanAbsSpv,
    maxAbsoluteSlowPhaseVelocity: maxAbsSpv,
    quickPhaseCandidateRatePerMinute: quickRate,
    meanPositionError,
    holds,
    technicalReady:
      Number.isFinite(meanAbsSpv) &&
      Number.isFinite(maxAbsSpv) &&
      holds.length >= 4,
  };
}

function computeOknDirectionMetric(
  rows: OknRow[],
  direction: -1 | 1,
): OknDirectionMetric | null {
  const directionName = direction === 1 ? 'RIGHTWARD' : 'LEFTWARD';
  const blockMetrics: Array<{
    magnitude: number;
    agreement: number;
    quick: number;
    pairs: number;
  }> = [];

  const blockMs = 5000;
  const lastRow = rows.length ? rows[rows.length - 1] : undefined;
  const maxBlock = Math.floor((lastRow?.t ?? 0) / blockMs);

  for (let block = 0; block <= maxBlock; block += 1) {
    const midpoint = block * blockMs + blockMs / 2;
    const frame = getStimulusFrame('okn', midpoint);

    if (frame.oknDirection !== direction) {
      continue;
    }

    const startMs = block * blockMs + 650;
    const endMs = (block + 1) * blockMs - 180;
    const blockRows = rows.filter(
      (row) => row.t >= startMs && row.t <= endMs,
    );

    if (blockRows.length < 8) {
      continue;
    }

    const rawVelocities = toVelocityPairs(
      blockRows.map((row) => ({ t: row.t, value: row.gazeX })),
    );
    const directedVelocities = rawVelocities.map((value) => value * direction);

    if (directedVelocities.length < 5) {
      continue;
    }

    const center = median(directedVelocities);
    const mad = medianAbsoluteDeviation(directedVelocities, center);
    const robustSigma = Number.isFinite(mad) ? mad * 1.4826 : 0;
    const technicalLimit = Math.max(0.12, robustSigma * 4);
    const slowCandidates = directedVelocities.filter(
      (value) => Math.abs(value - center) <= technicalLimit,
    );

    if (slowCandidates.length < 4) {
      continue;
    }

    const signedSpv = median(slowCandidates);
    const agreement =
      directedVelocities.filter((value) => value > 0).length /
      directedVelocities.length;
    const quickThreshold = Math.max(0.12, Math.abs(center) + robustSigma * 2.5);
    const quickCandidates = directedVelocities.filter(
      (value) => value < -quickThreshold,
    ).length;

    blockMetrics.push({
      magnitude: Math.abs(signedSpv),
      agreement,
      quick: quickCandidates,
      pairs: directedVelocities.length,
    });
  }

  if (!blockMetrics.length) {
    return null;
  }

  return {
    direction: directionName,
    blockCount: blockMetrics.length,
    slowPhaseVelocityMagnitude: median(
      blockMetrics.map((metric) => metric.magnitude),
    ),
    directionAgreementRatio: mean(
      blockMetrics.map((metric) => metric.agreement),
    ),
    quickPhaseCandidates: blockMetrics.reduce(
      (sum, metric) => sum + metric.quick,
      0,
    ),
    velocityPairs: blockMetrics.reduce(
      (sum, metric) => sum + metric.pairs,
      0,
    ),
  };
}

function computeOknMetrics(trace: EyeTraceResult): OknMetricDraft | null {
  const rows = trace.samples
    .filter(
      (sample) =>
        sample.quality !== 'red' &&
        isFiniteNumber(sample.elapsedMs) &&
        isFiniteNumber(sample.gazeX),
    )
    .map<OknRow>((sample) => ({
      t: sample.elapsedMs,
      gazeX: sample.gazeX as number,
      trackingFps: isFiniteNumber(sample.trackingFps) ? sample.trackingFps : null,
    }))
    .sort((a, b) => a.t - b.t);

  if (rows.length < 40) {
    return null;
  }

  const rightward = computeOknDirectionMetric(rows, 1);
  const leftward = computeOknDirectionMetric(rows, -1);

  if (!rightward || !leftward) {
    return null;
  }

  const denominator =
    rightward.slowPhaseVelocityMagnitude + leftward.slowPhaseVelocityMagnitude;
  const asymmetry =
    denominator > 0
      ? Math.abs(
          rightward.slowPhaseVelocityMagnitude -
            leftward.slowPhaseVelocityMagnitude,
        ) / denominator
      : 0;

  const totalQuick =
    rightward.quickPhaseCandidates + leftward.quickPhaseCandidates;
  const analyzedBlocks = rightward.blockCount + leftward.blockCount;
  const analyzedDurationMinutes = (analyzedBlocks * 4170) / 60000;
  const quickRate =
    analyzedDurationMinutes > 0 ? totalQuick / analyzedDurationMinutes : 0;
  const common = baseDraft(trace, rows.length);

  return {
    ...common,
    testId: 'okn',
    kind: 'okn',
    medianTrackingFps: medianTrackingFps(rows.map((row) => row.trackingFps)),
    rightward,
    leftward,
    directionalAsymmetryRatio: asymmetry,
    combinedQuickPhaseCandidateRatePerMinute: quickRate,
    technicalReady:
      Number.isFinite(rightward.slowPhaseVelocityMagnitude) &&
      Number.isFinite(leftward.slowPhaseVelocityMagnitude) &&
      Number.isFinite(asymmetry) &&
      rightward.velocityPairs >= 10 &&
      leftward.velocityPairs >= 10,
  };
}

export function computeNystagmusMetrics(
  trace: EyeTraceResult,
): NystagmusMetricDraft | null {
  if (!trace.completed) {
    return null;
  }

  if (trace.testId === 'gaze-evoked-nystagmus') {
    return computeGazeEvokedMetrics(trace);
  }

  if (trace.testId === 'okn') {
    return computeOknMetrics(trace);
  }

  return null;
}
