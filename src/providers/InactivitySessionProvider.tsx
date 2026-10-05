import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, View } from 'react-native';

import {
  ACTIVITY_PERSIST_THROTTLE_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_STORAGE_KEY,
} from '@/constants/session';
import { observeClinicianAuth } from '@/services/firebase/auth.service';
import {
  getRemainingInactivityMs,
  isSessionExpired,
  performInactivityLogout,
  readLastActivityAt,
} from '@/services/session-security.service';
import { setSessionActivityListener } from '@/services/session-activity.service';

export function InactivitySessionProvider({
  children,
}: PropsWithChildren) {
  const recordActivityRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let disposed = false;
    let authenticated = false;
    let expiring = false;
    let lastActivityAt = Date.now();
    let lastPersistedAt = 0;
    let authRevision = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    function clearTimer() {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    }

    async function expireSession() {
      if (disposed || expiring || !authenticated) {
        return;
      }

      expiring = true;
      clearTimer();

      try {
        await performInactivityLogout('timeout');
      } finally {
        expiring = false;
      }
    }

    function scheduleTimer() {
      clearTimer();

      if (disposed || expiring || !authenticated) {
        return;
      }

      const remaining = getRemainingInactivityMs(lastActivityAt);

      if (remaining <= 0) {
        void expireSession();
        return;
      }

      timeoutHandle = setTimeout(() => {
        void expireSession();
      }, remaining);
    }

    function persistActivity(force = false) {
      if (!authenticated) {
        return;
      }

      const now = Date.now();

      if (!force && now - lastPersistedAt < ACTIVITY_PERSIST_THROTTLE_MS) {
        return;
      }

      lastPersistedAt = now;
      void AsyncStorage.setItem(
        LAST_ACTIVITY_STORAGE_KEY,
        String(lastActivityAt),
      );
    }

    function recordActivity() {
      if (disposed || expiring || !authenticated) {
        return;
      }

      lastActivityAt = Date.now();
      scheduleTimer();
      persistActivity(false);
    }

    recordActivityRef.current = recordActivity;
    const removeActivityListener = setSessionActivityListener(recordActivity);

    async function configureForUser(
      user: { emailVerified: boolean } | null,
      revision: number,
    ) {
      clearTimer();
      authenticated = Boolean(user?.emailVerified);

      if (!authenticated) {
        await AsyncStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);

        if (revision === authRevision) {
          lastActivityAt = Date.now();
        }
        return;
      }

      const storedActivity = await readLastActivityAt();

      if (disposed || revision !== authRevision || !authenticated) {
        return;
      }

      if (
        storedActivity !== null &&
        isSessionExpired(storedActivity)
      ) {
        lastActivityAt = storedActivity;
        await expireSession();
        return;
      }

      lastActivityAt = storedActivity ?? Date.now();
      lastPersistedAt = storedActivity ?? 0;

      if (storedActivity === null) {
        persistActivity(true);
      }

      scheduleTimer();
    }

    const unsubscribeAuth = observeClinicianAuth((user) => {
      const revision = ++authRevision;
      void configureForUser(user, revision);
    });

    function handleAppState(nextState: AppStateStatus) {
      if (!authenticated || disposed) {
        return;
      }

      if (nextState === 'active') {
        if (isSessionExpired(lastActivityAt)) {
          void expireSession();
        } else {
          scheduleTimer();
        }
        return;
      }

      persistActivity(true);
      clearTimer();
    }

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppState,
    );

    return () => {
      disposed = true;
      clearTimer();
      unsubscribeAuth();
      removeActivityListener();
      appStateSubscription.remove();
      recordActivityRef.current = () => undefined;
    };
  }, []);

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={() => {
        recordActivityRef.current();
      }}
    >
      {children}
    </View>
  );
}
