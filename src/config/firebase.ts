import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

export type FirebaseConfigStatus = {
  configured: boolean;
  missing: string[];
  projectId: string | null;
};

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const REQUIRED_KEYS: Array<[keyof FirebaseOptions, string]> = [
  ['apiKey', 'EXPO_PUBLIC_FIREBASE_API_KEY'],
  ['authDomain', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'],
  ['storageBucket', 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  ['messagingSenderId', 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  ['appId', 'EXPO_PUBLIC_FIREBASE_APP_ID'],
];

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const missing = REQUIRED_KEYS
    .filter(([key]) => {
      const value = firebaseConfig[key];
      return typeof value !== 'string' || value.trim().length === 0;
    })
    .map(([, envName]) => envName);

  return {
    configured: missing.length === 0,
    missing,
    projectId:
      typeof firebaseConfig.projectId === 'string' && firebaseConfig.projectId.trim().length > 0
        ? firebaseConfig.projectId
        : null,
  };
}

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  const status = getFirebaseConfigStatus();

  if (!status.configured) {
    return null;
  }

  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}
