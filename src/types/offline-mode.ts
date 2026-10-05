export type OfflineTrackerTransport = 'expo-go-metro' | 'packaged-asset' | 'unknown';

export type OfflineModeCheck = {
  ready: boolean;
  checkedAt: number;
  session: {
    ready: boolean;
    emailVerified: boolean;
    persistence: 'firebase-auth-local-persistence';
    liveNetworkRequiredForCurrentSession: false;
  };
  database: {
    ready: boolean;
    version: number;
    tableCount: number;
    journalMode: string;
    probePassed: boolean;
  };
  encryption: {
    ready: boolean;
    algorithm: 'AES-256-GCM';
    keyStorage: 'SecureStore';
    keyBits: number;
  };
  tracker: {
    ready: boolean;
    source: 'bundled-module';
    transport: OfflineTrackerTransport;
    assetUriScheme: string;
    externalCdnRequired: false;
  };
  core: {
    patientRecords: 'local-sqlite';
    testResults: 'local-sqlite';
    technicalMetrics: 'on-device';
    reportGeneration: 'local-pdf';
    cloudRequired: false;
  };
};
