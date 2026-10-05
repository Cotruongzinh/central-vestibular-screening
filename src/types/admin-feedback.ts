import type { AppLanguage } from '@/types/app-language';
import type { FeedbackDiagnostics, FeedbackKind } from '@/types/feedback-report';

export type AdminFeedbackStatus = 'open' | 'in-progress' | 'resolved';

export type AdminFeedbackSubmission = {
  kind: FeedbackKind;
  message: string;
  reproductionSteps?: string;
  includeDiagnostics: boolean;
  diagnostics?: FeedbackDiagnostics;
  language: AppLanguage;
};

export type AdminFeedbackDelivery = {
  delivery: 'sent' | 'queued';
  reportId: string | null;
};

export type AdminFeedbackRecord = {
  id: string;
  kind: FeedbackKind;
  message: string;
  reproductionSteps: string;
  diagnostics: FeedbackDiagnostics | null;
  language: AppLanguage;
  status: AdminFeedbackStatus;
  createdAt: number;
  updatedAt: number;
};
