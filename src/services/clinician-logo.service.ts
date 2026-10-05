import * as FileSystem from 'expo-file-system/legacy';

const LOGO_DIRECTORY_NAME = 'clinician-logos';
const MAX_LOGO_BYTES = 6 * 1024 * 1024;

function requireDocumentDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('CLINICIAN_LOGO_STORAGE_UNAVAILABLE');
  }
  return FileSystem.documentDirectory;
}

function sanitizeUid(uid: string): string {
  return uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'clinician';
}

function inferExtension(input: {
  fileName?: string | null;
  mimeType?: string | null;
}): string {
  const fromName = input.fileName?.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }

  switch (input.mimeType?.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}

function logoDirectoryUri(): string {
  return `${requireDocumentDirectory()}${LOGO_DIRECTORY_NAME}`;
}

export function isManagedClinicianLogoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed || !FileSystem.documentDirectory) return false;
  return trimmed.startsWith(`${FileSystem.documentDirectory}${LOGO_DIRECTORY_NAME}/`);
}

export async function persistClinicianLogo(input: {
  sourceUri: string;
  clinicianUid: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}): Promise<string> {
  if (!input.sourceUri.trim()) {
    throw new Error('CLINICIAN_LOGO_SOURCE_MISSING');
  }

  if (
    typeof input.fileSize === 'number' &&
    Number.isFinite(input.fileSize) &&
    input.fileSize > MAX_LOGO_BYTES
  ) {
    throw new Error('CLINICIAN_LOGO_TOO_LARGE');
  }

  const directory = logoDirectoryUri();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const extension = inferExtension(input);
  const destination =
    `${directory}/${sanitizeUid(input.clinicianUid)}-${Date.now()}.${extension}`;

  await FileSystem.copyAsync({
    from: input.sourceUri,
    to: destination,
  });

  return destination;
}

export async function removeManagedClinicianLogo(uri: string): Promise<void> {
  if (!isManagedClinicianLogoUri(uri)) return;

  await FileSystem.deleteAsync(uri, {
    idempotent: true,
  });
}

export function getClinicianLogoErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'CLINICIAN_LOGO_TOO_LARGE':
      return 'Ảnh logo quá lớn. Hãy chọn ảnh nhỏ hơn 6 MB.';
    case 'CLINICIAN_LOGO_STORAGE_UNAVAILABLE':
      return 'Thiết bị chưa sẵn sàng để lưu logo.';
    case 'CLINICIAN_LOGO_SOURCE_MISSING':
      return 'Không nhận được ảnh logo đã chọn.';
    default:
      return 'Không thể lưu ảnh logo. Hãy thử chọn ảnh khác.';
  }
}
