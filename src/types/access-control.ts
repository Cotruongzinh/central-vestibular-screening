export type ClinicianRole = 'admin' | 'clinician';

export type AppPermission =
  | 'patients.read.own'
  | 'patients.read.all'
  | 'patients.write.own'
  | 'patients.write.all'
  | 'audit.read.own'
  | 'audit.read.all'
  | 'audit.write'
  | 'local.wipe.all';

export type ClinicianRoleAuthority =
  | 'server'
  | 'cached-server'
  | 'safe-fallback'
  | 'legacy-local';

export type ClinicianRoleAssignment =
  | 'server-initial-admin'
  | 'server-admin-assigned'
  | 'server-default-clinician'
  | 'cached-server-role'
  | 'offline-safe-clinician'
  | 'local-bootstrap-admin'
  | 'local-default-clinician';

export type ClinicianAccessContext = {
  uid: string;
  email: string;
  role: ClinicianRole;
  assignment: ClinicianRoleAssignment;
  authority: ClinicianRoleAuthority;
  serverVerifiedAt: number | null;
  permissions: AppPermission[];
  canReadAllPatients: boolean;
  canWriteAllPatients: boolean;
  canReadAllAudit: boolean;
  canWipeAllLocalData: boolean;
};

export type ClinicianRoleProfilePayload = {
  schemaVersion: 1 | 2;
  email: string;
  role: ClinicianRole;
  assignment: ClinicianRoleAssignment;
  authority?: ClinicianRoleAuthority;
  serverVerifiedAt?: number;
  displayName?: string;
  specialty?: string;
  facility?: string;
  clinicLogoUri?: string;
};

export type ServerRoleSource =
  | 'initial-admin'
  | 'admin-assigned'
  | 'default-clinician';

export type ServerAccessSnapshot = {
  uid: string;
  email: string;
  role: ClinicianRole;
  source: ServerRoleSource;
  verifiedAt: number;
};

export type ServerClinicUser = {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  disabled: boolean;
  role: ClinicianRole;
  roleSource: ServerRoleSource;
  createdAt: string;
  lastSignInAt: string;
  isCurrentUser: boolean;
};
