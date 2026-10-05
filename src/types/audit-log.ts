export type AuditLogCategory =
  | 'patient'
  | 'test'
  | 'report'
  | 'access'
  | 'system';

export type AuditLogRecord = {
  id: string;
  actorUid: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  category: AuditLogCategory;
};

export type AuditLogView = {
  scope: 'clinic-wide' | 'own';
  records: AuditLogRecord[];
};
