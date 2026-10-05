import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { decryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import type {
  LongitudinalComparisonPoint,
  LongitudinalComparisonSeries,
} from '@/types/longitudinal-comparison';
import type { ClinicalTestId } from '@/types/test-administration';
import type { UnifiedTechnicalResult } from '@/types/test-session';

type ComparisonRow = {
  id: string;
  test_type: string;
  completed_at: number | null;
  started_at: number | null;
  created_at: number;
  result_payload: string | null;
};

type ComparableResult = {
  value: number;
  unit: LongitudinalComparisonSeries['unit'];
};

let comparisonDatabaseReady: Promise<void> | null = null;

async function getComparisonDatabase() {
  if (!comparisonDatabaseReady) {
    comparisonDatabaseReady = initializeDatabase().then(() => undefined);
  }

  await comparisonDatabaseReady;
  return getDatabase();
}

function parseHeadlineNumber(value: string): number | null {
  const normalized = value.replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function comparableResult(
  result: UnifiedTechnicalResult,
): ComparableResult | null {
  const value = parseHeadlineNumber(result.headlineValue);
  if (value === null) {
    return null;
  }

  switch (result.metricKind) {
    case 'smooth-pursuit':
      return { value, unit: 'ratio' };
    case 'saccade':
      return { value, unit: 'ms' };
    case 'gaze-evoked':
      return { value, unit: '/s' };
    case 'okn':
      return { value, unit: '%' };
    default:
      return null;
  }
}

function completedAtForRow(row: ComparisonRow): number {
  return row.completed_at ?? row.started_at ?? row.created_at;
}

export async function listPatientLongitudinalSeries(
  clinicianUid: string,
  patientId: string,
): Promise<LongitudinalComparisonSeries[]> {
  const db = await getComparisonDatabase();
  const rows = await db.getAllAsync<ComparisonRow>(
    `
      SELECT
        s.id,
        s.test_type,
        s.completed_at,
        s.started_at,
        s.created_at,
        r.encrypted_payload AS result_payload
      FROM test_sessions s
      INNER JOIN test_results r ON r.session_id = s.id
      WHERE s.patient_id = ?
        AND s.clinician_uid = ?
        AND s.status = 'completed'
      ORDER BY COALESCE(s.completed_at, s.started_at, s.created_at) ASC
    `,
    patientId,
    clinicianUid,
  );

  const grouped = new Map<ClinicalTestId, {
    metricLabel: string;
    unit: LongitudinalComparisonSeries['unit'];
    points: LongitudinalComparisonPoint[];
  }>();

  for (const row of rows) {
    if (!row.result_payload || !isClinicalTestId(row.test_type)) {
      continue;
    }

    const result = await decryptJson<UnifiedTechnicalResult>(row.result_payload);
    if (result.testId !== row.test_type || !result.technicalOnly) {
      continue;
    }

    const comparable = comparableResult(result);
    if (!comparable) {
      continue;
    }

    const existing = grouped.get(result.testId);
    const point: LongitudinalComparisonPoint = {
      sessionId: row.id,
      completedAt: completedAtForRow(row),
      value: comparable.value,
      valueText: result.headlineValue,
      usableRatio: result.quality.usableRatio,
      greenRatio: result.quality.greenRatio,
    };

    if (existing) {
      if (existing.unit === comparable.unit && existing.metricLabel === result.headlineLabel) {
        existing.points.push(point);
      }
      continue;
    }

    grouped.set(result.testId, {
      metricLabel: result.headlineLabel,
      unit: comparable.unit,
      points: [point],
    });
  }

  const series: LongitudinalComparisonSeries[] = [];

  for (const [testId, group] of grouped.entries()) {
    const test = getClinicalTest(testId);
    if (!test || group.points.length === 0) {
      continue;
    }

    group.points.sort((a, b) => a.completedAt - b.completedAt);
    const firstValue = group.points[0].value;
    const latestValue = group.points[group.points.length - 1].value;

    series.push({
      testId,
      testName: test.nameVi,
      shortName: test.shortName,
      metricLabel: group.metricLabel,
      unit: group.unit,
      points: group.points,
      firstValue,
      latestValue,
      absoluteDelta: latestValue - firstValue,
    });
  }

  return series.sort((a, b) => {
    const aOrder = getClinicalTest(a.testId)?.order ?? 999;
    const bOrder = getClinicalTest(b.testId)?.order ?? 999;
    return aOrder - bOrder;
  });
}

export function getLongitudinalComparisonErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message === 'DECRYPTION_FAILED') {
    return 'Không thể đọc dữ liệu phiên đã mã hóa trên thiết bị.';
  }

  return 'Không thể tạo so sánh theo thời gian từ dữ liệu local hiện có.';
}
