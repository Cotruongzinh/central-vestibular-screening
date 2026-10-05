import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform, Share } from 'react-native';

import { decryptJson, encryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import {
  isAdminFeedbackQueueableError,
  submitAdminFeedbackReport,
} from '@/services/admin-feedback.service';
import { writeAuditEvent } from '@/services/audit.service';
import type { AdminFeedbackDelivery, AdminFeedbackSubmission } from '@/types/admin-feedback';
import type {
  FeedbackDiagnostics,
  FeedbackReportInput,
  FeedbackShareInput,
  FeedbackShareResult,
} from '@/types/feedback-report';

const QUEUE_ENTITY_TYPE = 'feedback_report';
const QUEUE_OPERATION = 'submit_admin';

type FeedbackQueueRow = {
  id: string;
  encrypted_payload: string | null;
};

type AdminFeedbackSubmitInput = FeedbackReportInput & {
  actorUid: string;
};

export function getFeedbackDiagnostics(): FeedbackDiagnostics {
  return {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    osVersion: Device.osVersion ?? String(Platform.Version ?? 'unknown'),
    deviceModel: Device.modelName ?? 'unknown',
    executionEnvironment: String(Constants.executionEnvironment ?? 'unknown'),
  };
}

function buildVietnameseReport(input: FeedbackReportInput): string {
  const lines = [
    'CENTRAL VESTIBULAR SCREENING · FR-41',
    input.kind === 'bug' ? 'Loại: Báo lỗi' : 'Loại: Phản hồi',
    `Thời gian: ${new Date().toISOString()}`,
    '',
    'Nội dung:',
    input.message.trim(),
  ];

  if (input.kind === 'bug' && input.reproductionSteps?.trim()) {
    lines.push('', 'Các bước tái hiện:', input.reproductionSteps.trim());
  }

  if (input.includeDiagnostics) {
    const diagnostics = getFeedbackDiagnostics();
    lines.push(
      '',
      'Thông tin kỹ thuật không định danh:',
      `- Phiên bản ứng dụng: ${diagnostics.appVersion}`,
      `- Nền tảng: ${diagnostics.platform}`,
      `- Phiên bản hệ điều hành: ${diagnostics.osVersion}`,
      `- Thiết bị: ${diagnostics.deviceModel}`,
      `- Môi trường chạy: ${diagnostics.executionEnvironment}`,
    );
  }

  lines.push(
    '',
    'Quyền riêng tư: gói này không tự động thêm tên/email clinician, mã bệnh nhân, ID phiên kiểm tra hoặc dữ liệu chuyển động mắt.',
  );

  return lines.join('\n');
}

function buildEnglishReport(input: FeedbackReportInput): string {
  const lines = [
    'CENTRAL VESTIBULAR SCREENING · FR-41',
    input.kind === 'bug' ? 'Type: Bug report' : 'Type: Feedback',
    `Time: ${new Date().toISOString()}`,
    '',
    'Message:',
    input.message.trim(),
  ];

  if (input.kind === 'bug' && input.reproductionSteps?.trim()) {
    lines.push('', 'Steps to reproduce:', input.reproductionSteps.trim());
  }

  if (input.includeDiagnostics) {
    const diagnostics = getFeedbackDiagnostics();
    lines.push(
      '',
      'Non-identifying technical diagnostics:',
      `- App version: ${diagnostics.appVersion}`,
      `- Platform: ${diagnostics.platform}`,
      `- OS version: ${diagnostics.osVersion}`,
      `- Device: ${diagnostics.deviceModel}`,
      `- Execution environment: ${diagnostics.executionEnvironment}`,
    );
  }

  lines.push(
    '',
    'Privacy: this package does not automatically include clinician name/email, patient identifiers, test-session IDs, or eye-movement data.',
  );

  return lines.join('\n');
}

export function buildFeedbackReport(input: FeedbackReportInput): string {
  if (!input.message.trim()) {
    throw new Error('Feedback message is required.');
  }

  return input.language === 'vi'
    ? buildVietnameseReport(input)
    : buildEnglishReport(input);
}

function toAdminSubmission(input: FeedbackReportInput): AdminFeedbackSubmission {
  return {
    kind: input.kind,
    message: input.message.trim(),
    reproductionSteps: input.kind === 'bug' ? input.reproductionSteps?.trim() : undefined,
    includeDiagnostics: input.includeDiagnostics,
    diagnostics: input.includeDiagnostics ? getFeedbackDiagnostics() : undefined,
    language: input.language,
  };
}

async function queueAdminFeedback(submission: AdminFeedbackSubmission): Promise<string> {
  await initializeDatabase();
  const db = await getDatabase();
  const id = randomUUID();
  const encryptedPayload = await encryptJson(submission);
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, encrypted_payload, created_at, attempted_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    id,
    QUEUE_ENTITY_TYPE,
    id,
    QUEUE_OPERATION,
    encryptedPayload,
    Date.now(),
  );
  return id;
}

