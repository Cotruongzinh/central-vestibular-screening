import {
  aggregateCalibrationPoint,
  calibrationSpans,
} from '@/tracking/calibration/calibration';
import {
  fitGazeMapper,
  predictGaze,
} from '@/tracking/mapping/gaze-mapper';
import type {
  CalibrationDataset,
  CalibrationPoint,
  CalibrationPointResult,
  CalibrationSample,
} from '@/types/calibration';
import type {
  GazeMapperScore,
  GazeMappingResult,
} from '@/types/gaze-mapping';
import type { FixationValidationResult } from '@/types/fixation-validation';

export const QUICK_BATTERY_CALIBRATION_POINTS: readonly CalibrationPoint[] = [
  { id: 'C', label: 'Giữa', x: 0.5, y: 0.5 },
  { id: 'TL', label: 'Trên trái', x: 0.2, y: 0.22 },
  { id: 'TR', label: 'Trên phải', x: 0.8, y: 0.22 },
  { id: 'BR', label: 'Dưới phải', x: 0.8, y: 0.78 },
  { id: 'BL', label: 'Dưới trái', x: 0.2, y: 0.78 },
] as const;

export const QUICK_BATTERY_VALIDATION_POINT: CalibrationPoint = {
  id: 'QV',
  label: 'Kiểm tra giữa-trên',
  x: 0.5,
  y: 0.3,
};

export const QUICK_SETTLE_MS = 450;
export const QUICK_COLLECT_MS = 750;
export const QUICK_MAX_ATTEMPTS = 2;

function evaluateRidgeLoo(rows: CalibrationPointResult[]): GazeMapperScore | null {
  if (rows.length < 4) {
    return null;
  }

  const errors: number[] = [];

  for (let heldOut = 0; heldOut < rows.length; heldOut += 1) {
    const train = rows.filter((_, index) => index !== heldOut);
    const model = fitGazeMapper('RIDGE_LINEAR', train);

    if (!model) {
      return null;
    }

    const test = rows[heldOut];
    const predicted = predictGaze(model, test.h, test.v);
    const error = Math.hypot(
      predicted.x - test.point.x,
      predicted.y - test.point.y,
    );

    if (!Number.isFinite(error)) {
      return null;
    }

    errors.push(error);
  }

  if (!errors.length) {
    return null;
  }

  const meanError = errors.reduce((sum, value) => sum + value, 0) / errors.length;

  return {
    kind: 'RIDGE_LINEAR',
    label: 'Ridge Linear · quick 5-point',
    meanError,
    diagonalPercent: (meanError / Math.SQRT2) * 100,
    maxError: Math.max(...errors),
  };
}

export function buildQuickBatteryMapping(
  dataset: CalibrationDataset,
): GazeMappingResult | null {
  if (dataset.points.length !== QUICK_BATTERY_CALIBRATION_POINTS.length) {
    return null;
  }

  const score = evaluateRidgeLoo(dataset.points);
  const model = fitGazeMapper('RIDGE_LINEAR', dataset.points);

  if (!score || !model) {
    return null;
  }

  return {
    id: `MAP-${dataset.id}-RIDGE_LINEAR-03L`,
    calibrationId: dataset.id,
    patientId: dataset.patientId,
    testId: dataset.testId,
    mode: dataset.mode,
    batteryIndex: dataset.batteryIndex,
    createdAt: Date.now(),
    bestKind: 'RIDGE_LINEAR',
    bestLabel: 'Ridge Linear · quick 5-point',
    scores: [score],
    model,
  };
}

export function buildQuickBatteryValidationDraft(input: {
  dataset: CalibrationDataset;
  mapping: GazeMappingResult;
  samples: CalibrationSample[];
  trackerFps: number | null;
}): Omit<FixationValidationResult, 'id'> | null {
  const aggregated = aggregateCalibrationPoint(
    QUICK_BATTERY_VALIDATION_POINT,
    input.samples,
  );

  if (!aggregated) {
    return null;
  }

  const predicted = predictGaze(input.mapping.model, aggregated.h, aggregated.v);
  const error = Math.hypot(
    predicted.x - QUICK_BATTERY_VALIDATION_POINT.x,
    predicted.y - QUICK_BATTERY_VALIDATION_POINT.y,
  );

  if (!Number.isFinite(error)) {
    return null;
  }

  return {
    patientId: input.dataset.patientId,
    testId: input.dataset.testId,
    mode: input.dataset.mode,
    batteryIndex: input.dataset.batteryIndex,
    calibrationId: input.dataset.id,
    mappingId: input.mapping.id,
    createdAt: Date.now(),
    points: [
      {
        point: QUICK_BATTERY_VALIDATION_POINT,
        predictedX: predicted.x,
        predictedY: predicted.y,
        error,
        diagonalPercent: (error / Math.SQRT2) * 100,
        acceptedCount: aggregated.acceptedCount,
        rawCount: aggregated.rawCount,
      },
    ],
    meanError: error,
    maxError: error,
    meanDiagonalPercent: (error / Math.SQRT2) * 100,
    acceptedSamples: aggregated.acceptedCount,
    rawSamples: aggregated.rawCount,
    acceptedRatio:
      aggregated.rawCount > 0
        ? aggregated.acceptedCount / aggregated.rawCount
        : 0,
    trackerFps: input.trackerFps,
    technicalQualityPass: true,
  };
}

export function quickCalibrationSpans(results: CalibrationPointResult[]) {
  return calibrationSpans(results);
}
