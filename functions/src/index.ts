import { initializeApp } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineString } from 'firebase-functions/params';
import { onInit } from 'firebase-functions/v2/core';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';

onInit(() => {
  initializeApp();
});

const REGION = 'asia-southeast1';
const INITIAL_ADMIN_EMAIL = defineString('INITIAL_ADMIN_EMAIL');
const MEMBER_COLLECTION = 'access_members';

type Role = 'admin' | 'clinician';
type RoleSource = 'initial-admin' | 'admin-assigned' | 'default-clinician';

type MemberDoc = {
  uid: string;
  email: string;
  role: Role;
  roleSource: RoleSource;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
};

function normalizedEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function requireVerifiedAuth(request: CallableRequest<unknown>) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const email = normalizedEmail(request.auth.token.email);
  if (!email || request.auth.token.email_verified !== true) {
    throw new HttpsError('failed-precondition', 'A verified email account is required.');
  }
  return { uid: request.auth.uid, email };
}

function initialAdminEmail(): string {
  const value = normalizedEmail(INITIAL_ADMIN_EMAIL.value());
  if (!value) throw new HttpsError('failed-precondition', 'INITIAL_ADMIN_EMAIL is not configured.');
  return value;
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'clinician';
}

function isRoleSource(value: unknown): value is RoleSource {
  return value === 'initial-admin' || value === 'admin-assigned' || value === 'default-clinician';
}

async function ensureMember(uid: string, email: string): Promise<{ role: Role; source: RoleSource }> {
  const db = getFirestore();
  const ref = db.collection(MEMBER_COLLECTION).doc(uid);
  const primaryEmail = initialAdminEmail();
  const shouldBeInitialAdmin = email === primaryEmail;
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    const role: Role = shouldBeInitialAdmin ? 'admin' : 'clinician';
    const source: RoleSource = shouldBeInitialAdmin ? 'initial-admin' : 'default-clinician';
    await ref.set({ uid, email, role, roleSource: source, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: 'system' } satisfies MemberDoc);
    return { role, source };
  }

  const data = snapshot.data() as Partial<MemberDoc>;
  let role: Role = isRole(data.role) ? data.role : 'clinician';
  let source: RoleSource = isRoleSource(data.roleSource) ? data.roleSource : (role === 'admin' ? 'admin-assigned' : 'default-clinician');

  if (shouldBeInitialAdmin && role !== 'admin') {
    role = 'admin'; source = 'initial-admin';
    await ref.set({ uid, email, role, roleSource: source, updatedAt: FieldValue.serverTimestamp(), updatedBy: 'system' }, { merge: true });
  } else if (data.email !== email) {
    await ref.set({ email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  return { role, source };
}

async function requireAdmin(request: CallableRequest<unknown>) {
  const caller = requireVerifiedAuth(request);
  const member = await ensureMember(caller.uid, caller.email);
  if (member.role !== 'admin') throw new HttpsError('permission-denied', 'Administrator role required.');
  return caller;
}

function roleForUser(user: UserRecord, member?: Partial<MemberDoc>): { role: Role; source: RoleSource } {
  const email = normalizedEmail(user.email);
  if (email && email === initialAdminEmail()) return { role: 'admin', source: 'initial-admin' };
  const role: Role = isRole(member?.role) ? member.role : 'clinician';
  const source: RoleSource = isRoleSource(member?.roleSource) ? member.roleSource : (role === 'admin' ? 'admin-assigned' : 'default-clinician');
  return { role, source };
}

function userPayload(user: UserRecord, role: Role, roleSource: RoleSource, currentUid: string) {
  return {
    uid: user.uid,
    email: normalizedEmail(user.email),
    displayName: user.displayName ?? '',
    emailVerified: user.emailVerified,
    disabled: user.disabled,
    role,
    roleSource,
    createdAt: user.metadata.creationTime ?? '',
    lastSignInAt: user.metadata.lastSignInTime ?? '',
    isCurrentUser: user.uid === currentUid,
  };
}

export const syncMyAccess = onCall({ region: REGION }, async (request) => {
  const caller = requireVerifiedAuth(request);
  const member = await ensureMember(caller.uid, caller.email);
  return { uid: caller.uid, email: caller.email, role: member.role, source: member.source, verifiedAt: Date.now() };
});

export const listClinicUsers = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request);
  const auth = getAuth();
  const db = getFirestore();
  const page = await auth.listUsers(200);
  const users = await Promise.all(page.users.map(async (user) => {
    const snapshot = await db.collection(MEMBER_COLLECTION).doc(user.uid).get();
    const member = snapshot.exists ? (snapshot.data() as Partial<MemberDoc>) : undefined;
    const resolved = roleForUser(user, member);
    return userPayload(user, resolved.role, resolved.source, caller.uid);
  }));
  return { users };
});

