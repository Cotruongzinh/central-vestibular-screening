import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
} from '@/constants/session';
import { initializeDatabase } from '@/lib/sqlite';
import {
  getCurrentClinician,
  signOutClinician,
} from '@/services/firebase/auth.service';
import { writeAuditEvent } from '@/services/audit.service';

export type InactivityLogoutReason = 'timeout' | 'acceptance-test';

export function isSessionExpired(
  lastActivityAt: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(lastActivityAt) || lastActivityAt <= 0) {
    return false;
  }

  return now - lastActivityAt >= INACTIVITY_TIMEOUT_MS;
}

export function getRemainingInactivityMs(
  lastActivityAt: number,
  now = Date.now(),
): number {
  return Math.max(0, INACTIVITY_TIMEOUT_MS - (now - lastActivityAt));
}

export async function readLastActivityAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function persistLastActivityAt(timestamp: number): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(timestamp));
}

export async function clearLastActivityAt(): Promise<void> {
  await AsyncStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
}

export async function performInactivityLogout(
  reason: InactivityLogoutReason,
): Promise<void> {
  const user = getCurrentClinician();

  if (user) {
    try {
      await initializeDatabase();
      await writeAuditEvent({
        actorUid: user.uid,
        action:
          reason === 'timeout'
            ? 'auth.inactivity_logout'
            : 'auth.inactivity_logout_acceptance_test',
        entityType: 'clinician_session',
        entityId: user.uid,
        metadata: {
          timeoutMinutes: INACTIVITY_TIMEOUT_MS / 60_000,
          reason,
        },
      });
    } catch {
      // Logout must not be blocked if local audit storage is unavailable.
    }
  }

  await clearLastActivityAt();

  if (user) {
    await signOutClinician();
  }

  router.replace({
    pathname: '/auth/login',
    params: {
      reason: reason === 'timeout' ? 'inactivity' : 'inactivity-test',
    },
  });
}
