import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { buildUnifiedTechnicalResult, type UnifiedMetricSource } from '@/results/unified-result';
import { writeAuditEvent } from '@/services/audit.service';
import type { ClinicalTestId } from '@/types/test-administration';
import type { EyeTraceResult } from '@/types/test-runtime';
import type {
  PersistedSessionContext,
  PersistedTestSession,
  UnifiedTechnicalResult,
} from '@/types/test-session';

type StoredSessionRow = {
  id: string;
  patient_id: string | null;
  clinician_uid: string;
  test_type: string;
  status: string;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
  result_payload: string | null;
  trace_sample_count: number | null;
};

let sessionDatabaseReady: Promise<void> | null = null;

async function getSessionDatabase() {
  if (!sessionDatabaseReady) {
    sessionDatabaseReady = initializeDatabase().then(() => undefined);
  }

  await sessionDatabaseReady;
  return getDatabase();
}

function sessionIdForMetric(metricId: string): string {
  return `SESSION-${metricId}`;
}

function resultIdForMetric(metricId: string): string {
  return `RESULT-${metricId}`;
}

function traceRowId(traceId: string): string {
  return `EYE-${traceId}`;
}

function traceAxis(testId: ClinicalTestId): string {
  if (testId === 'vertical-saccades') {
    return 'y';
  }

  if (
    testId === 'horizontal-saccades' ||
    testId === 'anti-saccade' ||
    testId === 'okn'
  ) {
    return 'x';
  }

  return 'xy';
}

export async function persistCompletedTestSession(input: {
  clinicianUid: string;
  trace: EyeTraceResult;
  metric: UnifiedMetricSource;
}): Promise<PersistedTestSession> {
  const { clinicianUid, trace, metric } = input;

  if (!trace.completed || !metric.technicalReady) {
    throw new Error('TEST_SESSION_NOT_READY');
  }

  if (
    trace.patientId !== metric.patientId ||
    trace.testId !== metric.testId ||
    trace.id !== metric.traceId
  ) {
    throw new Error('TEST_SESSION_CONTEXT_MISMATCH');
  }

  const db = await getSessionDatabase();
  const now = Date.now();
  const sessionId = sessionIdForMetric(metric.id);
  const result = buildUnifiedTechnicalResult(trace, metric);

  const context: PersistedSessionContext = {
    schemaVersion: 1,
    mode: trace.mode,
    batteryIndex: trace.batteryIndex,
    calibrationId: trace.calibrationId,
    mappingId: trace.mappingId,
    validationId: trace.validationId,
    sourceTraceId: trace.id,
    sourceMetricId: metric.id,
    storage: 'local-sqlite',
    encrypted: true,
  };

  const [encryptedContext, encryptedResult, encryptedTrace] = await Promise.all([
    encryptJson(context),
    encryptJson(result),
    encryptJson(trace),
  ]);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT OR REPLACE INTO test_sessions (
          id,
          patient_id,
          clinician_uid,
          test_type,
          status,
          started_at,
          completed_at,
          encrypted_payload,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)
      `,
      sessionId,
      trace.patientId,
      clinicianUid,
      trace.testId,
      trace.startedAt,
      trace.finishedAt,
      encryptedContext,
      trace.startedAt,
      now,
    );

    await db.runAsync(
      `
        INSERT OR REPLACE INTO test_results (
          id,
          session_id,
          encrypted_payload,
          created_at
        )
        VALUES (?, ?, ?, ?)
      `,
      resultIdForMetric(metric.id),
      sessionId,
      encryptedResult,
      now,
    );

    await db.runAsync(
      `
        INSERT OR REPLACE INTO eye_traces (
          id,
          session_id,
          axis,
          sample_count,
          encrypted_payload,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      traceRowId(trace.id),
      sessionId,
      traceAxis(trace.testId),
      trace.samples.length,
      encryptedTrace,
      now,
    );
  });

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'test.session.complete',
    entityType: 'test_session',
    entityId: sessionId,
    metadata: {
      patientId: trace.patientId,
      testId: trace.testId,
      mode: trace.mode,
      traceSamples: trace.samples.length,
      metricKind: result.metricKind,
      localOnly: true,
    },
  });

  return {
    id: sessionId,
    patientId: trace.patientId,
    clinicianUid,
    testId: trace.testId,
    status: 'completed',
    startedAt: trace.startedAt,
    completedAt: trace.finishedAt,
    createdAt: trace.startedAt,
    updatedAt: now,
    traceSampleCount: trace.samples.length,
    result,
  };
}

export async function getPersistedTestSession(
  clinicianUid: string,
  sessionId: string,
): Promise<PersistedTestSession | null> {
  const db = await getSessionDatabase();
  const row = await db.getFirstAsync<StoredSessionRow>(
    `
      SELECT
        s.id,
        s.patient_id,
        s.clinician_uid,
        s.test_type,
        s.status,
        s.started_at,
        s.completed_at,
        s.created_at,
        s.updated_at,
        r.encrypted_payload AS result_payload,
        e.sample_count AS trace_sample_count
      FROM test_sessions s
      LEFT JOIN test_results r ON r.session_id = s.id
      LEFT JOIN eye_traces e ON e.session_id = s.id
      WHERE s.id = ? AND s.clinician_uid = ?
      LIMIT 1
    `,
    sessionId,
    clinicianUid,
  );

  if (
    !row ||
    !row.patient_id ||
    !row.result_payload ||
    row.status !== 'completed' ||
    !row.started_at ||
    !row.completed_at
  ) {
    return null;
  }

  const result = await decryptJson<UnifiedTechnicalResult>(row.result_payload);

  return {
    id: row.id,
    patientId: row.patient_id,
    clinicianUid: row.clinician_uid,
    testId: result.testId,
    status: 'completed',
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    traceSampleCount: Number(row.trace_sample_count ?? 0),
    result,
  };
}

export async function getStoredEyeTrace(
  clinicianUid: string,
  sessionId: string,
): Promise<EyeTraceResult | null> {
  const db = await getSessionDatabase();
  const row = await db.getFirstAsync<{ encrypted_payload: string }>(
    `
      SELECT e.encrypted_payload
      FROM eye_traces e
      INNER JOIN test_sessions s ON s.id = e.session_id
      WHERE e.session_id = ? AND s.clinician_uid = ?
      LIMIT 1
    `,
    sessionId,
    clinicianUid,
  );

  return row ? decryptJson<EyeTraceResult>(row.encrypted_payload) : null;
}

export function getTestSessionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'TEST_SESSION_NOT_READY':
      return 'Eye trace hoặc metric chưa ở trạng thái hoàn tất để lưu.';
    case 'TEST_SESSION_CONTEXT_MISMATCH':
      return 'Trace và metric không thuộc cùng một phiên test.';
    case 'UNSUPPORTED_METRIC_RESULT':
      return 'Loại metric này chưa được hỗ trợ trong result engine 03I.';
    default:
      return 'Không thể lưu phiên test vào bộ nhớ cục bộ. Hãy thử lại.';
  }
}
