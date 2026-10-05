import { FULL_BATTERY_TESTS } from '@/constants/clinical-tests';
import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import { getPersistedTestSession } from '@/services/test-session.service';
import type { PersistedTestSession } from '@/types/test-session';
import type {
  FullBatteryRun,
  FullBatteryRunEntry,
  FullBatteryRunPayload,
  FullBatteryRunStatus,
  FullBatteryRunWithSessions,
} from '@/types/full-battery';

type BatteryRunRow = {
  id: string;
  patient_id: string;
  clinician_uid: string;
  status: string;
  completed_count: number;
  encrypted_payload: string;
  started_at: number;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
};

let batteryDatabaseReady: Promise<void> | null = null;

async function getBatteryDatabase() {
  if (!batteryDatabaseReady) {
    batteryDatabaseReady = (async () => {
      await initializeDatabase();
      const db = await getDatabase();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS battery_runs (
          id TEXT PRIMARY KEY NOT NULL,
          patient_id TEXT NOT NULL,
          clinician_uid TEXT NOT NULL,
          status TEXT NOT NULL,
          completed_count INTEGER NOT NULL DEFAULT 0,
          encrypted_payload TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(patient_id) REFERENCES patients(id)
        );

        CREATE INDEX IF NOT EXISTS idx_battery_runs_patient_status
          ON battery_runs(patient_id, clinician_uid, status, created_at);
      `);
    })();
  }

  await batteryDatabaseReady;
  return getDatabase();
}

function makeBatteryRunId(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BATTERY-${timePart}-${randomPart}`;
}

function isBatteryStatus(value: string): value is FullBatteryRunStatus {
  return value === 'active' || value === 'completed' || value === 'cancelled';
}

async function rowPayload(row: BatteryRunRow): Promise<FullBatteryRunPayload> {
  return decryptJson<FullBatteryRunPayload>(row.encrypted_payload);
}

async function rowToRun(
  row: BatteryRunRow,
  payload?: FullBatteryRunPayload,
): Promise<FullBatteryRun> {
  const decoded = payload ?? (await rowPayload(row));
  const entries: FullBatteryRunEntry[] = [];

  for (let index = 0; index < decoded.sessionIds.length; index += 1) {
    const sessionId = decoded.sessionIds[index];
    const definition = FULL_BATTERY_TESTS[index];
    if (!sessionId || !definition) {
      continue;
    }

    const session = await getPersistedTestSession(row.clinician_uid, sessionId);
    if (!session) {
      continue;
    }

    entries.push({
      batteryIndex: index,
      testId: session.testId,
      sessionId: session.id,
      completedAt: session.completedAt,
      headlineLabel: session.result.headlineLabel,
      headlineValue: session.result.headlineValue,
      greenRatio: session.result.quality.greenRatio,
      usableRatio: session.result.quality.usableRatio,
      traceSampleCount: session.traceSampleCount,
    });
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    clinicianUid: row.clinician_uid,
    status: isBatteryStatus(row.status) ? row.status : 'active',
    completedCount: Number(row.completed_count ?? entries.length),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entries,
  };
}

async function findRecentRows(
  clinicianUid: string,
  patientId: string,
): Promise<BatteryRunRow[]> {
  const db = await getBatteryDatabase();
  return db.getAllAsync<BatteryRunRow>(
    `
      SELECT
        id,
        patient_id,
        clinician_uid,
        status,
        completed_count,
        encrypted_payload,
        started_at,
        completed_at,
        created_at,
        updated_at
      FROM battery_runs
      WHERE clinician_uid = ? AND patient_id = ?
      ORDER BY created_at DESC
      LIMIT 8
    `,
    clinicianUid,
    patientId,
  );
}

async function findRunContainingSession(
  clinicianUid: string,
  patientId: string,
  batteryIndex: number,
  sessionId: string,
): Promise<{ row: BatteryRunRow; payload: FullBatteryRunPayload } | null> {
  const rows = await findRecentRows(clinicianUid, patientId);

  for (const row of rows) {
    const payload = await rowPayload(row);
    if (payload.sessionIds[batteryIndex] === sessionId) {
      return { row, payload };
    }
  }

  return null;
}

async function latestActiveRow(
  clinicianUid: string,
  patientId: string,
): Promise<BatteryRunRow | null> {
  const db = await getBatteryDatabase();
  return db.getFirstAsync<BatteryRunRow>(
    `
      SELECT
        id,
        patient_id,
        clinician_uid,
        status,
        completed_count,
        encrypted_payload,
        started_at,
        completed_at,
        created_at,
        updated_at
      FROM battery_runs
      WHERE clinician_uid = ? AND patient_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    clinicianUid,
    patientId,
  );
}

async function createBatteryRun(
  clinicianUid: string,
  session: PersistedTestSession,
): Promise<{ row: BatteryRunRow; payload: FullBatteryRunPayload }> {
  const db = await getBatteryDatabase();
  const now = Date.now();
  const id = makeBatteryRunId();
  const payload: FullBatteryRunPayload = {
    schemaVersion: 1,
    sessionIds: Array.from({ length: FULL_BATTERY_TESTS.length }, () => null),
  };

  payload.sessionIds[0] = session.id;
  const encrypted = await encryptJson(payload);

  await db.runAsync(
    `
      INSERT INTO battery_runs (
        id,
        patient_id,
        clinician_uid,
        status,
        completed_count,
        encrypted_payload,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'active', 1, ?, ?, NULL, ?, ?)
    `,
    id,
    session.patientId,
    clinicianUid,
    encrypted,
    session.startedAt,
    session.startedAt,
    now,
  );

  return {
    row: {
      id,
      patient_id: session.patientId,
      clinician_uid: clinicianUid,
      status: 'active',
      completed_count: 1,
      encrypted_payload: encrypted,
      started_at: session.startedAt,
      completed_at: null,
      created_at: session.startedAt,
      updated_at: now,
    },
    payload,
  };
}

export async function recordCompletedBatteryTest(input: {
  clinicianUid: string;
  batteryIndex: number;
  session: PersistedTestSession;
}): Promise<FullBatteryRun> {
  const { clinicianUid, batteryIndex, session } = input;
  const expected = FULL_BATTERY_TESTS[batteryIndex];

  if (!expected || expected.id !== session.testId) {
    throw new Error('BATTERY_SEQUENCE_MISMATCH');
  }

  const existing = await findRunContainingSession(
    clinicianUid,
    session.patientId,
    batteryIndex,
    session.id,
  );
  if (existing) {
    return rowToRun(existing.row, existing.payload);
  }

  const db = await getBatteryDatabase();

  if (batteryIndex === 0) {
    const active = await latestActiveRow(clinicianUid, session.patientId);
    if (active) {
      await db.runAsync(
        `UPDATE battery_runs SET status = 'cancelled', updated_at = ? WHERE id = ?`,
        Date.now(),
        active.id,
      );
    }

    const created = await createBatteryRun(clinicianUid, session);
    await writeAuditEvent({
      actorUid: clinicianUid,
      action: 'battery.run.start',
      entityType: 'battery_run',
      entityId: created.row.id,
      metadata: {
        patientId: session.patientId,
        firstTestId: session.testId,
        totalTests: FULL_BATTERY_TESTS.length,
      },
    });
    return rowToRun(created.row, created.payload);
  }

  const active = await latestActiveRow(clinicianUid, session.patientId);
  if (!active) {
    throw new Error('BATTERY_RUN_NOT_FOUND');
  }

  const payload = await rowPayload(active);
  const previousReady = payload.sessionIds
    .slice(0, batteryIndex)
    .every((sessionId) => Boolean(sessionId));
  if (!previousReady) {
    throw new Error('BATTERY_SEQUENCE_INCOMPLETE');
  }

  payload.sessionIds[batteryIndex] = session.id;
  const completedCount = payload.sessionIds.filter(Boolean).length;
  const completed = completedCount === FULL_BATTERY_TESTS.length;
  const now = Date.now();
  const encrypted = await encryptJson(payload);

  await db.runAsync(
    `
      UPDATE battery_runs
      SET status = ?,
          completed_count = ?,
          encrypted_payload = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `,
    completed ? 'completed' : 'active',
    completedCount,
    encrypted,
    completed ? session.completedAt : null,
    now,
    active.id,
  );

  const updatedRow: BatteryRunRow = {
    ...active,
    status: completed ? 'completed' : 'active',
    completed_count: completedCount,
    encrypted_payload: encrypted,
    completed_at: completed ? session.completedAt : null,
    updated_at: now,
  };

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: completed ? 'battery.run.complete' : 'battery.test.complete',
    entityType: 'battery_run',
    entityId: active.id,
    metadata: {
      patientId: session.patientId,
      testId: session.testId,
      batteryIndex,
      completedCount,
      totalTests: FULL_BATTERY_TESTS.length,
    },
  });

  return rowToRun(updatedRow, payload);
}

export async function getFullBatteryRun(
  clinicianUid: string,
  batteryRunId: string,
): Promise<FullBatteryRun | null> {
  const db = await getBatteryDatabase();
  const row = await db.getFirstAsync<BatteryRunRow>(
    `
      SELECT
        id,
        patient_id,
        clinician_uid,
        status,
        completed_count,
        encrypted_payload,
        started_at,
        completed_at,
        created_at,
        updated_at
      FROM battery_runs
      WHERE id = ? AND clinician_uid = ?
      LIMIT 1
    `,
    batteryRunId,
    clinicianUid,
  );

  return row ? rowToRun(row) : null;
}

export async function getFullBatteryRunWithSessions(
  clinicianUid: string,
  batteryRunId: string,
): Promise<FullBatteryRunWithSessions | null> {
  const run = await getFullBatteryRun(clinicianUid, batteryRunId);
  if (!run) {
    return null;
  }

  const sessions: PersistedTestSession[] = [];
  for (const entry of run.entries) {
    const session = await getPersistedTestSession(clinicianUid, entry.sessionId);
    if (session) {
      sessions.push(session);
    }
  }

  return { ...run, sessions };
}


export async function listPatientFullBatteryRuns(
  clinicianUid: string,
  patientId: string,
): Promise<FullBatteryRun[]> {
  const rows = await findRecentRows(clinicianUid, patientId);
  const runs: FullBatteryRun[] = [];

  for (const row of rows) {
    runs.push(await rowToRun(row));
  }

  return runs;
}

export function getFullBatteryErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'BATTERY_SEQUENCE_MISMATCH':
      return 'Test vừa lưu không khớp vị trí hiện tại trong full battery.';
    case 'BATTERY_RUN_NOT_FOUND':
      return 'Không tìm thấy full battery đang chạy. Hãy bắt đầu lại từ test đầu tiên.';
    case 'BATTERY_SEQUENCE_INCOMPLETE':
      return 'Full battery đang thiếu một test trước đó nên chưa thể nối tiếp.';
    default:
      return 'Không thể cập nhật tiến độ full battery cục bộ.';
  }
}
