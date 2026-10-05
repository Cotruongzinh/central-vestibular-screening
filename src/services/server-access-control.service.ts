import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

import { getFirebaseApp } from '@/config/firebase';
import type {
  ClinicianRole,
  ServerAccessSnapshot,
  ServerClinicUser,
  ServerRoleSource,
} from '@/types/access-control';

const FUNCTIONS_REGION = 'asia-southeast1';
const CALL_TIMEOUT_MS = 7000;

let cachedFunctions: Functions | null = null;

function getBackendFunctions(): Functions {
  if (cachedFunctions) return cachedFunctions;

  const app = getFirebaseApp();
  if (!app) throw new Error('FIREBASE_NOT_CONFIGURED');

  cachedFunctions = getFunctions(app, FUNCTIONS_REGION);
  return cachedFunctions;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('ACCESS_SERVER_TIMEOUT')), CALL_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isRole(value: unknown): value is ClinicianRole {
  return value === 'admin' || value === 'clinician';
}

function isRoleSource(value: unknown): value is ServerRoleSource {
  return value === 'initial-admin' || value === 'admin-assigned' || value === 'default-clinician';
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function parseSnapshot(value: unknown): ServerAccessSnapshot {
  const data = asObject(value);
  if (
    typeof data.uid !== 'string' ||
    typeof data.email !== 'string' ||
    !isRole(data.role) ||
    !isRoleSource(data.source) ||
    typeof data.verifiedAt !== 'number'
  ) {
    throw new Error('ACCESS_SERVER_INVALID_RESPONSE');
  }

  return {
    uid: data.uid,
    email: data.email,
    role: data.role,
    source: data.source,
    verifiedAt: data.verifiedAt,
  };
}

function parseClinicUser(value: unknown): ServerClinicUser {
  const data = asObject(value);
  if (
    typeof data.uid !== 'string' ||
    typeof data.email !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.emailVerified !== 'boolean' ||
    typeof data.disabled !== 'boolean' ||
    !isRole(data.role) ||
    !isRoleSource(data.roleSource) ||
    typeof data.createdAt !== 'string' ||
    typeof data.lastSignInAt !== 'string' ||
    typeof data.isCurrentUser !== 'boolean'
  ) {
    throw new Error('ACCESS_SERVER_INVALID_RESPONSE');
  }

  return {
    uid: data.uid,
    email: data.email,
    displayName: data.displayName,
    emailVerified: data.emailVerified,
    disabled: data.disabled,
    role: data.role,
    roleSource: data.roleSource,
    createdAt: data.createdAt,
    lastSignInAt: data.lastSignInAt,
    isCurrentUser: data.isCurrentUser,
  };
}

export async function syncMyServerAccess(): Promise<ServerAccessSnapshot> {
  const callable = httpsCallable<Record<string, never>, unknown>(
    getBackendFunctions(),
    'syncMyAccess',
  );
  const result = await withTimeout(callable({}));
  return parseSnapshot(result.data);
}

export async function listServerClinicUsers(): Promise<ServerClinicUser[]> {
  const callable = httpsCallable<Record<string, never>, unknown>(
    getBackendFunctions(),
    'listClinicUsers',
  );
  const result = await withTimeout(callable({}));
  const data = asObject(result.data);
  if (!Array.isArray(data.users)) throw new Error('ACCESS_SERVER_INVALID_RESPONSE');
  return data.users.map(parseClinicUser);
}

export async function setServerClinicUserRole(
  targetUid: string,
  role: ClinicianRole,
): Promise<ServerClinicUser> {
  const callable = httpsCallable<{ targetUid: string; role: ClinicianRole }, unknown>(
    getBackendFunctions(),
    'setClinicUserRole',
  );
  const result = await withTimeout(callable({ targetUid, role }));
  return parseClinicUser(result.data);
}

function readCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

export function getServerAccessErrorCode(error: unknown): string {
  if (error instanceof Error && (error.message.startsWith('ACCESS_') || error.message === 'FIREBASE_NOT_CONFIGURED')) return error.message;
  const code = readCode(error);
  return code ? code.replace(/^functions\//, 'FUNCTIONS_').toUpperCase().replace(/-/g, '_') : 'ACCESS_SERVER_UNKNOWN';
}

export function getServerAccessErrorMessage(error: unknown, language: 'vi' | 'en' = 'vi'): string {
  const code = getServerAccessErrorCode(error);
  const vi: Record<string, string> = {
    FIREBASE_NOT_CONFIGURED: 'Firebase chưa được cấu hình.',
    ACCESS_SERVER_TIMEOUT: 'Máy chủ phân quyền phản hồi quá lâu. Hãy kiểm tra mạng rồi thử lại.',
    ACCESS_SERVER_INVALID_RESPONSE: 'Máy chủ phân quyền trả về dữ liệu không hợp lệ.',
    FUNCTIONS_NOT_FOUND: 'Backend 04C chưa được deploy hoặc sai region.',
    FUNCTIONS_UNAVAILABLE: 'Không thể kết nối backend phân quyền. Cache local sẽ được dùng nếu đã từng đồng bộ.',
    FUNCTIONS_UNAUTHENTICATED: 'Phiên đăng nhập không còn hợp lệ.',
    FUNCTIONS_PERMISSION_DENIED: 'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
    FUNCTIONS_FAILED_PRECONDITION: 'Không thể thực hiện thay đổi vai trò này.',
  };
  const en: Record<string, string> = {
    FIREBASE_NOT_CONFIGURED: 'Firebase is not configured.',
    ACCESS_SERVER_TIMEOUT: 'The access-control backend took too long to respond. Check the network and try again.',
    ACCESS_SERVER_INVALID_RESPONSE: 'The access-control backend returned an invalid response.',
    FUNCTIONS_NOT_FOUND: 'The Phase 04C backend has not been deployed or the function region is incorrect.',
    FUNCTIONS_UNAVAILABLE: 'The access-control backend is unavailable. A previously verified local cache will be used when available.',
    FUNCTIONS_UNAUTHENTICATED: 'The authentication session is no longer valid.',
    FUNCTIONS_PERMISSION_DENIED: 'The current account is not allowed to perform this action.',
    FUNCTIONS_FAILED_PRECONDITION: 'This role change cannot be performed.',
  };

  const table = language === 'en' ? en : vi;
  return table[code] ?? (language === 'en'
    ? 'The server-authoritative access-control service could not complete the request.'
    : 'Dịch vụ phân quyền từ máy chủ không thể hoàn tất yêu cầu.');
}
