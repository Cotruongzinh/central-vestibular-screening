import { randomUUID } from 'expo-crypto';

import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import { syncMyServerAccess } from '@/services/server-access-control.service';
import type {
  AppPermission,
  ClinicianAccessContext,
  ClinicianRole,
  ClinicianRoleAssignment,
  ClinicianRoleAuthority,
  ClinicianRoleProfilePayload,
  ServerAccessSnapshot,
} from '@/types/access-control';

type RoleProfileRow = {
  id: string;
  firebase_uid: string;
  encrypted_payload: string;
  created_at: number;
  updated_at: number;
};

type AccessOptions = {
  forceRefresh?: boolean;
};

type MemoryEntry = {
  access: ClinicianAccessContext;
  syncedAt: number;
};

const MEMORY_TTL_MS = 60_000;
const memoryCache = new Map<string, MemoryEntry>();
let accessDatabaseReady: Promise<void> | null = null;

async function getAccessDatabase() {
  if (!accessDatabaseReady) {
    accessDatabaseReady = initializeDatabase().then(() => undefined);
  }

  await accessDatabaseReady;
  return getDatabase();
}

function isClinicianRole(value: unknown): value is ClinicianRole {
  return value === 'admin' || value === 'clinician';
}

function isAssignment(value: unknown): value is ClinicianRoleAssignment {
  return [
    'server-initial-admin',
    'server-admin-assigned',
    'server-default-clinician',
    'cached-server-role',
    'offline-safe-clinician',
    'local-bootstrap-admin',
    'local-default-clinician',
  ].includes(String(value));
}

function isAuthority(value: unknown): value is ClinicianRoleAuthority {
  return value === 'server' || value === 'cached-server' || value === 'safe-fallback' || value === 'legacy-local';
}

function permissionsForRole(role: ClinicianRole): AppPermission[] {
  if (role === 'admin') {
    return [
      'patients.read.own',
      'patients.read.all',
      'patients.write.own',
      'patients.write.all',
      'audit.read.own',
      'audit.read.all',
      'audit.write',
      'local.wipe.all',
    ];
  }

  return ['patients.read.own', 'patients.write.own', 'audit.read.own', 'audit.write'];
}

function contextFromPayload(
  uid: string,
  fallbackEmail: string,
  payload: ClinicianRoleProfilePayload,
  authorityOverride?: ClinicianRoleAuthority,
  assignmentOverride?: ClinicianRoleAssignment,
): ClinicianAccessContext {
  const permissions = permissionsForRole(payload.role);
  const authority = authorityOverride ?? (isAuthority(payload.authority) ? payload.authority : 'legacy-local');
  return {
    uid,
    email: payload.email || fallbackEmail,
    role: payload.role,
    assignment: assignmentOverride ?? payload.assignment,
    authority,
    serverVerifiedAt: typeof payload.serverVerifiedAt === 'number' ? payload.serverVerifiedAt : null,
    permissions,
    canReadAllPatients: permissions.includes('patients.read.all'),
    canWriteAllPatients: permissions.includes('patients.write.all'),
    canReadAllAudit: permissions.includes('audit.read.all'),
    canWipeAllLocalData: permissions.includes('local.wipe.all'),
  };
}

async function readLocalRow(uid: string): Promise<{ row: RoleProfileRow; payload: ClinicianRoleProfilePayload } | null> {
  const db = await getAccessDatabase();
  const row = await db.getFirstAsync<RoleProfileRow>(
    `
      SELECT id, firebase_uid, encrypted_payload, created_at, updated_at
      FROM clinician_profiles
      WHERE firebase_uid = ?
      LIMIT 1
    `,
    uid,
  );

  if (!row) return null;
  const payload = await decryptJson<ClinicianRoleProfilePayload>(row.encrypted_payload);
  if (
    (payload.schemaVersion !== 1 && payload.schemaVersion !== 2) ||
    !isClinicianRole(payload.role) ||
    !isAssignment(payload.assignment)
  ) {
    throw new Error('ACCESS_PROFILE_INVALID');
  }

  return { row, payload };
}

function assignmentFromServer(snapshot: ServerAccessSnapshot): ClinicianRoleAssignment {
  if (snapshot.source === 'initial-admin') return 'server-initial-admin';
  if (snapshot.role === 'admin') return 'server-admin-assigned';
  return 'server-default-clinician';
}

