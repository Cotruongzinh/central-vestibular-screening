import type { AppLanguage } from '@/types/app-language';

export type FeedbackKind = 'feedback' | 'bug';

export type FeedbackDiagnostics = {
  appVersion: string;
  platform: string;
  osVersion: string;
  deviceModel: string;
  executionEnvironment: string;
};

export type FeedbackReportInput = {
  kind: FeedbackKind;
  message: string;
  reproductionSteps?: string;
  includeDiagnostics: boolean;
  language: AppLanguage;
};

export type FeedbackShareInput = FeedbackReportInput & {
  actorUid: string;
};

export type FeedbackShareResult = {
  action: string;
  diagnosticsIncluded: boolean;
};
