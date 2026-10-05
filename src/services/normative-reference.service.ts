import { getDatabase, initializeDatabase } from '@/lib/sqlite';
import { writeAuditEvent } from '@/services/audit.service';
import {
  DEFAULT_NORMATIVE_REFERENCE_POPULATION,
  isNormativeReferencePopulationId,
  type NormativeReferencePopulationId,
  type NormativeReferenceSetting,
} from '@/types/normative-reference';

const NORMATIVE_REFERENCE_KEY = 'normative.reference_population';

type SettingRow = { value: string };

function normalizePopulation(
  value: string | null | undefined,
): NormativeReferencePopulationId {
  return isNormativeReferencePopulationId(value)
    ? value
    : DEFAULT_NORMATIVE_REFERENCE_POPULATION;
}

export async function getNormativeReferenceSetting(): Promise<NormativeReferenceSetting> {
  await initializeDatabase();
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ? LIMIT 1',
    NORMATIVE_REFERENCE_KEY,
  );

  return {
    populationId: normalizePopulation(row?.value),
    source: row ? 'stored' : 'default',
    thresholdsActive: normalizePopulation(row?.value) === 'adult_western',
  };
}

export async function setNormativeReferencePopulation(
  populationId: NormativeReferencePopulationId,
  actorUid?: string | null,
): Promise<NormativeReferenceSetting> {
  await initializeDatabase();
  const db = await getDatabase();
  const normalized = normalizePopulation(populationId);
  const now = Date.now();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    NORMATIVE_REFERENCE_KEY,
    normalized,
    now,
  );

  if (actorUid) {
    await writeAuditEvent({
      actorUid,
      action: 'settings.normative_reference_update',
      entityType: 'app_setting',
      entityId: NORMATIVE_REFERENCE_KEY,
      metadata: {
        populationId: normalized,
        thresholdsActive: normalized === 'adult_western',
        offlineOnly: true,
        phase: '03Y',
      },
    });
  }

  return {
    populationId: normalized,
    source: 'stored',
    thresholdsActive: normalized === 'adult_western',
  };
}
