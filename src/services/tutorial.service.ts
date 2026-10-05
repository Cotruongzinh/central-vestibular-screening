import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';

const TUTORIAL_COMPLETION_KEY = 'app.tutorial.fr39.version';
const CURRENT_TUTORIAL_VERSION = '1';

type SettingRow = { value: string };

export type TutorialStatus = {
  completed: boolean;
  version: string | null;
};

export async function getTutorialStatus(): Promise<TutorialStatus> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ? LIMIT 1',
    TUTORIAL_COMPLETION_KEY,
  );

  const version = row?.value ?? null;
  return {
    completed: version === CURRENT_TUTORIAL_VERSION,
    version,
  };
}

export async function completeTutorial(actorUid?: string | null): Promise<TutorialStatus> {
  await initializeDatabase();
  const db = await getDatabase();
  const now = Date.now();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    TUTORIAL_COMPLETION_KEY,
    CURRENT_TUTORIAL_VERSION,
    now,
  );

  if (actorUid) {
    await writeAuditEvent({
      actorUid,
      action: 'settings.tutorial_complete',
      entityType: 'app_setting',
      entityId: TUTORIAL_COMPLETION_KEY,
      metadata: {
        tutorialVersion: CURRENT_TUTORIAL_VERSION,
        offlineOnly: true,
      },
    });
  }

  return { completed: true, version: CURRENT_TUTORIAL_VERSION };
}
