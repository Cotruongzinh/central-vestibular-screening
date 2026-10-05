import { decryptJson, encryptJson } from '@/lib/crypto';
import { initializeDatabase } from '@/lib/sqlite';
import { ensureDataEncryptionKey } from '@/lib/secure-store';
import {
  countAuditEvents,
  writeAuditEvent,
} from '@/services/audit.service';
import type { LocalFoundationCheck } from '@/types/local-data';

export async function runLocalFoundationCheck(
  actorUid: string,
): Promise<LocalFoundationCheck> {
  const database = await initializeDatabase();
  const key = await ensureDataEncryptionKey();

  const fixture = {
    kind: '02D_SELF_TEST',
    message: 'Kiểm tra mã hóa dữ liệu cục bộ',
    marker: 20260913,
  };

  const encrypted = await encryptJson(fixture);
  const decrypted = await decryptJson<typeof fixture>(encrypted);

  const roundTrip =
    decrypted.kind === fixture.kind &&
    decrypted.message === fixture.message &&
    decrypted.marker === fixture.marker;

  if (!roundTrip) {
    throw new Error('LOCAL_ENCRYPTION_ROUNDTRIP_FAILED');
  }

  await writeAuditEvent({
    actorUid,
    action: 'LOCAL_FOUNDATION_SELF_TEST',
    entityType: 'foundation',
    entityId: '02D',
    metadata: {
      schemaVersion: database.version,
      encryption: 'AES-256-GCM',
      offlineOnly: true,
    },
  });

  const eventCount = await countAuditEvents();

  return {
    ready:
      database.version >= 1 &&
      database.tableCount >= 9 &&
      key.keyBits === 256 &&
      roundTrip,
    database: {
      ready: database.version >= 1 && database.tableCount >= 9,
      name: database.name,
      version: database.version,
      journalMode: database.journalMode,
      tableCount: database.tableCount,
    },
    encryption: {
      ready: key.keyBits === 256 && roundTrip,
      algorithm: 'AES-256-GCM',
      keyStorage: 'SecureStore',
      keyBits: key.keyBits,
      roundTrip,
    },
    audit: {
      ready: eventCount > 0,
      eventCount,
    },
    offline: {
      firebaseRequired: false,
      cloudRequired: false,
    },
  };
}
