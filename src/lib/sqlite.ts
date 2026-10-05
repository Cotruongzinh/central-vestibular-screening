import * as SQLite from 'expo-sqlite';

import {
  LOCAL_DATABASE_NAME,
  LOCAL_DATABASE_VERSION,
} from '@/constants/storage';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrateToV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clinician_profiles (
      id TEXT PRIMARY KEY NOT NULL,
      firebase_uid TEXT UNIQUE NOT NULL,
      encrypted_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY NOT NULL,
      clinician_uid TEXT NOT NULL,
      patient_code TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      encrypted_payload TEXT NOT NULL,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patients_clinician_deleted
      ON patients(clinician_uid, deleted_at);

    CREATE INDEX IF NOT EXISTS idx_patients_code
      ON patients(patient_code);

    CREATE TABLE IF NOT EXISTS test_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT,
      clinician_uid TEXT NOT NULL,
      test_type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      encrypted_payload TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_patient
      ON test_sessions(patient_id, created_at);

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS eye_traces (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      axis TEXT,
      sample_count INTEGER NOT NULL DEFAULT 0,
      encrypted_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES test_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clinician_notes (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT,
      session_id TEXT,
      clinician_uid TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id),
      FOREIGN KEY(session_id) REFERENCES test_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      actor_uid TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      encrypted_metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_created
      ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      encrypted_payload TEXT,
      created_at INTEGER NOT NULL,
      attempted_at INTEGER
    );

    PRAGMA user_version = 1;
  `);
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(LOCAL_DATABASE_NAME);
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<{
  name: string;
  version: number;
  journalMode: string;
  tableCount: number;
}> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );

  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await migrateToV1(db);
  }

  const finalVersionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );

  const journalRow = await db.getFirstAsync<{ journal_mode: string }>(
    'PRAGMA journal_mode',
  );

  const tableRow = await db.getFirstAsync<{ count: number }>(
    `
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
    `,
  );

  return {
    name: LOCAL_DATABASE_NAME,
    version: finalVersionRow?.user_version ?? LOCAL_DATABASE_VERSION,
    journalMode: String(journalRow?.journal_mode ?? 'unknown').toUpperCase(),
    tableCount: Number(tableRow?.count ?? 0),
  };
}
