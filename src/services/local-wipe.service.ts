import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { LAST_ACTIVITY_STORAGE_KEY } from '@/constants/session';
import { DATA_ENCRYPTION_KEY_ALIAS } from '@/constants/storage';
import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { hasPermission } from '@/services/access-control.service';
import { writeAuditEvent } from '@/services/audit.service';
import type { ClinicianAccessContext } from '@/types/access-control';
import type { LocalWipeCounts, LocalWipeResult, LocalWipeSummary } from '@/types/local-wipe';

async function countTable(tableName: string): Promise<number> {
  const db = await getDatabase();
  const exists = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = ?`,
    tableName,
  );
  if (Number(exists?.count ?? 0) < 1) return 0;
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ${tableName}`,
  );
  return Number(row?.count ?? 0);
}

export async function getLocalWipeSummary(): Promise<LocalWipeSummary> {
  await initializeDatabase();

  const counts: LocalWipeCounts = {
    clinicianProfiles: await countTable('clinician_profiles'),
    patients: await countTable('patients'),
    testSessions: await countTable('test_sessions'),
    testResults: await countTable('test_results'),
    eyeTraces: await countTable('eye_traces'),
    clinicianNotes: await countTable('clinician_notes'),
    auditLogs: await countTable('audit_logs'),
    appSettings: await countTable('app_settings'),
    syncQueue: await countTable('sync_queue'),
    aiGroundTruthLabels: await countTable('ai_ground_truth_labels'),
    aiSubjectKeys: await countTable('ai_subject_keys'),
  };

  return {
    counts,
    totalRows: Object.values(counts).reduce((sum, value) => sum + value, 0),
    encryptionKeyWillBeDeleted: true,
    firebaseAccountWillBeDeleted: false,
  };
}

export function canWipeAllLocalData(access: ClinicianAccessContext): boolean {
  return hasPermission(access, 'local.wipe.all');
}

export async function wipeAllLocalDataForSharedDevice(
  access: ClinicianAccessContext,
): Promise<LocalWipeResult> {
  if (!canWipeAllLocalData(access)) {
    throw new Error('LOCAL_WIPE_FORBIDDEN');
  }

  await initializeDatabase();
  const db = await getDatabase();
  const before = await getLocalWipeSummary();

  try {
    await writeAuditEvent({
      actorUid: access.uid,
      action: 'security.local_wipe_requested',
      entityType: 'device_local_store',
      entityId: 'FR-34',
      metadata: {
        role: access.role,
        rowsBeforeWipe: before.totalRows,
        scope: 'all-local-app-data',
      },
    });
  } catch {
    // Wipe is allowed to continue if the pre-wipe audit event cannot be written.
  }

  await db.execAsync('PRAGMA secure_delete = ON; PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_ground_truth_labels (
      id TEXT PRIMARY KEY NOT NULL,
      battery_run_id TEXT UNIQUE NOT NULL,
      clinician_uid TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_subject_keys (
      patient_id TEXT PRIMARY KEY NOT NULL,
      subject_key TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  try {
    await db.execAsync(`
      BEGIN IMMEDIATE;
        DELETE FROM ai_ground_truth_labels;
        DELETE FROM ai_subject_keys;
        DELETE FROM clinician_notes;
        DELETE FROM eye_traces;
        DELETE FROM test_results;
        DELETE FROM test_sessions;
        DELETE FROM patients;
        DELETE FROM audit_logs;
        DELETE FROM sync_queue;
        DELETE FROM clinician_profiles;
        DELETE FROM app_settings;
        DELETE FROM app_meta;
      COMMIT;
    `);
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK;');
    } catch {
      // Ignore rollback errors and surface the original wipe failure.
    }
    throw error;
  }

  // Compact the database file and truncate the WAL after the row wipe.
  await db.execAsync('VACUUM;');
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

  // Cryptographic erasure boundary: encrypted remnants cannot be decrypted after this key is removed.
  await SecureStore.deleteItemAsync(DATA_ENCRYPTION_KEY_ALIAS);
  await AsyncStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);

  return {
    deletedRows: before.totalRows,
    completedAt: Date.now(),
    cryptographicErase: true,
  };
}

export function localWipeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'LOCAL_WIPE_FORBIDDEN':
      return 'Chỉ Admin local mới được phép xóa toàn bộ dữ liệu trên thiết bị.';
    default:
      return 'Không thể hoàn tất local wipe. Dữ liệu chưa được xác nhận là đã xóa hoàn toàn.';
  }
}
