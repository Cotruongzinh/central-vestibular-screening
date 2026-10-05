import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import type { AppLanguage } from '@/types/app-language';

const APP_LANGUAGE_KEY = 'app.language';
const DEFAULT_LANGUAGE: AppLanguage = 'vi';

type SettingRow = { value: string };

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === 'en' ? 'en' : 'vi';
}

export async function getAppLanguage(): Promise<AppLanguage> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ? LIMIT 1',
    APP_LANGUAGE_KEY,
  );

  return row ? normalizeLanguage(row.value) : DEFAULT_LANGUAGE;
}

export async function setAppLanguage(
  language: AppLanguage,
  actorUid?: string | null,
): Promise<AppLanguage> {
  await initializeDatabase();
  const db = await getDatabase();
  const normalized = normalizeLanguage(language);
  const now = Date.now();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    APP_LANGUAGE_KEY,
    normalized,
    now,
  );

  if (actorUid) {
    await writeAuditEvent({
      actorUid,
      action: 'settings.language_update',
      entityType: 'app_setting',
      entityId: APP_LANGUAGE_KEY,
      metadata: {
        language: normalized,
        offlineOnly: true,
      },
    });
  }

  return normalized;
}

export function appLanguageLabel(language: AppLanguage): string {
  return language === 'en' ? 'English' : 'Tiếng Việt';
}

export function getAppLanguageErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('no such table')) {
    return 'Không thể mở app_settings local.';
  }
  return 'Không thể đọc hoặc lưu cài đặt ngôn ngữ.';
}
