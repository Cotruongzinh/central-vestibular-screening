import type { ClinicianRole, ClinicianRoleAssignment } from '@/types/access-control';

export type ClinicianProfileInput = {
  displayName: string;
  specialty: string;
  facility: string;
  clinicLogoUri: string;
};

export type ClinicianProfileView = ClinicianProfileInput & {
  uid: string;
  email: string;
  role: ClinicianRole;
  assignment: ClinicianRoleAssignment;
  updatedAt: number;
};
