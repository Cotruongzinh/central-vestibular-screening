import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';

import { getFirebaseApp } from '@/config/firebase';
import type {
  AdminFeedbackRecord,
  AdminFeedbackStatus,
  AdminFeedbackSubmission,
} from '@/types/admin-feedback';
import type { FeedbackDiagnostics, FeedbackKind } from '@/types/feedback-report';
import type { AppLanguage } from '@/types/app-language';

const FUNCTIONS_REGION = 'asia-southeast1';
const CALL_TIMEOUT_MS = 10000;
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
    timer = setTimeout(() => reject(new Error('FEEDBACK_SERVER_TIMEOUT')), CALL_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function isKind(value: unknown): value is FeedbackKind {
  return value === 'feedback' || value === 'bug';
}

function isStatus(value: unknown): value is AdminFeedbackStatus {
  return value === 'open' || value === 'in-progress' || value === 'resolved';
}

function isLanguage(value: unknown): value is AppLanguage {
  return value === 'vi' || value === 'en';
}

function parseDiagnostics(value: unknown): FeedbackDiagnostics | null {
  if (value === null || value === undefined) return null;
  const data = asObject(value);
  const fields = ['appVersion', 'platform', 'osVersion', 'deviceModel', 'executionEnvironment'] as const;
  if (!fields.every((key) => typeof data[key] === 'string')) return null;
  return {
    appVersion: String(data.appVersion),
    platform: String(data.platform),
    osVersion: String(data.osVersion),
    deviceModel: String(data.deviceModel),
    executionEnvironment: String(data.executionEnvironment),
  };
}

function parseRecord(value: unknown): AdminFeedbackRecord {
  const data = asObject(value);
  if (
    typeof data.id !== 'string' ||
    !isKind(data.kind) ||
    typeof data.message !== 'string' ||
    typeof data.reproductionSteps !== 'string' ||
    !isLanguage(data.language) ||
    !isStatus(data.status) ||
    typeof data.createdAt !== 'number' ||
    typeof data.updatedAt !== 'number'
  ) {
    throw new Error('FEEDBACK_SERVER_INVALID_RESPONSE');
  }
  return {
    id: data.id,
    kind: data.kind,
    message: data.message,
    reproductionSteps: data.reproductionSteps,
    diagnostics: parseDiagnostics(data.diagnostics),
    language: data.language,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function submitAdminFeedbackReport(
  input: AdminFeedbackSubmission,
): Promise<{ id: string; status: AdminFeedbackStatus }> {
  const callable = httpsCallable<AdminFeedbackSubmission, unknown>(
    getBackendFunctions(),
    'submitFeedbackReport',
  );
  const result = await withTimeout(callable(input));
  const data = asObject(result.data);
  if (typeof data.id !== 'string' || !isStatus(data.status)) {
    throw new Error('FEEDBACK_SERVER_INVALID_RESPONSE');
  }
  return { id: data.id, status: data.status };
}

export async function listAdminFeedbackReports(): Promise<AdminFeedbackRecord[]> {
  const callable = httpsCallable<Record<string, never>, unknown>(
    getBackendFunctions(),
    'listFeedbackReports',
  );
  const result = await withTimeout(callable({}));
  const data = asObject(result.data);
  if (!Array.isArray(data.reports)) throw new Error('FEEDBACK_SERVER_INVALID_RESPONSE');
  return data.reports.map(parseRecord);
}

export async function setAdminFeedbackReportStatus(
  reportId: string,
  status: AdminFeedbackStatus,
): Promise<AdminFeedbackRecord> {
  const callable = httpsCallable<{ reportId: string; status: AdminFeedbackStatus }, unknown>(
    getBackendFunctions(),
    'setFeedbackReportStatus',
  );
  const result = await withTimeout(callable({ reportId, status }));
  return parseRecord(result.data);
}

function readCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }
  return '';
}

export function getAdminFeedbackErrorCode(error: unknown): string {
  if (error instanceof Error && (error.message.startsWith('FEEDBACK_') || error.message === 'FIREBASE_NOT_CONFIGURED')) {
    return error.message;
  }
  const code = readCode(error);
  return code ? code.replace(/^functions\//, 'FUNCTIONS_').toUpperCase().replace(/-/g, '_') : 'FEEDBACK_SERVER_UNKNOWN';
}

export function isAdminFeedbackQueueableError(error: unknown): boolean {
  const code = getAdminFeedbackErrorCode(error);
  return [
    'FEEDBACK_SERVER_TIMEOUT',
    'FUNCTIONS_UNAVAILABLE',
    'FUNCTIONS_DEADLINE_EXCEEDED',
    'FUNCTIONS_INTERNAL',
  ].includes(code);
}

export function getAdminFeedbackErrorMessage(error: unknown, language: AppLanguage): string {
  const code = getAdminFeedbackErrorCode(error);
  const vi: Record<string, string> = {
    FIREBASE_NOT_CONFIGURED: 'Firebase chưa được cấu hình.',
    FEEDBACK_SERVER_TIMEOUT: 'Máy chủ phản hồi quá lâu. Báo cáo có thể được xếp hàng nếu thiết bị đang ngoại tuyến.',
    FEEDBACK_SERVER_INVALID_RESPONSE: 'Máy chủ trả về dữ liệu phản hồi không hợp lệ.',
    FUNCTIONS_NOT_FOUND: 'Backend 04D chưa được deploy.',
    FUNCTIONS_UNAVAILABLE: 'Không thể kết nối máy chủ phản hồi.',
    FUNCTIONS_UNAUTHENTICATED: 'Phiên đăng nhập không còn hợp lệ.',
    FUNCTIONS_PERMISSION_DENIED: 'Tài khoản hiện tại không có quyền thực hiện thao tác này.',
  };
  const en: Record<string, string> = {
    FIREBASE_NOT_CONFIGURED: 'Firebase is not configured.',
    FEEDBACK_SERVER_TIMEOUT: 'The feedback backend took too long to respond. The report can be queued when the device is offline.',
    FEEDBACK_SERVER_INVALID_RESPONSE: 'The feedback backend returned invalid data.',
    FUNCTIONS_NOT_FOUND: 'The Phase 04D backend has not been deployed.',
    FUNCTIONS_UNAVAILABLE: 'The feedback backend is unavailable.',
    FUNCTIONS_UNAUTHENTICATED: 'The authentication session is no longer valid.',
    FUNCTIONS_PERMISSION_DENIED: 'The current account is not allowed to perform this action.',
  };
  const table = language === 'en' ? en : vi;
  return table[code] ?? (language === 'en' ? 'The feedback service could not complete the request.' : 'Dịch vụ phản hồi không thể hoàn tất yêu cầu.');
}
