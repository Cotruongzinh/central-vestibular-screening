import { decryptJson } from '@/lib/crypto';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { hasPermission } from '@/services/access-control.service';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { AuditLogCategory, AuditLogRecord, AuditLogView } from '@/types/audit-log';

type AuditRow = {
  id: string;
  actor_uid: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  encrypted_metadata: string | null;
  created_at: number;
};

function categoryForAction(action: string): AuditLogCategory {
  if (action.startsWith('patient.')) return 'patient';
  if (action.startsWith('test.') || action.startsWith('battery.')) return 'test';
  if (action.startsWith('report.')) return 'report';
  if (action.startsWith('access.')) return 'access';
  return 'system';
}

async function decodeMetadata(value: string | null): Promise<Record<string, unknown> | null> {
  if (!value) return null;

  try {
    return await decryptJson<Record<string, unknown>>(value);
  } catch {
    return { unreadable: true };
  }
}

export async function listAuditTrail(
  access: ClinicianAccessContext,
  limit = 120,
): Promise<AuditLogView> {
  await initializeDatabase();
  const db = await getDatabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 250);
  const clinicWide = hasPermission(access, 'audit.read.all');

  const rows = clinicWide
    ? await db.getAllAsync<AuditRow>(
        `
          SELECT id, actor_uid, action, entity_type, entity_id, encrypted_metadata, created_at
          FROM audit_logs
          ORDER BY created_at DESC
          LIMIT ?
        `,
        safeLimit,
      )
    : await db.getAllAsync<AuditRow>(
        `
          SELECT id, actor_uid, action, entity_type, entity_id, encrypted_metadata, created_at
          FROM audit_logs
          WHERE actor_uid = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
        access.uid,
        safeLimit,
      );

  const records = await Promise.all(
    rows.map(async (row): Promise<AuditLogRecord> => ({
      id: row.id,
      actorUid: row.actor_uid,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: await decodeMetadata(row.encrypted_metadata),
      createdAt: row.created_at,
      category: categoryForAction(row.action),
    })),
  );

  return {
    scope: clinicWide ? 'clinic-wide' : 'own',
    records,
  };
}

export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'access.bootstrap_admin': 'Khởi tạo vai trò Quản trị viên',
    'access.create_clinician': 'Khởi tạo vai trò Chuyên viên lâm sàng',
    'access.server_role_sync': 'Đồng bộ vai trò từ backend',
    'access.server_role_change': 'Admin thay đổi vai trò tài khoản',
    'access.clinician_profile_update': 'Cập nhật hồ sơ chuyên viên',
    'settings.language_update': 'Cập nhật ngôn ngữ ứng dụng',
    'settings.normative_reference_update': 'Cập nhật nhóm dân số tham chiếu',
    'settings.tutorial_complete': 'Hoàn tất hướng dẫn sử dụng FR-39',
    'system.offline_readiness_check': 'Kiểm tra khả năng ngoại tuyến FR-42',
    'support.feedback_share': 'Mở chia sẻ phản hồi FR-41',
    'support.bug_report_share': 'Mở chia sẻ báo lỗi FR-41',
    'support.feedback_admin_submit': 'Gửi phản hồi tới hộp thư Admin',
    'support.feedback_admin_queue': 'Xếp hàng phản hồi để gửi khi có mạng',
    'support.feedback_admin_status': 'Admin cập nhật trạng thái phản hồi',
    'patient.create': 'Tạo hồ sơ bệnh nhân',
    'patient.create_anonymous': 'Tạo ca ẩn danh',
    'patient.update': 'Cập nhật hồ sơ bệnh nhân',
    'patient.soft_delete': 'Xóa mềm hồ sơ',
    'patient.restore': 'Khôi phục hồ sơ',
    'patient.hard_delete_after_retention': 'Xóa vĩnh viễn sau thời gian lưu giữ',
    'battery.run.start': 'Bắt đầu bộ kiểm tra đầy đủ',
    'test.session.complete': 'Hoàn tất phiên kiểm tra',
    'test.session.note.save': 'Lưu ghi chú phiên kiểm tra',
    'report.pdf.generate': 'Tạo PDF báo cáo',
    'report.pdf.share': 'Mở chia sẻ PDF',
    LOCAL_FOUNDATION_SELF_TEST: 'Kiểm tra nền tảng dữ liệu trên thiết bị',
  };

  return labels[action] ?? action.replace(/[._]/g, ' ');
}

export function auditCategoryLabel(category: AuditLogCategory): string {
  switch (category) {
    case 'patient': return 'BỆNH NHÂN';
    case 'test': return 'KIỂM TRA';
    case 'report': return 'BÁO CÁO';
    case 'access': return 'TRUY CẬP';
    default: return 'HỆ THỐNG';
  }
}

export function auditMetadataPreview(metadata: Record<string, unknown> | null): string {
  if (!metadata) return 'Không có thông tin bổ sung.';
  if (metadata.unreadable === true) return 'Không thể giải mã thông tin bổ sung.';

  const parts = Object.entries(metadata)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return parts.length ? parts.join(' · ') : 'Đã giải mã thông tin bổ sung; không có nội dung ngắn để hiển thị.';
}
