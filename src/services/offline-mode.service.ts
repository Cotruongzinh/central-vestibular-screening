import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { ensureDataEncryptionKey } from '@/lib/secure-store';
import { writeAuditEvent } from '@/services/audit.service';
import { getTrackerAssetTransportDescriptor } from '@/tracking/calibration/createCalibrationTrackerHtml';
import type { OfflineModeCheck } from '@/types/offline-mode';

export async function runOfflineModeCheck(input: {
  actorUid: string;
  emailVerified: boolean;
}): Promise<OfflineModeCheck> {
  const [database, key] = await Promise.all([
    initializeDatabase(),
    ensureDataEncryptionKey(),
  ]);

  const db = await getDatabase();
  const probe = await db.getFirstAsync<{ value: number }>('SELECT 1 AS value');
  const tracker = getTrackerAssetTransportDescriptor();

  const databaseReady =
    database.version >= 1 &&
    database.tableCount >= 9 &&
    Number(probe?.value ?? 0) === 1;
  const encryptionReady = key.keyBits === 256;
  const sessionReady = input.emailVerified;
  const trackerReady = tracker.assetUriPresent && tracker.source === 'bundled-module';

  const result: OfflineModeCheck = {
    ready: databaseReady && encryptionReady && sessionReady && trackerReady,
    checkedAt: Date.now(),
    session: {
      ready: sessionReady,
      emailVerified: input.emailVerified,
      persistence: 'firebase-auth-local-persistence',
      liveNetworkRequiredForCurrentSession: false,
    },
    database: {
      ready: databaseReady,
      version: database.version,
      tableCount: database.tableCount,
      journalMode: database.journalMode,
      probePassed: Number(probe?.value ?? 0) === 1,
    },
    encryption: {
      ready: encryptionReady,
      algorithm: 'AES-256-GCM',
      keyStorage: 'SecureStore',
      keyBits: key.keyBits,
    },
    tracker: {
      ready: trackerReady,
      source: 'bundled-module',
      transport: tracker.transport,
      assetUriScheme: tracker.assetUriScheme,
      externalCdnRequired: false,
    },
    core: {
      patientRecords: 'local-sqlite',
      testResults: 'local-sqlite',
      technicalMetrics: 'on-device',
      reportGeneration: 'local-pdf',
      cloudRequired: false,
    },
  };

  await writeAuditEvent({
    actorUid: input.actorUid,
    action: 'system.offline_readiness_check',
    entityType: 'foundation',
    entityId: 'FR-42',
    metadata: {
      ready: result.ready,
      databaseReady,
      encryptionReady,
      sessionReady,
      trackerReady,
      trackerTransport: result.tracker.transport,
      cloudRequired: false,
    },
  });

  return result;
}
