export type LocalWipeCounts = {
  clinicianProfiles: number;
  patients: number;
  testSessions: number;
  testResults: number;
  eyeTraces: number;
  clinicianNotes: number;
  auditLogs: number;
  appSettings: number;
  syncQueue: number;
  aiGroundTruthLabels: number;
  aiSubjectKeys: number;
};

export type LocalWipeSummary = {
  counts: LocalWipeCounts;
  totalRows: number;
  encryptionKeyWillBeDeleted: true;
  firebaseAccountWillBeDeleted: false;
};

export type LocalWipeResult = {
  deletedRows: number;
  completedAt: number;
  cryptographicErase: true;
};
