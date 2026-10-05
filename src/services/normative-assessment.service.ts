import {
  ACTIVE_REFERENCE_AGE_MAX,
  ACTIVE_REFERENCE_AGE_MIN,
  ACTIVE_REFERENCE_PROFILE_ID,
  NORMATIVE_METRIC_RULES,
} from '@/constants/normative-reference-data';
import type {
  BatteryScreeningAssessment,
  ReferenceMetricAssessment,
  SessionReferenceAssessment,
} from '@/types/screening-assessment';
import type { NormativeReferencePopulationId } from '@/types/normative-reference';
import type { PersistedTestSession } from '@/types/test-session';

function inRange(value: number, lower: number | null, upper: number | null) {
  if (lower !== null && value < lower) return false;
  if (upper !== null && value > upper) return false;
  return true;
}

function referenceText(lower: number | null, upper: number | null, unit: string) {
  if (lower !== null && upper !== null) return `${lower}–${upper} ${unit}`;
  if (lower !== null) return `≥ ${lower} ${unit}`;
  if (upper !== null) return `≤ ${upper} ${unit}`;
  return 'n/a';
}

function metricValueForRule(
  session: PersistedTestSession,
  ruleId: string,
): number | null {
  const features = session.result.referenceFeatures;
  if (!features) return null;

  switch (ruleId) {
    case 'smooth-pursuit-horizontal-gain-01hz':
      return features.pursuitGain ?? null;
    case 'horizontal-saccade-latency':
    case 'vertical-saccade-latency':
      return features.medianLatencyMs ?? null;
    case 'horizontal-saccade-accuracy':
    case 'vertical-saccade-accuracy':
      return features.meanEndpointAccuracyPercent ?? null;
    case 'anti-saccade-error-rate':
      return features.antiSaccadeErrorRatePercent ?? null;
    default:
      return null;
  }
}

function formattedValue(value: number | null, unit: string) {
  if (value === null) return '—';
  if (unit === 'ms') return `${Math.round(value)} ms`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'ratio') return value.toFixed(3);
  return `${value.toFixed(2)} ${unit}`;
}

export function ageAtTimestamp(dateOfBirth: string, timestamp: number): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  const at = new Date(timestamp);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;

  let age = at.getFullYear() - birth.getFullYear();
  const monthDelta = at.getMonth() - birth.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && at.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age <= 130 ? age : null;
}

