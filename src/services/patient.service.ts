import { randomUUID } from 'expo-crypto';

import { SOFT_DELETE_RETENTION_DAYS } from '@/constants/storage';
import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import type { ClinicianAccessContext } from '@/types/access-control';
import type {
  PatientInput,
  PatientPayload,
  PatientRecord,
  PatientSessionSummary,
} from '@/types/patient';

type PatientRow = {
  id: string;
  clinician_uid: string;
  patient_code: string;
  is_anonymous: number;
  encrypted_payload: string;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
};

type SessionRow = {
  id: string;
  test_type: string;
  status: string;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
};

let patientDatabaseReady: Promise<void> | null = null;

async function getPatientDatabase() {
  if (!patientDatabaseReady) {
    patientDatabaseReady = initializeDatabase().then(() => undefined);
  }

  await patientDatabaseReady;
  return getDatabase();
}

function cleanInput(input: PatientInput): PatientPayload {
  return {
    fullName: input.fullName.trim(),
    dateOfBirth: input.dateOfBirth.trim(),
    sex: input.sex,
    patientId: input.patientId.trim(),
    clinicalNotes: input.clinicalNotes.trim(),
  };
}

function buildLocalCode(id: string, timestamp: number): string {
  const timePart = timestamp.toString(36).toUpperCase().slice(-6);
  const idPart = id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `PT-${timePart}-${idPart}`;
}

async function mapPatientRow(row: PatientRow): Promise<PatientRecord> {
  const payload = await decryptJson<PatientPayload>(row.encrypted_payload);

  return {
    id: row.id,
    clinicianUid: row.clinician_uid,
    localCode: row.patient_code,
    isAnonymous: row.is_anonymous === 1,
    payload,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createPatient(
  clinicianUid: string,
  input: PatientInput,
): Promise<PatientRecord> {
  const payload = cleanInput(input);

  if (!payload.fullName) {
    throw new Error('PATIENT_NAME_REQUIRED');
  }

  const db = await getPatientDatabase();
  const id = randomUUID();
  const now = Date.now();
  const localCode = buildLocalCode(id, now);
  const encryptedPayload = await encryptJson(payload);

  await db.runAsync(
    `
      INSERT INTO patients (
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 0, ?, NULL, ?, ?)
    `,
    id,
    clinicianUid,
    localCode,
    encryptedPayload,
    now,
    now,
  );

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'patient.create',
    entityType: 'patient',
    entityId: id,
    metadata: { localCode },
  });

  return {
    id,
    clinicianUid,
    localCode,
    isAnonymous: false,
    payload,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}


export async function createAnonymousPatient(
  clinicianUid: string,
): Promise<PatientRecord> {
  const db = await getPatientDatabase();
  const id = randomUUID();
  const now = Date.now();
  const localCode = buildLocalCode(id, now);
  const payload: PatientPayload = {
    fullName: 'Ca ẩn danh',
    dateOfBirth: '',
    sex: 'unspecified',
    patientId: '',
    clinicalNotes: '',
  };
  const encryptedPayload = await encryptJson(payload);

  await db.runAsync(
    `
      INSERT INTO patients (
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 1, ?, NULL, ?, ?)
    `,
    id,
    clinicianUid,
    localCode,
    encryptedPayload,
    now,
    now,
  );

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'patient.create_anonymous',
    entityType: 'patient',
    entityId: id,
    metadata: { localCode },
  });

  return {
    id,
    clinicianUid,
    localCode,
    isAnonymous: true,
    payload,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listPatients(
  clinicianUid: string,
  options: { includeDeleted?: boolean; deletedOnly?: boolean } = {},
): Promise<PatientRecord[]> {
  const db = await getPatientDatabase();
  const { includeDeleted = false, deletedOnly = false } = options;

  let deletedClause = 'AND deleted_at IS NULL';
  if (deletedOnly) {
    deletedClause = 'AND deleted_at IS NOT NULL';
  } else if (includeDeleted) {
    deletedClause = '';
  }

  const rows = await db.getAllAsync<PatientRow>(
    `
      SELECT
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      FROM patients
      WHERE clinician_uid = ?
      ${deletedClause}
      ORDER BY updated_at DESC
    `,
    clinicianUid,
  );

  return Promise.all(rows.map(mapPatientRow));
}

export async function searchPatients(
  clinicianUid: string,
  query: string,
): Promise<PatientRecord[]> {
  const patients = await listPatients(clinicianUid);
  const normalized = query.trim().toLocaleLowerCase('vi-VN');

  if (!normalized) {
    return patients;
  }

  return patients.filter((patient) => {
    const fullName = patient.payload.fullName.toLocaleLowerCase('vi-VN');
    const patientId = patient.payload.patientId.toLocaleLowerCase('vi-VN');
    const localCode = patient.localCode.toLocaleLowerCase('vi-VN');

    return (
      fullName.includes(normalized) ||
      patientId.includes(normalized) ||
      localCode.includes(normalized)
    );
  });
}

export async function getPatientById(
  clinicianUid: string,
  patientId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<PatientRecord | null> {
  const db = await getPatientDatabase();
  const deletedClause = options.includeDeleted ? '' : 'AND deleted_at IS NULL';

  const row = await db.getFirstAsync<PatientRow>(
    `
      SELECT
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      FROM patients
      WHERE id = ? AND clinician_uid = ?
      ${deletedClause}
      LIMIT 1
    `,
    patientId,
    clinicianUid,
  );

  return row ? mapPatientRow(row) : null;
}

export async function updatePatient(
  clinicianUid: string,
  patientId: string,
  input: PatientInput,
): Promise<PatientRecord> {
  const existing = await getPatientById(clinicianUid, patientId, {
    includeDeleted: true,
  });

  if (!existing) {
    throw new Error('PATIENT_NOT_FOUND');
  }

  if (existing.deletedAt) {
    throw new Error('PATIENT_DELETED');
  }

  if (existing.isAnonymous) {
    throw new Error('PATIENT_ANONYMOUS');
  }

  const payload = cleanInput(input);
  if (!payload.fullName) {
    throw new Error('PATIENT_NAME_REQUIRED');
  }

  const db = await getPatientDatabase();
  const now = Date.now();
  const encryptedPayload = await encryptJson(payload);

  await db.runAsync(
    `
      UPDATE patients
      SET encrypted_payload = ?, updated_at = ?
      WHERE id = ? AND clinician_uid = ?
    `,
    encryptedPayload,
    now,
    patientId,
    clinicianUid,
  );

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'patient.update',
    entityType: 'patient',
    entityId: patientId,
  });

  return {
    ...existing,
    payload,
    updatedAt: now,
  };
}