export async function countQueuedAdminFeedback(): Promise<number> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sync_queue WHERE entity_type = ? AND operation = ?`,
    QUEUE_ENTITY_TYPE,
    QUEUE_OPERATION,
  );
  return Number(row?.count ?? 0);
}

export async function submitFeedbackToAdminOrQueue(
  input: AdminFeedbackSubmitInput,
): Promise<AdminFeedbackDelivery> {
  if (!input.message.trim()) throw new Error('Feedback message is required.');
  const submission = toAdminSubmission(input);

  try {
    const result = await submitAdminFeedbackReport(submission);
    await writeAuditEvent({
      actorUid: input.actorUid,
      action: 'support.feedback_admin_submit',
      entityType: 'support',
      entityId: result.id,
      metadata: {
        kind: input.kind,
        diagnosticsIncluded: input.includeDiagnostics,
        delivery: 'server',
      },
    });
    return { delivery: 'sent', reportId: result.id };
  } catch (error) {
    if (!isAdminFeedbackQueueableError(error)) throw error;
    const queueId = await queueAdminFeedback(submission);
    await writeAuditEvent({
      actorUid: input.actorUid,
      action: 'support.feedback_admin_queue',
      entityType: 'support',
      entityId: queueId,
      metadata: {
        kind: input.kind,
        diagnosticsIncluded: input.includeDiagnostics,
        delivery: 'encrypted-local-queue',
      },
    });
    return { delivery: 'queued', reportId: null };
  }
}

export async function flushQueuedAdminFeedback(actorUid: string, limit = 20): Promise<number> {
  await initializeDatabase();
  const db = await getDatabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const rows = await db.getAllAsync<FeedbackQueueRow>(
    `SELECT id, encrypted_payload
     FROM sync_queue
     WHERE entity_type = ? AND operation = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    QUEUE_ENTITY_TYPE,
    QUEUE_OPERATION,
    safeLimit,
  );

  let delivered = 0;
  for (const row of rows) {
    if (!row.encrypted_payload) {
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', row.id);
      continue;
    }

    try {
      const submission = await decryptJson<AdminFeedbackSubmission>(row.encrypted_payload);
      const result = await submitAdminFeedbackReport(submission);
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', row.id);
      delivered += 1;
      await writeAuditEvent({
        actorUid,
        action: 'support.feedback_admin_submit',
        entityType: 'support',
        entityId: result.id,
        metadata: { delivery: 'queued-then-server' },
      });
    } catch (error) {
      await db.runAsync('UPDATE sync_queue SET attempted_at = ? WHERE id = ?', Date.now(), row.id);
      if (isAdminFeedbackQueueableError(error)) break;
      throw error;
    }
  }

  return delivered;
}

export async function shareFeedbackReport(
  input: FeedbackShareInput,
): Promise<FeedbackShareResult> {
  const report = buildFeedbackReport(input);
  const title = input.kind === 'bug'
    ? 'Central Vestibular · FR-41 Bug Report'
    : 'Central Vestibular · FR-41 Feedback';

  const shareResult = await Share.share({
    title,
    message: report,
  });

  await writeAuditEvent({
    actorUid: input.actorUid,
    action: input.kind === 'bug'
      ? 'support.bug_report_share'
      : 'support.feedback_share',
    entityType: 'support',
    entityId: 'FR-41',
    metadata: {
      kind: input.kind,
      diagnosticsIncluded: input.includeDiagnostics,
      shareAction: shareResult.action,
    },
  });

  return {
    action: shareResult.action,
    diagnosticsIncluded: input.includeDiagnostics,
  };
}
