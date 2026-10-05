import type { CalibrationDataset, CalibrationPointResult } from '@/types/calibration';
import type {
  GazeMapperKind,
  GazeMapperScore,
  GazeMapperSpec,
  GazeMappingResult,
  GazePoint,
  KnnMapperSpec,
  RegressionMapperSpec,
} from '@/types/gaze-mapping';

function safeStd(values: number[]) {
  if (values.length < 2) {
    return 1;
  }

  const meanValue = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) /
    values.length;
  const result = Math.sqrt(variance);

  return result < 1e-6 ? 1 : result;
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivot = column;

    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }

    if (Math.abs(augmented[pivot][column]) < 1e-10) {
      return null;
    }

    if (pivot !== column) {
      const temp = augmented[column];
      augmented[column] = augmented[pivot];
      augmented[pivot] = temp;
    }

    const divisor = augmented[column][column];

    for (let j = column; j <= n; j += 1) {
      augmented[column][j] /= divisor;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];

      for (let j = column; j <= n; j += 1) {
        augmented[row][j] -= factor * augmented[column][j];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

function createBasis(kind: GazeMapperKind, h: number, v: number) {
  if (kind === 'RIDGE_LINEAR') {
    return [1, h, v];
  }

  return [1, h, v, h * h, h * v, v * v];
}

function fitRegressionMapper(
  kind: 'RIDGE_LINEAR' | 'POLYNOMIAL_2',
  rows: CalibrationPointResult[],
): RegressionMapperSpec | null {
  const minimumRows = kind === 'RIDGE_LINEAR' ? 3 : 6;

  if (rows.length < minimumRows) {
    return null;
  }

  const hValues = rows.map((row) => row.h);
  const vValues = rows.map((row) => row.v);
  const meanH = hValues.reduce((sum, value) => sum + value, 0) / hValues.length;
  const meanV = vValues.reduce((sum, value) => sum + value, 0) / vValues.length;
  const stdH = safeStd(hValues);
  const stdV = safeStd(vValues);

  const xRows = rows.map((row) =>
    createBasis(kind, (row.h - meanH) / stdH, (row.v - meanV) / stdV),
  );

  const featureCount = xRows[0].length;
  const xtx = Array.from({ length: featureCount }, () =>
    Array(featureCount).fill(0),
  ) as number[][];
  const xtTargetX = Array(featureCount).fill(0) as number[];
  const xtTargetY = Array(featureCount).fill(0) as number[];

  for (let rowIndex = 0; rowIndex < xRows.length; rowIndex += 1) {
    const basis = xRows[rowIndex];
    const targetX = rows[rowIndex].point.x;
    const targetY = rows[rowIndex].point.y;

    for (let i = 0; i < featureCount; i += 1) {
      xtTargetX[i] += basis[i] * targetX;
      xtTargetY[i] += basis[i] * targetY;

      for (let j = 0; j < featureCount; j += 1) {
        xtx[i][j] += basis[i] * basis[j];
      }
    }
  }

  const lambda = kind === 'RIDGE_LINEAR' ? 0.02 : 0.08;

  for (let i = 1; i < featureCount; i += 1) {
    xtx[i][i] += lambda;
  }

  const weightsX = solveLinearSystem(
    xtx.map((row) => [...row]),
    [...xtTargetX],
  );
  const weightsY = solveLinearSystem(
    xtx.map((row) => [...row]),
    [...xtTargetY],
  );

  if (!weightsX || !weightsY) {
    return null;
  }

  return {
    kind,
    label: kind === 'RIDGE_LINEAR' ? 'Ridge Linear' : 'Polynomial bậc 2',
    meanH,
    meanV,
    stdH,
    stdV,
    weightsX,
    weightsY,
  };
}

function fitKnnMapper(rows: CalibrationPointResult[]): KnnMapperSpec | null {
  if (rows.length < 3) {
    return null;
  }

  const hValues = rows.map((row) => row.h);
  const vValues = rows.map((row) => row.v);
  const meanH = hValues.reduce((sum, value) => sum + value, 0) / hValues.length;
  const meanV = vValues.reduce((sum, value) => sum + value, 0) / vValues.length;
  const stdH = safeStd(hValues);
  const stdV = safeStd(vValues);

  return {
    kind: 'KNN_3',
    label: 'KNN (k=3)',
    meanH,
    meanV,
    stdH,
    stdV,
    train: rows.map((row) => ({
      h: (row.h - meanH) / stdH,
      v: (row.v - meanV) / stdV,
      x: row.point.x,
      y: row.point.y,
    })),
  };
}

export function fitGazeMapper(
  kind: GazeMapperKind,
  rows: CalibrationPointResult[],
): GazeMapperSpec | null {
  if (kind === 'RIDGE_LINEAR' || kind === 'POLYNOMIAL_2') {
    return fitRegressionMapper(kind, rows);
  }

  return fitKnnMapper(rows);
}

export function predictGaze(model: GazeMapperSpec, h: number, v: number): GazePoint {
  const normalizedH = (h - model.meanH) / model.stdH;
  const normalizedV = (v - model.meanV) / model.stdV;

  if (model.kind === 'KNN_3') {
    const distances = model.train
      .map((point) => ({
        ...point,
        distance: Math.hypot(normalizedH - point.h, normalizedV - point.v),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (distances[0]?.distance < 1e-6) {
      return { x: distances[0].x, y: distances[0].y };
    }

    const neighbors = distances.slice(0, Math.min(3, distances.length));
    let sumWeight = 0;
    let x = 0;
    let y = 0;

    for (const neighbor of neighbors) {
      const weight = 1 / Math.max(1e-4, neighbor.distance);
      sumWeight += weight;
      x += neighbor.x * weight;
      y += neighbor.y * weight;
    }

    return {
      x: sumWeight > 0 ? x / sumWeight : 0.5,
      y: sumWeight > 0 ? y / sumWeight : 0.5,
    };
  }

  const basis = createBasis(model.kind, normalizedH, normalizedV);
  let x = 0;
  let y = 0;

  for (let i = 0; i < basis.length; i += 1) {
    x += basis[i] * model.weightsX[i];
    y += basis[i] * model.weightsY[i];
  }

  return { x, y };
}

export function compareGazeMappers(rows: CalibrationPointResult[]) {
  if (rows.length !== 9) {
    return null;
  }

  const candidates: Array<{ kind: GazeMapperKind; label: string }> = [
    { kind: 'RIDGE_LINEAR', label: 'Ridge Linear' },
    { kind: 'POLYNOMIAL_2', label: 'Polynomial bậc 2' },
    { kind: 'KNN_3', label: 'KNN (k=3)' },
  ];

  const scores: GazeMapperScore[] = [];

  for (const candidate of candidates) {
    const errors: number[] = [];
    let valid = true;

    for (let heldOut = 0; heldOut < rows.length; heldOut += 1) {
      const train = rows.filter((_, index) => index !== heldOut);
      const model = fitGazeMapper(candidate.kind, train);

      if (!model) {
        valid = false;
        break;
      }

      const test = rows[heldOut];
      const prediction = predictGaze(model, test.h, test.v);
      const error = Math.hypot(
        prediction.x - test.point.x,
        prediction.y - test.point.y,
      );

      if (!Number.isFinite(error)) {
        valid = false;
        break;
      }

      errors.push(error);
    }

    if (!valid || !errors.length) {
      continue;
    }

    const meanError = errors.reduce((sum, value) => sum + value, 0) / errors.length;

    scores.push({
      kind: candidate.kind,
      label: candidate.label,
      meanError,
      diagonalPercent: (meanError / Math.SQRT2) * 100,
      maxError: Math.max(...errors),
    });
  }

  if (!scores.length) {
    return null;
  }

  scores.sort((a, b) => a.meanError - b.meanError);
  const best = scores[0];
  const model = fitGazeMapper(best.kind, rows);

  if (!model) {
    return null;
  }

  return {
    bestKind: best.kind,
    bestLabel: best.label,
    scores,
    model,
  };
}

export function buildGazeMappingResult(
  dataset: CalibrationDataset,
): GazeMappingResult | null {
  const comparison = compareGazeMappers(dataset.points);

  if (!comparison) {
    return null;
  }

  return {
    id: `MAP-${dataset.id}-${comparison.bestKind}`,
    calibrationId: dataset.id,
    patientId: dataset.patientId,
    testId: dataset.testId,
    mode: dataset.mode,
    batteryIndex: dataset.batteryIndex,
    createdAt: Date.now(),
    bestKind: comparison.bestKind,
    bestLabel: comparison.bestLabel,
    scores: comparison.scores,
    model: comparison.model,
  };
}