export async function softDeletePatient(
  clinicianUid: string,
  patientId: string,
): Promise<void> {
  const db = await getPatientDatabase();
  const now = Date.now();

  const result = await db.runAsync(
    `
      UPDATE patients
      SET deleted_at = ?, updated_at = ?
      WHERE id = ?
        AND clinician_uid = ?
        AND deleted_at IS NULL
    `,
    now,
    now,
    patientId,
    clinicianUid,
  );

  if (result.changes < 1) {
    throw new Error('PATIENT_NOT_FOUND');
  }

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'patient.soft_delete',
    entityType: 'patient',
    entityId: patientId,
    metadata: { retentionDays: SOFT_DELETE_RETENTION_DAYS },
  });
}

export async function restorePatient(
  clinicianUid: string,
  patientId: string,
): Promise<void> {
  const db = await getPatientDatabase();
  const now = Date.now();

  const result = await db.runAsync(
    `
      UPDATE patients
      SET deleted_at = NULL, updated_at = ?
      WHERE id = ?
        AND clinician_uid = ?
        AND deleted_at IS NOT NULL
    `,
    now,
    patientId,
    clinicianUid,
  );

  if (result.changes < 1) {
    throw new Error('PATIENT_NOT_FOUND');
  }

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'patient.restore',
    entityType: 'patient',
    entityId: patientId,
  });
}