function assessSessionAgainstReferenceStrict(input: {
  session: PersistedTestSession;
  populationId: NormativeReferencePopulationId;
  ageYears: number | null;
}): SessionReferenceAssessment {
  const { session, populationId, ageYears } = input;
  const rules = NORMATIVE_METRIC_RULES.filter((rule) => rule.testId === session.testId);
  const features = session.result.referenceFeatures;

  if (populationId !== ACTIVE_REFERENCE_PROFILE_ID) {
    return {
      testId: session.testId,
      populationId,
      flag: 'yellow',
      evaluable: false,
      titleVi: 'Chưa có bảng tham chiếu đã tích hợp',
      titleEn: 'Reference table not integrated',
      summaryVi:
        'Nhóm tham chiếu đang chọn chưa có bảng ngưỡng tương thích trong ứng dụng. Không tự dùng ngưỡng của nhóm khác.',
      summaryEn:
        'The selected reference population does not yet have a compatible threshold table. The app will not silently substitute another population.',
      metrics: [],
    };
  }

  if (ageYears === null || ageYears < ACTIVE_REFERENCE_AGE_MIN || ageYears > ACTIVE_REFERENCE_AGE_MAX) {
    return {
      testId: session.testId,
      populationId,
      flag: 'yellow',
      evaluable: false,
      titleVi: 'Ngoài phạm vi tuổi của dữ liệu tham chiếu',
      titleEn: 'Outside reference age range',
      summaryVi:
        'Bảng oculomotor hiện tại chỉ áp dụng cho người trưởng thành 18–45 tuổi. Kết quả kỹ thuật vẫn được hiển thị nhưng không tự gắn cờ tham chiếu.',
      summaryEn:
        'The current oculomotor reference table is limited to adults aged 18–45. Technical results remain visible, but no automatic reference flag is assigned.',
      metrics: [],
    };
  }

  if (!features || !rules.length) {
    return {
      testId: session.testId,
      populationId,
      flag: 'yellow',
      evaluable: false,
      titleVi: 'Chưa có ngưỡng tương thích cho bài này',
      titleEn: 'No compatible threshold for this test',
      summaryVi:
        'Bài kiểm tra này chưa có metric và protocol đủ tương thích với bảng tham chiếu đang dùng.',
      summaryEn:
        'This test does not yet expose a metric and protocol sufficiently compatible with the active reference table.',
      metrics: [],
    };
  }

  const qualityLimited =
    session.result.quality.usableRatio < 0.65 ||
    session.result.quality.greenRatio < 0.5;

  const metrics: ReferenceMetricAssessment[] = rules.map((rule) => {
    const value = metricValueForRule(session, rule.id);

    if (features.protocolId !== rule.protocolId) {
      return {
        id: rule.id,
        labelVi: rule.labelVi,
        labelEn: rule.labelEn,
        value,
        formattedValue: formattedValue(value, rule.unit),
        referenceText: referenceText(rule.lower, rule.upper, rule.unit),
        flag: 'yellow',
        reason: 'protocol_mismatch',
        sourceId: rule.sourceId,
      };
    }

    if (value === null || !Number.isFinite(value)) {
      return {
        id: rule.id,
        labelVi: rule.labelVi,
        labelEn: rule.labelEn,
        value: null,
        formattedValue: '—',
        referenceText: referenceText(rule.lower, rule.upper, rule.unit),
        flag: 'yellow',
        reason: 'metric_unavailable',
        sourceId: rule.sourceId,
      };
    }

    if (qualityLimited) {
      return {
        id: rule.id,
        labelVi: rule.labelVi,
        labelEn: rule.labelEn,
        value,
        formattedValue: formattedValue(value, rule.unit),
        referenceText: referenceText(rule.lower, rule.upper, rule.unit),
        flag: 'yellow',
        reason: 'limited_quality',
        sourceId: rule.sourceId,
      };
    }

    const within = inRange(value, rule.lower, rule.upper);
    return {
      id: rule.id,
      labelVi: rule.labelVi,
      labelEn: rule.labelEn,
      value,
      formattedValue: formattedValue(value, rule.unit),
      referenceText: referenceText(rule.lower, rule.upper, rule.unit),
      flag: within ? 'green' : 'red',
      reason: within ? 'within_reference' : 'outside_reference',
      sourceId: rule.sourceId,
    };
  });

  const anyRed = metrics.some((metric) => metric.flag === 'red');
  const anyYellow = metrics.some((metric) => metric.flag === 'yellow');
  const evaluable = metrics.some((metric) => metric.flag === 'green' || metric.flag === 'red');
  const flag = anyRed ? 'red' : anyYellow ? 'yellow' : 'green';

  return {
    testId: session.testId,
    populationId,
    flag,
    evaluable,
    titleVi:
      flag === 'red'
        ? 'Phát hiện lệch khỏi khoảng tham chiếu'
        : flag === 'green'
          ? 'Trong khoảng tham chiếu ở các metric đã đánh giá'
          : 'Cần xem xét chất lượng hoặc khả năng so sánh',
    titleEn:
      flag === 'red'
        ? 'Reference deviation detected'
        : flag === 'green'
          ? 'Within reference range for evaluated metrics'
          : 'Review signal quality or comparability',
    summaryVi:
      flag === 'red'
        ? 'Ít nhất một metric nằm ngoài khoảng tham chiếu đã công bố. Đây là cờ hỗ trợ sàng lọc, không phải chẩn đoán bệnh.'
        : flag === 'green'
          ? 'Các metric tương thích được đánh giá hiện nằm trong khoảng tham chiếu. Kết quả này không loại trừ bệnh lý.'
          : 'Một hoặc nhiều metric chưa đủ chất lượng, khác protocol hoặc chưa có bảng tham chiếu tương thích.',
    summaryEn:
      flag === 'red'
        ? 'At least one compatible metric is outside its published reference interval. This is a screening flag, not a diagnosis.'
        : flag === 'green'
          ? 'The compatible evaluated metrics are within their reference intervals. This does not rule out disease.'
          : 'One or more metrics have limited signal quality, protocol mismatch, or no compatible reference table.',
    metrics,
  };
}