async function persistRoleSnapshot(
  uid: string,
  fallbackEmail: string,
  snapshot: ServerAccessSnapshot,
  existing: { row: RoleProfileRow; payload: ClinicianRoleProfilePayload } | null,
): Promise<ClinicianAccessContext> {
  const db = await getAccessDatabase();
  const assignment = assignmentFromServer(snapshot);
  const now = Date.now();
  const payload: ClinicianRoleProfilePayload = {
    ...(existing?.payload ?? {}),
    schemaVersion: 2,
    email: (snapshot.email || fallbackEmail).trim().toLowerCase(),
    role: snapshot.role,
    assignment,
    authority: 'server',
    serverVerifiedAt: snapshot.verifiedAt,
  };
  const encryptedPayload = await encryptJson(payload);

  if (existing) {
    await db.runAsync(
      'UPDATE clinician_profiles SET encrypted_payload = ?, updated_at = ? WHERE firebase_uid = ?',
      encryptedPayload,
      now,
      uid,
    );
  } else {
    await db.runAsync(
      `
        INSERT INTO clinician_profiles (id, firebase_uid, encrypted_payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      randomUUID(),
      uid,
      encryptedPayload,
      now,
      now,
    );
  }

  const previousRole = existing?.payload.role;
  const previousAuthority = existing?.payload.authority;
  if (previousRole !== snapshot.role || previousAuthority !== 'server') {
    await writeAuditEvent({
      actorUid: uid,
      action: 'access.server_role_sync',
      entityType: 'clinician_profile',
      entityId: uid,
      metadata: {
        role: snapshot.role,
        source: snapshot.source,
        previousRole: previousRole ?? null,
      },
    });
  }

  return contextFromPayload(uid, fallbackEmail, payload);
}

async function persistSafeFallback(
  uid: string,
  fallbackEmail: string,
  existing: { row: RoleProfileRow; payload: ClinicianRoleProfilePayload } | null,
): Promise<ClinicianAccessContext> {
  const base = existing?.payload;
  const payload: ClinicianRoleProfilePayload = {
    ...(base ?? {}),
    schemaVersion: 2,
    email: (base?.email || fallbackEmail).trim().toLowerCase(),
    role: 'clinician',
    assignment: 'offline-safe-clinician',
    authority: 'safe-fallback',
    serverVerifiedAt: undefined,
  };
  const encryptedPayload = await encryptJson(payload);
  const now = Date.now();
  const db = await getAccessDatabase();

  if (existing) {
    await db.runAsync(
      'UPDATE clinician_profiles SET encrypted_payload = ?, updated_at = ? WHERE firebase_uid = ?',
      encryptedPayload,
      now,
      uid,
    );
  } else {
    await db.runAsync(
      `
        INSERT INTO clinician_profiles (id, firebase_uid, encrypted_payload, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      randomUUID(),
      uid,
      encryptedPayload,
      now,
      now,
    );
  }

  return contextFromPayload(uid, fallbackEmail, payload);
}

export async function getClinicianAccessContext(
  uid: string,
  email = '',
  options: AccessOptions = {},
): Promise<ClinicianAccessContext> {
  if (!uid) throw new Error('ACCESS_UID_REQUIRED');

  const cached = memoryCache.get(uid);
  if (!options.forceRefresh && cached && Date.now() - cached.syncedAt < MEMORY_TTL_MS) {
    return cached.access;
  }

  const existing = await readLocalRow(uid);

  try {
    const snapshot = await syncMyServerAccess();
    if (snapshot.uid !== uid) throw new Error('ACCESS_SERVER_UID_MISMATCH');
    const access = await persistRoleSnapshot(uid, email, snapshot, existing);
    memoryCache.set(uid, { access, syncedAt: Date.now() });
    return access;
  } catch (serverError) {
    if (existing && (existing.payload.authority === 'server' || existing.payload.authority === 'cached-server')) {
      const access = contextFromPayload(
        uid,
        email,
        { ...existing.payload, authority: 'cached-server' },
        'cached-server',
        'cached-server-role',
      );
      memoryCache.set(uid, { access, syncedAt: Date.now() });
      return access;
    }

    const safeAccess = await persistSafeFallback(uid, email, existing);
    memoryCache.set(uid, { access: safeAccess, syncedAt: Date.now() });
    return safeAccess;
  }
}

export function clearClinicianAccessMemory(uid?: string): void {
  if (uid) memoryCache.delete(uid);
  else memoryCache.clear();
}

export function hasPermission(access: ClinicianAccessContext, permission: AppPermission): boolean {
  return access.permissions.includes(permission);
}

export function canAccessPatientOwner(access: ClinicianAccessContext, patientOwnerUid: string): boolean {
  return access.canReadAllPatients || patientOwnerUid === access.uid;
}

export function roleLabel(role: ClinicianRole): string {
  return role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'CHUYÊN VIÊN LÂM SÀNG';
}

export function roleDescription(access: ClinicianAccessContext): string {
  if (access.role === 'admin') {
    return 'Quản trị viên có thể xem và chỉnh sửa hồ sơ bệnh nhân trong toàn bộ dữ liệu đang lưu trên thiết bị.';
  }
  return 'Chuyên viên lâm sàng chỉ có thể xem và chỉnh sửa các hồ sơ được gắn với tài khoản của mình.';
}

export function getAccessControlErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  switch (message) {
    case 'ACCESS_UID_REQUIRED':
      return 'Thiếu thông tin tài khoản để xác định quyền truy cập.';
    case 'ACCESS_PROFILE_INVALID':
      return 'Thông tin phân quyền không hợp lệ hoặc không đọc được.';
    case 'DECRYPTION_FAILED':
      return 'Không thể giải mã thông tin phân quyền trên thiết bị.';
    default:
      return 'Không thể tải thông tin phân quyền.';
  }
}
