import type { AIFullBatteryFeatureVector } from '@/types/ai-integrated-result';
import type { PersistedTestSession } from '@/types/test-session';

export const FULL_BATTERY_AI_FEATURE_NAMES = [
  'sp_pursuit_gain',
  'sp_position_rmse',
  'sp_position_correlation',
  'sp_usable_ratio',
  'sp_green_ratio',
  'sp_median_tracking_fps',
  'sp_gain_error_abs',
  'sp_low_quality_ratio',
  'hs_median_latency_ms',
  'hs_median_peak_velocity',
  'hs_endpoint_accuracy_percent',
  'hs_amplitude_ratio',
  'hs_overshoot_percent',
  'hs_direction_correct_percent',
  'hs_usable_ratio',
  'hs_green_ratio',
  'vs_median_latency_ms',
  'vs_median_peak_velocity',
  'vs_endpoint_accuracy_percent',
  'vs_amplitude_ratio',
  'vs_overshoot_percent',
  'vs_direction_correct_percent',
  'vs_usable_ratio',
  'vs_green_ratio',
  'as_median_latency_ms',
  'as_median_peak_velocity',
  'as_endpoint_accuracy_percent',
  'as_amplitude_ratio',
  'as_overshoot_percent',
  'as_direction_correct_percent',
  'as_error_rate_percent',
  'as_usable_ratio',
  'gen_mean_abs_spv',
  'gen_max_abs_spv',
  'gen_quick_phase_candidates_per_min',
  'gen_mean_position_error',
  'gen_usable_ratio',
  'gen_green_ratio',
  'gen_median_tracking_fps',
  'gen_spv_spread',
  'okn_directional_asymmetry_percent',
  'okn_right_spv',
  'okn_left_spv',
  'okn_right_agreement_percent',
  'okn_left_agreement_percent',
  'okn_quick_phase_candidates_per_min',
  'okn_usable_ratio',
  'okn_green_ratio',
] as const;

type TestKey =
  | 'smooth-pursuit'
  | 'horizontal-saccades'
  | 'vertical-saccades'
  | 'anti-saccade'
  | 'gaze-evoked-nystagmus'
  | 'okn';

const REQUIRED_TESTS: readonly TestKey[] = [
  'smooth-pursuit',
  'horizontal-saccades',
  'vertical-saccades',
  'anti-saccade',
  'gaze-evoked-nystagmus',
  'okn',
];

function finiteFeature(session: PersistedTestSession, key: string): number | null {
  const value = session.result.aiFeatures?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function requireFeatures(
  session: PersistedTestSession,
  keys: readonly string[],
): number[] | null {
  const values = keys.map((key) => finiteFeature(session, key));
  return values.every((value): value is number => value !== null) ? values : null;
}

function sessionMap(sessions: readonly PersistedTestSession[]) {
  const map = new Map<string, PersistedTestSession>();
  for (const session of sessions) {
    map.set(session.testId, session);
  }
  return map;
}

export function buildFullBatteryAIFeatureVector(
  sessions: readonly PersistedTestSession[],
): AIFullBatteryFeatureVector | null {
  const byTest = sessionMap(sessions);
  if (!REQUIRED_TESTS.every((testId) => byTest.has(testId))) {
    return null;
  }

  const smooth = byTest.get('smooth-pursuit');
  const horizontal = byTest.get('horizontal-saccades');
  const vertical = byTest.get('vertical-saccades');
  const anti = byTest.get('anti-saccade');
  const gen = byTest.get('gaze-evoked-nystagmus');
  const okn = byTest.get('okn');

  if (!smooth || !horizontal || !vertical || !anti || !gen || !okn) {
    return null;
  }

  const smoothBase = requireFeatures(smooth, [
    'pursuitGain',
    'positionRmse',
    'positionCorrelation',
    'usableRatio',
    'greenRatio',
    'medianTrackingFps',
  ]);
  const horizontalBase = requireFeatures(horizontal, [
    'medianLatencyMs',
    'medianPeakVelocity',
    'endpointAccuracyPercent',
    'amplitudeRatio',
    'overshootPercent',
    'directionCorrectPercent',
    'usableRatio',
    'greenRatio',
  ]);
  const verticalBase = requireFeatures(vertical, [
    'medianLatencyMs',
    'medianPeakVelocity',
    'endpointAccuracyPercent',
    'amplitudeRatio',
    'overshootPercent',
    'directionCorrectPercent',
    'usableRatio',
    'greenRatio',
  ]);
  const antiBase = requireFeatures(anti, [
    'medianLatencyMs',
    'medianPeakVelocity',
    'endpointAccuracyPercent',
    'amplitudeRatio',
    'overshootPercent',
    'directionCorrectPercent',
    'antiSaccadeErrorRatePercent',
    'usableRatio',
  ]);
  const genBase = requireFeatures(gen, [
    'meanAbsoluteSlowPhaseVelocity',
    'maxAbsoluteSlowPhaseVelocity',
    'quickPhaseCandidateRatePerMinute',
    'meanPositionError',
    'usableRatio',
    'greenRatio',
    'medianTrackingFps',
  ]);
  const oknBase = requireFeatures(okn, [
    'directionalAsymmetryPercent',
    'rightSlowPhaseVelocity',
    'leftSlowPhaseVelocity',
    'rightAgreementPercent',
    'leftAgreementPercent',
    'quickPhaseCandidateRatePerMinute',
    'usableRatio',
    'greenRatio',
  ]);

  if (!smoothBase || !horizontalBase || !verticalBase || !antiBase || !genBase || !oknBase) {
    return null;
  }

  const pursuitGain = smoothBase[0] ?? 0;
  const smoothUsableRatio = smoothBase[3] ?? 0;
  const genMeanSpv = genBase[0] ?? 0;
  const genMaxSpv = genBase[1] ?? 0;

  const features = [
    ...smoothBase,
    Math.abs(1 - pursuitGain),
    1 - smoothUsableRatio,
    ...horizontalBase,
    ...verticalBase,
    ...antiBase,
    ...genBase,
    Math.max(0, genMaxSpv - genMeanSpv),
    ...oknBase,
  ];

  if (
    features.length !== FULL_BATTERY_AI_FEATURE_NAMES.length ||
    features.some((value) => !Number.isFinite(value))
  ) {
    return null;
  }

  return {
    schemaVersion: '08d-real-metric-full-battery-v1',
    features,
    testCount: 6,
  };
}
