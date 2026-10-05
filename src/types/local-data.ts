export type LocalFoundationCheck = {
  ready: boolean;
  database: {
    ready: boolean;
    name: string;
    version: number;
    journalMode: string;
    tableCount: number;
  };
  encryption: {
    ready: boolean;
    algorithm: 'AES-256-GCM';
    keyStorage: 'SecureStore';
    keyBits: number;
    roundTrip: boolean;
  };
  audit: {
    ready: boolean;
    eventCount: number;
  };
  offline: {
    firebaseRequired: false;
    cloudRequired: false;
  };
};
