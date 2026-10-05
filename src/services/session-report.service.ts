import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildSessionReportHtml } from '@/reports/session-report-html';
import { writeAuditEvent } from '@/services/audit.service';
import type { AppLanguage } from '@/types/app-language';
import type { SessionReportBundle } from '@/types/report';

export function getReportDeviceModel(): string {
  return Device.modelName ?? 'iOS device';
}

function logoMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

async function withEmbeddedClinicianLogo(
  bundle: SessionReportBundle,
): Promise<SessionReportBundle> {
  const uri = bundle.clinicianProfile?.clinicLogoUri.trim() ?? '';
  if (!uri.startsWith('file://')) return bundle;

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return bundle;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      ...bundle,
      clinicianLogoDataUri: `data:${logoMimeType(uri)};base64,${base64}`,
    };
  } catch {
    return bundle;
  }
}

export async function createSessionReportPdf(
  bundle: SessionReportBundle,
  language: AppLanguage = 'vi',
): Promise<string> {
  const printableBundle = await withEmbeddedClinicianLogo(bundle);
  const html = buildSessionReportHtml(printableBundle, language);
  const result = await Print.printToFileAsync({ html });

  await writeAuditEvent({
    actorUid: bundle.session.clinicianUid,
    action: 'report.pdf.generate',
    entityType: 'test_session',
    entityId: bundle.session.id,
    metadata: {
      patientId: bundle.patient.id,
      testId: bundle.session.testId,
      localOnly: true,
      includesRawVideo: false,
      includesClinicLogo: Boolean(printableBundle.clinicianLogoDataUri),
    },
  });

  return result.uri;
}

export async function shareSessionReportPdf(input: {
  bundle: SessionReportBundle;
  uri: string;
  language?: AppLanguage;
}): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('REPORT_SHARING_UNAVAILABLE');
  }

  await Sharing.shareAsync(input.uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
    dialogTitle: input.language === 'en' ? 'Share PDF report' : 'Chia sẻ báo cáo PDF',
  });

  await writeAuditEvent({
    actorUid: input.bundle.session.clinicianUid,
    action: 'report.pdf.share',
    entityType: 'test_session',
    entityId: input.bundle.session.id,
    metadata: {
      patientId: input.bundle.patient.id,
      testId: input.bundle.session.testId,
      rawVideoShared: false,
    },
  });
}

export function getReportErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';

  if (message === 'REPORT_SHARING_UNAVAILABLE') {
    return 'Thiết bị hiện không mở được iOS share sheet.';
  }

  return 'Không thể tạo/chia sẻ báo cáo PDF. Hãy thử lại.';
}