export const setClinicUserRole = onCall({ region: REGION }, async (request) => {
  const caller = await requireAdmin(request);
  const data = (request.data ?? {}) as { targetUid?: unknown; role?: unknown };
  const targetUid = typeof data.targetUid === 'string' ? data.targetUid.trim() : '';
  const role = data.role;
  if (!targetUid || !isRole(role)) throw new HttpsError('invalid-argument', 'targetUid and role are required.');
  if (targetUid === caller.uid) throw new HttpsError('failed-precondition', 'Administrators cannot change their own role.');

  const auth = getAuth();
  const target = await auth.getUser(targetUid);
  const targetEmail = normalizedEmail(target.email);
  if (targetEmail === initialAdminEmail() && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'The Initial Admin cannot be demoted.');
  }

  const roleSource: RoleSource = role === 'admin' ? 'admin-assigned' : 'default-clinician';
  await getFirestore().collection(MEMBER_COLLECTION).doc(targetUid).set({ uid: targetUid, email: targetEmail, role, roleSource, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.uid }, { merge: true });
  await auth.setCustomUserClaims(targetUid, { ...(target.customClaims ?? {}), centralVestibularRole: role });

  const updated = await auth.getUser(targetUid);
  return userPayload(updated, role, roleSource, caller.uid);
});

const FEEDBACK_COLLECTION = 'feedback_reports';

type FeedbackKind = 'feedback' | 'bug';
type FeedbackStatus = 'open' | 'in-progress' | 'resolved';
type FeedbackLanguage = 'vi' | 'en';

type FeedbackDiagnostics = {
  appVersion: string;
  platform: string;
  osVersion: string;
  deviceModel: string;
  executionEnvironment: string;
};

type FeedbackDoc = {
  kind: FeedbackKind;
  message: string;
  reproductionSteps: string;
  diagnostics: FeedbackDiagnostics | null;
  language: FeedbackLanguage;
  status: FeedbackStatus;
  source: 'ios-app';
  createdAt?: unknown;
  updatedAt?: unknown;
};

function isFeedbackKind(value: unknown): value is FeedbackKind {
  return value === 'feedback' || value === 'bug';
}

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return value === 'open' || value === 'in-progress' || value === 'resolved';
}

function isFeedbackLanguage(value: unknown): value is FeedbackLanguage {
  return value === 'vi' || value === 'en';
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function cleanDiagnostics(value: unknown): FeedbackDiagnostics | null {
  if (typeof value !== 'object' || value === null) return null;
  const data = value as Record<string, unknown>;
  return {
    appVersion: cleanText(data.appVersion, 80),
    platform: cleanText(data.platform, 40),
    osVersion: cleanText(data.osVersion, 80),
    deviceModel: cleanText(data.deviceModel, 120),
    executionEnvironment: cleanText(data.executionEnvironment, 120),
  };
}

function timestampToMillis(value: unknown): number {
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      try {
        return Number((toMillis as () => number).call(value));
      } catch {
        return Date.now();
      }
    }
  }
  return Date.now();
}

function feedbackPayload(id: string, data: Partial<FeedbackDoc>) {
  return {
    id,
    kind: isFeedbackKind(data.kind) ? data.kind : 'feedback' as FeedbackKind,
    message: typeof data.message === 'string' ? data.message : '',
    reproductionSteps: typeof data.reproductionSteps === 'string' ? data.reproductionSteps : '',
    diagnostics: data.diagnostics && typeof data.diagnostics === 'object' ? data.diagnostics : null,
    language: isFeedbackLanguage(data.language) ? data.language : 'en' as FeedbackLanguage,
    status: isFeedbackStatus(data.status) ? data.status : 'open' as FeedbackStatus,
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

export const submitFeedbackReport = onCall({ region: REGION }, async (request) => {
  requireVerifiedAuth(request);
  const data = (request.data ?? {}) as Record<string, unknown>;
  const kind = data.kind;
  const language = data.language;
  const message = cleanText(data.message, 1800);
  const reproductionSteps = cleanText(data.reproductionSteps, 1200);
  const includeDiagnostics = data.includeDiagnostics === true;

  if (!isFeedbackKind(kind) || !isFeedbackLanguage(language) || !message) {
    throw new HttpsError('invalid-argument', 'kind, language, and message are required.');
  }

  const diagnostics = includeDiagnostics ? cleanDiagnostics(data.diagnostics) : null;
  const ref = getFirestore().collection(FEEDBACK_COLLECTION).doc();
  const report: FeedbackDoc = {
    kind,
    message,
    reproductionSteps: kind === 'bug' ? reproductionSteps : '',
    diagnostics,
    language,
    status: 'open',
    source: 'ios-app',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(report);
  return { id: ref.id, status: 'open' as FeedbackStatus };
});

export const listFeedbackReports = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request);
  const snapshot = await getFirestore()
    .collection(FEEDBACK_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return {
    reports: snapshot.docs.map((doc) => feedbackPayload(doc.id, doc.data() as Partial<FeedbackDoc>)),
  };
});

export const setFeedbackReportStatus = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request);
  const data = (request.data ?? {}) as Record<string, unknown>;
  const reportId = cleanText(data.reportId, 160);
  const status = data.status;
  if (!reportId || !isFeedbackStatus(status)) {
    throw new HttpsError('invalid-argument', 'reportId and status are required.');
  }

  const ref = getFirestore().collection(FEEDBACK_COLLECTION).doc(reportId);
  const current = await ref.get();
  if (!current.exists) throw new HttpsError('not-found', 'Feedback report not found.');

  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return feedbackPayload(updated.id, updated.data() as Partial<FeedbackDoc>);
});
