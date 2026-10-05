import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import type { SessionClinicianNote } from '@/types/report';

type NoteRow = {
  id: string;
  patient_id: string | null;
  session_id: string | null;
  clinician_uid: string;
  encrypted_payload: string;
  created_at: number;
  updated_at: number;
};

type NotePayload = {
  schemaVersion: 1;
  text: string;
};

let noteDatabaseReady: Promise<void> | null = null;

async function getNoteDatabase() {
  if (!noteDatabaseReady) {
    noteDatabaseReady = initializeDatabase().then(() => undefined);
  }

  await noteDatabaseReady;
  return getDatabase();
}

function noteIdForSession(sessionId: string) {
  return `NOTE-${sessionId}`;
}

async function assertSessionOwnership(
  clinicianUid: string,
  patientId: string,
  sessionId: string,
) {
  const db = await getNoteDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM test_sessions
      WHERE id = ?
        AND patient_id = ?
        AND clinician_uid = ?
      LIMIT 1
    `,
    sessionId,
    patientId,
    clinicianUid,
  );

  if (!row) {
    throw new Error('SESSION_NOTE_CONTEXT_INVALID');
  }
}

export async function getSessionClinicianNote(
  clinicianUid: string,
  sessionId: string,
): Promise<SessionClinicianNote | null> {
  const db = await getNoteDatabase();
  const row = await db.getFirstAsync<NoteRow>(
    `
      SELECT
        n.id,
        n.patient_id,
        n.session_id,
        n.clinician_uid,
        n.encrypted_payload,
        n.created_at,
        n.updated_at
      FROM clinician_notes n
      INNER JOIN test_sessions s ON s.id = n.session_id
      WHERE n.session_id = ?
        AND n.clinician_uid = ?
        AND s.clinician_uid = ?
      LIMIT 1
    `,
    sessionId,
    clinicianUid,
    clinicianUid,
  );

  if (!row || !row.patient_id || !row.session_id) {
    return null;
  }

  const payload = await decryptJson<NotePayload>(row.encrypted_payload);

  return {
    id: row.id,
    patientId: row.patient_id,
    sessionId: row.session_id,
    clinicianUid: row.clinician_uid,
    text: payload.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function saveSessionClinicianNote(input: {
  clinicianUid: string;
  patientId: string;
  sessionId: string;
  text: string;
}): Promise<SessionClinicianNote> {
  const { clinicianUid, patientId, sessionId } = input;
  const text = input.text.trim().slice(0, 4000);

  await assertSessionOwnership(clinicianUid, patientId, sessionId);

  const db = await getNoteDatabase();
  const now = Date.now();
  const existing = await getSessionClinicianNote(clinicianUid, sessionId);
  const encryptedPayload = await encryptJson<NotePayload>({
    schemaVersion: 1,
    text,
  });

  if (existing) {
    await db.runAsync(
      `
        UPDATE clinician_notes
        SET encrypted_payload = ?,
            updated_at = ?
        WHERE id = ?
          AND clinician_uid = ?
      `,
      encryptedPayload,
      now,
      existing.id,
      clinicianUid,
    );
  } else {
    await db.runAsync(
      `
        INSERT INTO clinician_notes (
          id,
          patient_id,
          session_id,
          clinician_uid,
          encrypted_payload,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      noteIdForSession(sessionId),
      patientId,
      sessionId,
      clinicianUid,
      encryptedPayload,
      now,
      now,
    );
  }

  await writeAuditEvent({
    actorUid: clinicianUid,
    action: 'test.session.note.save',
    entityType: 'test_session',
    entityId: sessionId,
    metadata: {
      patientId,
      noteLength: text.length,
      encrypted: true,
    },
  });

  return {
    id: existing?.id ?? noteIdForSession(sessionId),
    patientId,
    sessionId,
    clinicianUid,
    text,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function getClinicianNoteErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message === 'SESSION_NOTE_CONTEXT_INVALID') {
    return 'Phiên test không thuộc hồ sơ/clinician hiện tại.';
  }

  return 'Không thể lưu ghi chú phiên test trên thiết bị.';
}