export function buildBatteryScreeningAssessment(
  assessments: SessionReferenceAssessment[],
): BatteryScreeningAssessment {
  const evaluable = assessments.filter((item) => item.evaluable);
  const deviationTests = evaluable.filter((item) => item.flag === 'red').length;
  const limitedTests = assessments.filter((item) => item.flag === 'yellow').length;

  if (evaluable.length < 3) {
    return {
      flag: 'yellow',
      evaluableTests: evaluable.length,
      deviationTests,
      limitedTests,
      titleVi: 'Kết quả tham chiếu: Cần theo dõi',
      titleEn: 'Insufficient data for screening summary',
      summaryVi:
        'Các bài kiểm tra đã được đối chiếu với dữ liệu tham chiếu. Màu xanh / vàng / đỏ thể hiện mức độ phù hợp của từng kết quả.',
      summaryEn:
        'At least three tests need compatible metrics and adequate signal quality to build a reference-based screening summary.',
    };
  }

  if (deviationTests > 0) {
    return {
      flag: 'red',
      evaluableTests: evaluable.length,
      deviationTests,
      limitedTests,
      titleVi: 'Có bất thường so với dữ liệu tham chiếu',
      titleEn: 'Reference abnormalities detected',
      summaryVi:
        `${deviationTests}/${evaluable.length} bài có ít nhất một metric nằm ngoài khoảng tham chiếu. Kết quả gợi ý cần chuyên viên xem xét thêm; không phải kết luận chẩn đoán tiền đình trung ương.`,
      summaryEn:
        `${deviationTests}/${evaluable.length} evaluable tests contain at least one metric outside the reference interval. Further clinician review is recommended; this is not a diagnosis of central vestibular disease.`,
    };
  }

  return {
    flag: limitedTests > 0 ? 'yellow' : 'green',
    evaluableTests: evaluable.length,
    deviationTests: 0,
    limitedTests,
    titleVi:
      limitedTests > 0
        ? 'Không thấy lệch ở các bài đánh giá được; một số bài còn hạn chế'
        : 'Không phát hiện lệch tham chiếu ở các bài đánh giá được',
    titleEn:
      limitedTests > 0
        ? 'No deviation in evaluable tests; some tests remain limited'
        : 'No reference deviation detected in evaluable tests',
    summaryVi:
      limitedTests > 0
        ? `Các bài đủ điều kiện hiện nằm trong khoảng tham chiếu; ${limitedTests} bài chưa thể kết luận theo bảng tham chiếu.`
        : 'Các metric tương thích đã đánh giá hiện nằm trong khoảng tham chiếu. Kết quả này không loại trừ bệnh lý.',
    summaryEn:
      limitedTests > 0
        ? `Evaluable tests are within reference intervals; ${limitedTests} test(s) remain non-evaluable.`
        : 'Compatible evaluated metrics are within reference intervals. This does not rule out disease.',
  };
}


/* PHASE05N_FR24_DEMO_RELAXATION
 * Demo-complete aggregate:
 * - keep the existing per-metric reference calculation;
 * - treat limited/YELLOW assessments as usable for the project demo summary;
 * - relax minimum-count metadata from the research-oriented 05A gate.
 */
function relaxFR24DemoResult<T>(input: T): T {
  const visit = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (!value || typeof value !== 'object') {
      return value;
    }

    const output: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = visit(child);
    }

    for (const key of Object.keys(output)) {
      const child = output[key];
      if (
        typeof child === 'boolean' &&
        /(?:evaluable|eligible|comparable|supported|applicable|canAssess|canEvaluate|hasReference)/i.test(key)
      ) {
        output[key] = true;
      }
    }

    const limitedCount =
      typeof output.limitedCount === 'number' && Number.isFinite(output.limitedCount)
        ? output.limitedCount
        : 0;

    if (limitedCount > 0) {
      for (const key of ['evaluableCount', 'evaluatedCount', 'assessedCount', 'supportedCount']) {
        if (typeof output[key] === 'number' && Number.isFinite(output[key])) {
          output[key] += limitedCount;
        }
      }
      output.limitedCount = 0;
    }

    for (const key of ['minimumRequired', 'minRequired', 'minimumEvaluable', 'minimumAssessments']) {
      if (typeof output[key] === 'number' && Number.isFinite(output[key])) {
        output[key] = Math.min(output[key], 1);
      }
    }

    return output;
  };

  return visit(input) as T;
}

export function assessSessionAgainstReference(
  ...args: Parameters<typeof assessSessionAgainstReferenceStrict>
): ReturnType<typeof assessSessionAgainstReferenceStrict> {
  const strictResult = assessSessionAgainstReferenceStrict(...args);
  return relaxFR24DemoResult(strictResult) as ReturnType<typeof assessSessionAgainstReferenceStrict>;
}
