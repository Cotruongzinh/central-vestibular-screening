import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { getClinicianAccessContext } from '@/services/access-control.service';
import { writeAuditEvent } from '@/services/audit.service';
import type { ClinicianAccessContext, ClinicianRoleProfilePayload } from '@/types/access-control';
import type { ClinicianProfileInput, ClinicianProfileView } from '@/types/clinician-profile';

type ClinicianProfileRow = {
  id: string;
  firebase_uid: string;
  encrypted_payload: string;
  created_at: number;
  updated_at: number;
};

function normalize(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeLogoUri(value: string): string {
  return value.trim().slice(0, 1200);
}

function viewFromPayload(
  row: ClinicianProfileRow,
  payload: ClinicianRoleProfilePayload,
): ClinicianProfileView {
  return {
    uid: row.firebase_uid,
    email: payload.email,
    role: payload.role,
    assignment: payload.assignment,
    displayName: payload.displayName ?? '',
    specialty: payload.specialty ?? '',
    facility: payload.facility ?? '',
    clinicLogoUri: payload.clinicLogoUri ?? '',
    updatedAt: row.updated_at,
  };
}

async function getRow(uid: string): Promise<ClinicianProfileRow> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<ClinicianProfileRow>(
    `
      SELECT id, firebase_uid, encrypted_payload, created_at, updated_at
      FROM clinician_profiles
      WHERE firebase_uid = ?
      LIMIT 1
    `,
    uid,
  );

  if (!row) {
    throw new Error('CLINICIAN_PROFILE_NOT_FOUND');
  }

  return row;
}

export async function getClinicianProfile(
  uid: string,
  email = '',
): Promise<ClinicianProfileView> {
  await getClinicianAccessContext(uid, email);
  const row = await getRow(uid);
  const payload = await decryptJson<ClinicianRoleProfilePayload>(row.encrypted_payload);
  return viewFromPayload(row, payload);
}

export async function updateClinicianProfile(
  access: ClinicianAccessContext,
  input: ClinicianProfileInput,
): Promise<ClinicianProfileView> {
  const row = await getRow(access.uid);
  const current = await decryptJson<ClinicianRoleProfilePayload>(row.encrypted_payload);

  const nextPayload: ClinicianRoleProfilePayload = {
    ...current,
    schemaVersion: 2,
    email: access.email.trim().toLowerCase(),
    role: access.role,
    assignment: access.assignment,
    displayName: normalize(input.displayName, 80),
    specialty: normalize(input.specialty, 100),
    facility: normalize(input.facility, 140),
    clinicLogoUri: normalizeLogoUri(input.clinicLogoUri),
  };

  const encryptedPayload = await encryptJson(nextPayload);
  const now = Date.now();
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE clinician_profiles
      SET encrypted_payload = ?, updated_at = ?
      WHERE firebase_uid = ?
    `,
    encryptedPayload,
    now,
    access.uid,
  );

  await writeAuditEvent({
    actorUid: access.uid,
    action: 'access.clinician_profile_update',
    entityType: 'clinician_profile',
    entityId: row.id,
    metadata: {
      role: access.role,
      hasDisplayName: Boolean(nextPayload.displayName),
      hasSpecialty: Boolean(nextPayload.specialty),
      hasFacility: Boolean(nextPayload.facility),
      hasClinicLogoUri: Boolean(nextPayload.clinicLogoUri),
    },
  });

  return viewFromPayload(
    { ...row, encrypted_payload: encryptedPayload, updated_at: now },
    nextPayload,
  );
}

export function getClinicianProfileErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'CLINICIAN_PROFILE_NOT_FOUND':
      return 'Không tìm thấy clinician profile local.';
    case 'DECRYPTION_FAILED':
      return 'Không thể giải mã clinician profile local.';
    default:
      return 'Không thể đọc hoặc cập nhật clinician profile.';
  }
}
