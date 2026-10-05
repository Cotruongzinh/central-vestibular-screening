import { predictGaze } from '@/tracking/mapping/gaze-mapper';
import type { CalibrationSample } from '@/types/calibration';
import type { GazeMapperSpec } from '@/types/gaze-mapping';
import type {
  FixationValidationPoint,
  FixationValidationPointResult,
} from '@/types/fixation-validation';

export const VALIDATION_POINTS: FixationValidationPoint[] = [
  { id: 'V1', label: 'Trên trái', x: 0.27, y: 0.28 },
  { id: 'V2', label: 'Trên phải', x: 0.73, y: 0.28 },
  { id: 'V3', label: 'Giữa lệch phải', x: 0.62, y: 0.52 },
  { id: 'V4', label: 'Dưới trái', x: 0.27, y: 0.72 },
  { id: 'V5', label: 'Dưới phải', x: 0.73, y: 0.72 },
];

export const VALIDATION_SETTLE_MS = 500;
export const VALIDATION_COLLECT_MS = 1100;
export const VALIDATION_MIN_ACCEPTED_SAMPLES = 8;
export const VALIDATION_MAX_ATTEMPTS_PER_POINT = 2;

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function aggregateValidationPoint(
  point: FixationValidationPoint,
  samples: CalibrationSample[],
  rawCount: number,
  model: GazeMapperSpec,
): FixationValidationPointResult | null {
  if (samples.length < VALIDATION_MIN_ACCEPTED_SAMPLES) {
    return null;
  }

  const predictions = samples
    .map((sample) => predictGaze(model, sample.h, sample.v))
    .filter(
      (value) =>
        Number.isFinite(value.x) &&
        Number.isFinite(value.y),
    );

  if (predictions.length < VALIDATION_MIN_ACCEPTED_SAMPLES) {
    return null;
  }

  const predictedX = median(predictions.map((value) => value.x));
  const predictedY = median(predictions.map((value) => value.y));
  const error = Math.hypot(predictedX - point.x, predictedY - point.y);

  return {
    point,
    predictedX,
    predictedY,
    error,
    diagonalPercent: (error / Math.SQRT2) * 100,
    acceptedCount: predictions.length,
    rawCount: Math.max(rawCount, predictions.length),
  };
}

export function summarizeValidation(
  points: FixationValidationPointResult[],
  trackerFps: number | null,
) {
  const acceptedSamples = points.reduce(
    (sum, point) => sum + point.acceptedCount,
    0,
  );
  const rawSamples = points.reduce(
    (sum, point) => sum + point.rawCount,
    0,
  );

  const meanError =
    points.length > 0
      ? points.reduce((sum, point) => sum + point.error, 0) / points.length
      : Number.NaN;

  const maxError =
    points.length > 0
      ? Math.max(...points.map((point) => point.error))
      : Number.NaN;

  const meanDiagonalPercent =
    points.length > 0
      ? points.reduce((sum, point) => sum + point.diagonalPercent, 0) /
        points.length
      : Number.NaN;

  const acceptedRatio =
    rawSamples > 0 ? acceptedSamples / rawSamples : 0;

  const technicalQualityPass =
    points.length === VALIDATION_POINTS.length &&
    Number.isFinite(meanError) &&
    Number.isFinite(maxError) &&
    acceptedSamples >=
      VALIDATION_POINTS.length * VALIDATION_MIN_ACCEPTED_SAMPLES &&
    (trackerFps === null || trackerFps >= 20);

  return {
    acceptedSamples,
    rawSamples,
    acceptedRatio,
    meanError,
    maxError,
    meanDiagonalPercent,
    technicalQualityPass,
  };
}
