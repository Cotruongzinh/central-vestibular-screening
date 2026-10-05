import { randomUUID } from 'expo-crypto';

import { encryptJson } from '@/lib/crypto';
import { getDatabase } from '@/lib/sqlite';

export type AuditEventInput = {
  actorUid?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(
  event: AuditEventInput,
): Promise<string> {
  const db = await getDatabase();
  const id = randomUUID();
  const createdAt = Date.now();
  const encryptedMetadata = event.metadata
    ? await encryptJson(event.metadata)
    : null;

  await db.runAsync(
    `
      INSERT INTO audit_logs (
        id,
        actor_uid,
        action,
        entity_type,
        entity_id,
        encrypted_metadata,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    event.actorUid ?? null,
    event.action,
    event.entityType ?? null,
    event.entityId ?? null,
    encryptedMetadata,
    createdAt,
  );

  return id;
}

export async function countAuditEvents(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM audit_logs',
  );

  return Number(row?.count ?? 0);
}
