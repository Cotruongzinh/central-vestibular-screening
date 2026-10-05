import type { Href } from 'expo-router';

function href(value: string): Href {
  return value as unknown as Href;
}

export const SESSION_HREF = href('/auth/session');
export const SESSION_SECURITY_HREF = href('/foundation/session-security');
export const ACCESS_CONTROL_HREF = href('/foundation/access-control');
export const AUDIT_LOG_HREF = href('/foundation/audit-log');

export const LOCAL_WIPE_HREF = href('/foundation/local-wipe');
export const TRAINING_MODE_HREF = href('/foundation/training-mode');

export const CLINICIAN_PROFILE_HREF = href('/foundation/clinician-profile');

export const LANGUAGE_SETTINGS_HREF = href('/foundation/language');

export const NORMATIVE_REFERENCE_HREF = href('/foundation/normative-reference');

export const TUTORIAL_HREF = href('/foundation/tutorial');

export const OFFLINE_MODE_HREF = href('/foundation/offline-mode');

export const FEEDBACK_REPORT_HREF = href('/foundation/feedback-report');

export const USER_MANAGEMENT_HREF = href('/foundation/user-management');

export const ADMIN_FEEDBACK_INBOX_HREF = href('/foundation/admin-feedback-inbox');