export async function purgeExpiredSoftDeletedPatients(
  clinicianUid: string,
): Promise<number> {
  const db = await getPatientDatabase();
  const threshold =
    Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  const rows = await db.getAllAsync<{ id: string }>(
    `
      SELECT id
      FROM patients
      WHERE clinician_uid = ?
        AND deleted_at IS NOT NULL
        AND deleted_at <= ?
    `,
    clinicianUid,
    threshold,
  );

  for (const row of rows) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM clinician_notes
         WHERE patient_id = ?
            OR session_id IN (SELECT id FROM test_sessions WHERE patient_id = ?)`,
        row.id,
        row.id,
      );
      await db.runAsync('DELETE FROM test_sessions WHERE patient_id = ?', row.id);
      await db.runAsync(
        'DELETE FROM patients WHERE id = ? AND clinician_uid = ?',
        row.id,
        clinicianUid,
      );
    });

    await writeAuditEvent({
      actorUid: clinicianUid,
      action: 'patient.hard_delete_after_retention',
      entityType: 'patient',
      entityId: row.id,
      metadata: { retentionDays: SOFT_DELETE_RETENTION_DAYS },
    });
  }

  return rows.length;
}

export async function listPatientSessions(
  clinicianUid: string,
  patientId: string,
): Promise<PatientSessionSummary[]> {
  const db = await getPatientDatabase();

  const rows = await db.getAllAsync<SessionRow>(
    `
      SELECT
        id,
        test_type,
        status,
        started_at,
        completed_at,
        created_at
      FROM test_sessions
      WHERE patient_id = ? AND clinician_uid = ?
      ORDER BY COALESCE(completed_at, started_at, created_at) DESC
    `,
    patientId,
    clinicianUid,
  );

  return rows.map((row) => ({
    id: row.id,
    testType: row.test_type,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}


function canReadPatientOwner(
  access: ClinicianAccessContext,
  ownerUid: string,
): boolean {
  return access.canReadAllPatients || access.uid === ownerUid;
}

function canWritePatientOwner(
  access: ClinicianAccessContext,
  ownerUid: string,
): boolean {
  return access.canWriteAllPatients || access.uid === ownerUid;
}

export async function listPatientsForAccess(
  access: ClinicianAccessContext,
  options: { includeDeleted?: boolean; deletedOnly?: boolean } = {},
): Promise<PatientRecord[]> {
  if (!access.canReadAllPatients) {
    return listPatients(access.uid, options);
  }

  const db = await getPatientDatabase();
  const { includeDeleted = false, deletedOnly = false } = options;
  let deletedClause = 'WHERE deleted_at IS NULL';
  if (deletedOnly) {
    deletedClause = 'WHERE deleted_at IS NOT NULL';
  } else if (includeDeleted) {
    deletedClause = '';
  }

  const rows = await db.getAllAsync<PatientRow>(
    `
      SELECT
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      FROM patients
      ${deletedClause}
      ORDER BY updated_at DESC
    `,
  );

  return Promise.all(rows.map(mapPatientRow));
}

export async function getPatientByIdForAccess(
  access: ClinicianAccessContext,
  patientId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<PatientRecord | null> {
  if (!access.canReadAllPatients) {
    return getPatientById(access.uid, patientId, options);
  }

  const db = await getPatientDatabase();
  const deletedClause = options.includeDeleted ? '' : 'AND deleted_at IS NULL';
  const row = await db.getFirstAsync<PatientRow>(
    `
      SELECT
        id,
        clinician_uid,
        patient_code,
        is_anonymous,
        encrypted_payload,
        deleted_at,
        created_at,
        updated_at
      FROM patients
      WHERE id = ?
      ${deletedClause}
      LIMIT 1
    `,
    patientId,
  );

  if (!row || !canReadPatientOwner(access, row.clinician_uid)) {
    return null;
  }

  return mapPatientRow(row);
}

export async function updatePatientForAccess(
  access: ClinicianAccessContext,
  patientId: string,
  input: PatientInput,
): Promise<PatientRecord> {
  const existing = await getPatientByIdForAccess(access, patientId, {
    includeDeleted: true,
  });

  if (!existing || !canWritePatientOwner(access, existing.clinicianUid)) {
    throw new Error('PATIENT_ACCESS_DENIED');
  }
  if (existing.deletedAt) {
    throw new Error('PATIENT_DELETED');
  }
  if (existing.isAnonymous) {
    throw new Error('PATIENT_ANONYMOUS');
  }

  const payload = cleanInput(input);
  if (!payload.fullName) {
    throw new Error('PATIENT_NAME_REQUIRED');
  }

  const db = await getPatientDatabase();
  const now = Date.now();
  const encryptedPayload = await encryptJson(payload);
  await db.runAsync(
    'UPDATE patients SET encrypted_payload = ?, updated_at = ? WHERE id = ?',
    encryptedPayload,
    now,
    patientId,
  );

  await writeAuditEvent({
    actorUid: access.uid,
    action: 'patient.update',
    entityType: 'patient',
    entityId: patientId,
    metadata: {
      ownerUid: existing.clinicianUid,
      actorRole: access.role,
    },
  });

  return { ...existing, payload, updatedAt: now };
}

export async function softDeletePatientForAccess(
  access: ClinicianAccessContext,
  patientId: string,
): Promise<void> {
  const existing = await getPatientByIdForAccess(access, patientId, {
    includeDeleted: true,
  });
  if (!existing || !canWritePatientOwner(access, existing.clinicianUid)) {
    throw new Error('PATIENT_ACCESS_DENIED');
  }
  if (existing.deletedAt) {
    throw new Error('PATIENT_DELETED');
  }

  const db = await getPatientDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    'UPDATE patients SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    now,
    now,
    patientId,
  );
  if (result.changes < 1) {
    throw new Error('PATIENT_NOT_FOUND');
  }

  await writeAuditEvent({
    actorUid: access.uid,
    action: 'patient.soft_delete',
    entityType: 'patient',
    entityId: patientId,
    metadata: {
      ownerUid: existing.clinicianUid,
      actorRole: access.role,
      retentionDays: SOFT_DELETE_RETENTION_DAYS,
    },
  });
}

export async function restorePatientForAccess(
  access: ClinicianAccessContext,
  patientId: string,
): Promise<void> {
  const existing = await getPatientByIdForAccess(access, patientId, {
    includeDeleted: true,
  });
  if (!existing || !canWritePatientOwner(access, existing.clinicianUid)) {
    throw new Error('PATIENT_ACCESS_DENIED');
  }

  const db = await getPatientDatabase();
  const now = Date.now();
  const result = await db.runAsync(
    'UPDATE patients SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
    now,
    patientId,
  );
  if (result.changes < 1) {
    throw new Error('PATIENT_NOT_FOUND');
  }

  await writeAuditEvent({
    actorUid: access.uid,
    action: 'patient.restore',
    entityType: 'patient',
    entityId: patientId,
    metadata: { ownerUid: existing.clinicianUid, actorRole: access.role },
  });
}

export async function purgeExpiredSoftDeletedPatientsForAccess(
  access: ClinicianAccessContext,
): Promise<number> {
  if (!access.canWriteAllPatients) {
    return purgeExpiredSoftDeletedPatients(access.uid);
  }

  const db = await getPatientDatabase();
  const threshold =
    Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const rows = await db.getAllAsync<{ id: string; clinician_uid: string }>(
    `
      SELECT id, clinician_uid
      FROM patients
      WHERE deleted_at IS NOT NULL
        AND deleted_at <= ?
    `,
    threshold,
  );

  for (const row of rows) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM clinician_notes
         WHERE patient_id = ?
            OR session_id IN (SELECT id FROM test_sessions WHERE patient_id = ?)`,
        row.id,
        row.id,
      );
      await db.runAsync('DELETE FROM test_sessions WHERE patient_id = ?', row.id);
      await db.runAsync('DELETE FROM patients WHERE id = ?', row.id);
    });

    await writeAuditEvent({
      actorUid: access.uid,
      action: 'patient.hard_delete_after_retention',
      entityType: 'patient',
      entityId: row.id,
      metadata: {
        ownerUid: row.clinician_uid,
        actorRole: access.role,
        retentionDays: SOFT_DELETE_RETENTION_DAYS,
      },
    });
  }

  return rows.length;
}

export async function listPatientSessionsForAccess(
  access: ClinicianAccessContext,
  patientId: string,
): Promise<PatientSessionSummary[]> {
  const patient = await getPatientByIdForAccess(access, patientId);
  if (!patient) {
    throw new Error('PATIENT_ACCESS_DENIED');
  }

  return listPatientSessions(patient.clinicianUid, patientId);
}

export function getPatientServiceErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'PATIENT_NAME_REQUIRED':
      return 'Họ tên bệnh nhân là thông tin bắt buộc.';
    case 'PATIENT_NOT_FOUND':
      return 'Không tìm thấy hồ sơ bệnh nhân này.';
    case 'PATIENT_DELETED':
      return 'Hồ sơ đang ở trạng thái đã xóa mềm. Hãy khôi phục trước khi chỉnh sửa.';
    case 'PATIENT_ANONYMOUS':
      return 'Ca ẩn danh không cho phép thêm thông tin định danh. Hãy tạo hồ sơ bệnh nhân mới nếu cần.';
    case 'PATIENT_ACCESS_DENIED':
      return 'Role hiện tại không có quyền truy cập hồ sơ bệnh nhân này.';
    default:
      return 'Không thể xử lý hồ sơ bệnh nhân. Hãy thử lại.';
  }
}
