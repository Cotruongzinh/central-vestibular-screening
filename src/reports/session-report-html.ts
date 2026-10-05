import { getClinicalTest, isClinicalTestId } from '@/constants/clinical-tests';
import { getLocalizedClinicalTest } from '@/i18n/clinical-test-copy';
import { translateUiText } from '@/i18n/global-ui-copy';
import type { AppLanguage } from '@/types/app-language';
import type { EyeTraceSample } from '@/types/test-runtime';
import type { SessionReportBundle } from '@/types/report';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(timestamp: number, language: AppLanguage): string {
  return new Date(timestamp).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN');
}

function formatDuration(milliseconds: number, language: AppLanguage): string {
  return language === 'en'
    ? `${(milliseconds / 1000).toFixed(1)} sec`
    : `${(milliseconds / 1000).toFixed(1)} giây`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function sexLabel(value: string, language: AppLanguage): string {
  const vi = value === 'female' ? 'Nữ' : value === 'male' ? 'Nam' : value === 'other' ? 'Khác' : 'Không khai báo';
  return translateUiText(language, vi);
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function downsample<T>(items: T[], maxPoints = 180): T[] {
  if (items.length <= maxPoints) return items;
  const step = Math.ceil(items.length / maxPoints);
  return items.filter((_, index) => index % step === 0);
}

function seriesValues(
  samples: EyeTraceSample[],
  axis: 'x' | 'y',
  kind: 'gaze' | 'expected',
): Array<{ t: number; value: number }> {
  const start = samples[0]?.elapsedMs ?? 0;
  const values = samples.flatMap((sample) => {
    const raw = axis === 'x'
      ? kind === 'gaze' ? sample.gazeX : sample.expectedX
      : kind === 'gaze' ? sample.gazeY : sample.expectedY;
    if (!finite(raw)) return [];
    return [{ t: sample.elapsedMs - start, value: raw }];
  });
  return downsample(values);
}

function polyline(
  values: Array<{ t: number; value: number }>,
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  maxTime: number,
): string {
  const safeTime = Math.max(1, maxTime);
  const span = Math.max(0.001, maxValue - minValue);
  const paddingX = 16;
  const paddingY = 14;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  return values
    .map(({ t, value }) => {
      const x = paddingX + (Math.max(0, t) / safeTime) * plotWidth;
      const y = paddingY + (1 - (value - minValue) / span) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildAxisChart(samples: EyeTraceSample[], axis: 'x' | 'y', language: AppLanguage): string {
  const gaze = seriesValues(samples, axis, 'gaze');
  const expected = seriesValues(samples, axis, 'expected');
  const all = [...gaze, ...expected];
  const t = (vi: string, en: string) => language === 'en' ? en : vi;

  if (all.length < 2) {
    return `<div class="chart-empty">${t(`Không đủ dữ liệu ${axis.toUpperCase()} để vẽ đường theo dõi.`, `Not enough ${axis.toUpperCase()} data to draw the tracking trace.`)}</div>`;
  }

  const rawValues = all.map((point) => point.value);
  const minValue = Math.min(0, ...rawValues);
  const maxValue = Math.max(1, ...rawValues);
  const maxTime = Math.max(...all.map((point) => point.t), 1);
  const width = 720;
  const height = 210;
  const gazePoints = polyline(gaze, width, height, minValue, maxValue, maxTime);
  const expectedPoints = polyline(expected, width, height, minValue, maxValue, maxTime);

  return `
    <div class="chart-card">
      <div class="chart-title">${t(`Dữ liệu chuyển động mắt theo trục ${axis.toUpperCase()}`, `Eye-movement trace on the ${axis.toUpperCase()} axis`)}</div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="210" role="img">
        <line x1="16" y1="${height / 2}" x2="${width - 16}" y2="${height / 2}" stroke="#D8E4EA" stroke-width="1"/>
        <polyline points="${expectedPoints}" fill="none" stroke="#0A78B8" stroke-width="3" stroke-dasharray="8 6"/>
        <polyline points="${gazePoints}" fill="none" stroke="#15324A" stroke-width="3"/>
      </svg>
      <div class="legend">
        <span><i class="legend-gaze"></i>${t('Hướng nhìn đã ánh xạ', 'Mapped gaze')}</span>
        <span><i class="legend-target"></i>${t('Vị trí mục tiêu', 'Target position')}</span>
      </div>
    </div>`;
}

export function buildSessionReportHtml(bundle: SessionReportBundle, language: AppLanguage = 'vi'): string {
  const {
    patient,
    session,
    trace,
    clinicianEmail,
    clinicianProfile,
    clinicianLogoDataUri,
    clinicianNote,
    deviceModel,
  } = bundle;
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const test = isClinicalTestId(session.testId) ? getClinicalTest(session.testId) : undefined;
  const testName = test ? getLocalizedClinicalTest(test, language).name : session.testId;
  const patientName = patient.isAnonymous
    ? t('Ca ẩn danh', 'Anonymous case')
    : patient.payload.fullName || t('Không có tên', 'No name');
  const externalId = patient.payload.patientId || t('Không có', 'None');
  const sessionNote = clinicianNote?.text || t('Chưa có ghi chú cho phiên kiểm tra này.', 'No clinician note has been added for this session.');
  const patientNotes = patient.payload.clinicalNotes || t('Chưa có ghi chú hồ sơ.', 'No patient-record notes.');
  const metricRows = session.result.details.map((item) => `
    <tr>
      <td>${escapeHtml(translateUiText(language, item.label))}</td>
      <td class="value">${escapeHtml(translateUiText(language, item.value))}</td>
    </tr>`).join('');
  const quality = session.result.quality;
  const clinicianName =
    clinicianProfile?.displayName.trim() ||
    clinicianEmail ||
    t('Tài khoản đã xác minh', 'Verified account');
  const clinicianMeta = [
    clinicianProfile?.specialty.trim(),
    clinicianProfile?.facility.trim(),
  ].filter(Boolean).join(' · ');
  const reportLogo = clinicianLogoDataUri
    ? `<div class="logo logo-image"><img src="${escapeHtml(clinicianLogoDataUri)}" alt="Clinic logo" /></div>`
    : '<div class="logo">+</div>';

  return `
<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @page { margin: 28px; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; color: #15324A; background: #FFFFFF; font-size: 13px; line-height: 1.5; }
  .header { padding: 22px 24px; border-radius: 18px; color: #FFFFFF; background: #0A78B8; display: flex; align-items: center; gap: 16px; }
  .logo { width: 58px; height: 58px; border-radius: 16px; background: #FFFFFF; color: #B63845; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: 900; overflow: hidden; flex: 0 0 58px; }\n  .logo-image img { width: 100%; height: 100%; object-fit: contain; background: #FFFFFF; }
  .brand { font-size: 11px; letter-spacing: 1.7px; font-weight: 800; opacity: .9; }
  .title { margin-top: 3px; font-size: 25px; font-weight: 900; }
  .subtitle { margin-top: 2px; color: #E8F5FB; }
  .section { margin-top: 20px; }
  .section-title { font-size: 17px; font-weight: 900; margin-bottom: 9px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 1px solid #D8E4EA; border-radius: 14px; background: #F8FBFC; padding: 13px 15px; }
  .label { color: #6F8493; font-size: 11px; font-weight: 700; }
  .strong { margin-top: 3px; font-weight: 800; }
  .headline { margin-top: 18px; border: 1px solid #B6E1C7; background: #F1FBF5; border-radius: 16px; padding: 17px; }
  .headline-label { color: #209653; font-size: 11px; letter-spacing: 1px; font-weight: 900; text-transform: uppercase; }
  .headline-value { margin-top: 5px; font-size: 34px; font-weight: 900; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #D8E4EA; border-radius: 12px; overflow: hidden; }
  td { padding: 9px 11px; border-bottom: 1px solid #D8E4EA; }
  tr:last-child td { border-bottom: none; }
  td.value { font-weight: 800; text-align: right; }
  .quality-line { margin-top: 6px; }
  .chart-card { margin-top: 10px; border: 1px solid #D8E4EA; border-radius: 14px; padding: 12px; page-break-inside: avoid; }
  .chart-title { font-weight: 900; margin-bottom: 4px; }
  .legend { display: flex; gap: 16px; color: #6F8493; font-size: 11px; }
  .legend i { display: inline-block; width: 18px; height: 3px; margin-right: 5px; vertical-align: middle; }
  .legend-gaze { background: #15324A; }
  .legend-target { background: #0A78B8; }
  .chart-empty { margin-top: 10px; padding: 18px; border-radius: 12px; background: #F8FBFC; color: #6F8493; }
  .note { white-space: pre-wrap; min-height: 54px; }
  .warning { margin-top: 20px; padding: 13px 15px; border: 1px solid #F0CBC5; background: #FFF6F4; border-radius: 14px; color: #7E5554; }
  .warning strong { color: #B63845; }
  .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #D8E4EA; color: #6F8493; font-size: 10.5px; }
</style>
</head>
<body>
  <div class="header">
    ${reportLogo}
    <div>
      <div class="brand">CENTRAL VESTIBULAR SCREENING</div>
      <div class="title">${t('Báo cáo sàng lọc kỹ thuật', 'Technical screening report')}</div>
      <div class="subtitle">${clinicianMeta ? `${escapeHtml(clinicianMeta)} · ` : ''}${t('Báo cáo sàng lọc chuyển động mắt', 'Eye-movement screening report')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t('Thông tin hồ sơ', 'Patient record')}</div>
    <div class="grid">
      <div class="card"><div class="label">${t('Bệnh nhân', 'Patient')}</div><div class="strong">${escapeHtml(patientName)}</div></div>
      <div class="card"><div class="label">${t('Mã hồ sơ', 'Local record code')}</div><div class="strong">${escapeHtml(patient.localCode)}</div></div>
      <div class="card"><div class="label">${t('ID bệnh nhân', 'Patient ID')}</div><div class="strong">${escapeHtml(externalId)}</div></div>
      <div class="card"><div class="label">${t('Ngày sinh / giới tính', 'Date of birth / sex')}</div><div class="strong">${escapeHtml(patient.payload.dateOfBirth || t('Không có', 'None'))} · ${escapeHtml(sexLabel(patient.payload.sex, language))}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t('Thông tin phiên kiểm tra', 'Test session')}</div>
    <div class="grid">
      <div class="card"><div class="label">${t('Bài kiểm tra', 'Test')}</div><div class="strong">${escapeHtml(testName)}</div></div>
      <div class="card"><div class="label">${t('Hoàn tất', 'Completed')}</div><div class="strong">${escapeHtml(formatDate(session.completedAt, language))}</div></div>
      <div class="card"><div class="label">${t('Thời lượng ghi nhận', 'Recorded duration')}</div><div class="strong">${escapeHtml(formatDuration(trace.activeDurationMs, language))}</div></div>
      <div class="card"><div class="label">${t('Thiết bị', 'Device')}</div><div class="strong">${escapeHtml(deviceModel)}</div></div>
      <div class="card"><div class="label">${t('Chuyên viên lâm sàng', 'Clinician')}</div><div class="strong">${escapeHtml(clinicianName)}</div></div>
      <div class="card"><div class="label">${t('Mã phiên', 'Session ID')}</div><div class="strong">${escapeHtml(session.id)}</div></div>
    </div>
  </div>

  <div class="headline">
    <div class="headline-label">${escapeHtml(translateUiText(language, session.result.headlineLabel))}</div>
    <div class="headline-value">${escapeHtml(session.result.headlineValue)}</div>
    <div>${t('Kết quả kỹ thuật tổng hợp · không tự gán nhãn bình thường/bất thường.', 'Technical summary only · no automatic normal/abnormal classification.')}</div>
  </div>

  <div class="section">
    <div class="section-title">${t('Các chỉ số đã tính', 'Calculated metrics')}</div>
    <table>${metricRows}</table>
  </div>

  <div class="section">
    <div class="section-title">${t('Chất lượng theo dõi', 'Tracking quality')}</div>
    <div class="card">
      <div class="quality-line"><strong>${t('Tín hiệu sử dụng được:', 'Usable signal:')}</strong> ${escapeHtml(percent(quality.usableRatio))} · ${quality.usableSamples}/${quality.totalSamples}</div>
      <div class="quality-line"><strong>${t('Tỷ lệ theo dõi tốt:', 'Good-tracking ratio:')}</strong> ${escapeHtml(percent(quality.greenRatio))}</div>
      <div class="quality-line"><strong>${t('Tốt / Cần chú ý / Không đạt:', 'Good / Caution / Poor:')}</strong> ${quality.qualityCounts.green} / ${quality.qualityCounts.yellow} / ${quality.qualityCounts.red}</div>
      <div class="quality-line"><strong>${t('Dữ liệu theo dõi mắt đã lưu:', 'Saved eye-tracking data:')}</strong> ${session.traceSampleCount} ${t('mẫu đã mã hóa', 'encrypted samples')}</div>
      <div class="quality-line"><strong>${t('FPS theo dõi trung vị:', 'Median tracking FPS:')}</strong> ${quality.medianTrackingFps === null ? 'N/A' : quality.medianTrackingFps.toFixed(1)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t('Biểu đồ chuyển động mắt', 'Eye-movement charts')}</div>
    ${buildAxisChart(trace.samples, 'x', language)}
    ${buildAxisChart(trace.samples, 'y', language)}
  </div>

  <div class="section">
    <div class="section-title">${t('Ghi chú của chuyên viên cho phiên này', 'Clinician note for this session')}</div>
    <div class="card note">${escapeHtml(sessionNote)}</div>
  </div>

  <div class="section">
    <div class="section-title">${t('Ghi chú hồ sơ bệnh nhân', 'Patient-record notes')}</div>
    <div class="card note">${escapeHtml(patientNotes)}</div>
  </div>

  <div class="warning">
    <strong>${t('Lưu ý:', 'Important:')}</strong> ${t(
      'Báo cáo này hỗ trợ sàng lọc. Kết quả chỉ số, đối chiếu tham chiếu và phân loại hỗ trợ không thay thế đánh giá lâm sàng.',
      'This report supports screening. Metrics, reference comparisons, and assistive classification do not replace clinical assessment.',
    )}
  </div>

  <div class="footer">${t(
    'Video camera gốc không được đưa vào báo cáo. Báo cáo được tạo trực tiếp trên thiết bị từ dữ liệu phiên, các chỉ số và dữ liệu theo dõi mắt đã lưu.',
    'Raw camera video is not included. This report is generated on-device from the saved session, technical metrics, and eye-tracking data.',
  )}</div>
</body>
</html>`;
}
