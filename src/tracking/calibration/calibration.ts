import type {
  CalibrationPoint,
  CalibrationPointResult,
  CalibrationSample,
} from '@/types/calibration';

export const SETTLE_MS = 700;
export const COLLECT_MS = 1100;
export const MIN_RAW_SAMPLES = 8;
export const MAX_ATTEMPTS_PER_POINT = 2;

export const HEAD_YAW_LIMIT = 10;
export const HEAD_PITCH_LIMIT = 10;
export const HEAD_ROLL_LIMIT = 10;
export const HEAD_SHIFT_LIMIT = 0.2;

export const CALIBRATION_POINTS: readonly CalibrationPoint[] = [
  { id: 'C', label: 'Giữa', x: 0.5, y: 0.5 },
  { id: 'TL', label: 'Trên trái', x: 0.13, y: 0.16 },
  { id: 'T', label: 'Trên giữa', x: 0.5, y: 0.16 },
  { id: 'TR', label: 'Trên phải', x: 0.87, y: 0.16 },
  { id: 'R', label: 'Giữa phải', x: 0.87, y: 0.5 },
  { id: 'BR', label: 'Dưới phải', x: 0.87, y: 0.84 },
  { id: 'B', label: 'Dưới giữa', x: 0.5, y: 0.84 },
  { id: 'BL', label: 'Dưới trái', x: 0.13, y: 0.84 },
  { id: 'L', label: 'Giữa trái', x: 0.13, y: 0.5 },
] as const;

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

function mad(values: number[], center: number) {
  return median(values.map((value) => Math.abs(value - center)));
}

export function aggregateCalibrationPoint(
  point: CalibrationPoint,
  samples: CalibrationSample[],
): CalibrationPointResult | null {
  if (samples.length < MIN_RAW_SAMPLES) {
    return null;
  }

  const horizontal = samples.map((sample) => sample.h);
  const vertical = samples.map((sample) => sample.v);
  const medH = median(horizontal);
  const medV = median(vertical);
  const madH = mad(horizontal, medH);
  const madV = mad(vertical, medV);

  const hLimit = Math.max(0.01, 3 * 1.4826 * madH);
  const vLimit = Math.max(0.006, 3 * 1.4826 * madV);

  const accepted = samples.filter(
    (sample) =>
      Math.abs(sample.h - medH) <= hLimit &&
      Math.abs(sample.v - medV) <= vLimit,
  );

  if (accepted.length < Math.max(5, Math.ceil(samples.length * 0.5))) {
    return null;
  }

  return {
    point,
    h: median(accepted.map((sample) => sample.h)),
    v: median(accepted.map((sample) => sample.v)),
    madH,
    madV,
    rawCount: samples.length,
    acceptedCount: accepted.length,
  };
}

export function calibrationSpans(results: CalibrationPointResult[]) {
  if (!results.length) {
    return { hSpan: 0, vSpan: 0 };
  }

  const h = results.map((result) => result.h);
  const v = results.map((result) => result.v);

  return {
    hSpan: Math.max(...h) - Math.min(...h),
    vSpan: Math.max(...v) - Math.min(...v),
  };
}
