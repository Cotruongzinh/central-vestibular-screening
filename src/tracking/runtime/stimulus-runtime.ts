import { FULL_BATTERY_TESTS } from '@/constants/clinical-tests';
import type { ClinicalTestId } from '@/types/test-administration';

export type StimulusKind =
  | 'smooth-pursuit'
  | 'horizontal-saccades'
  | 'vertical-saccades'
  | 'anti-saccade'
  | 'gaze-evoked'
  | 'okn'
  | 'unsupported';

export type StimulusFrame = {
  kind: StimulusKind;
  stimulusX: number | null;
  stimulusY: number | null;
  expectedX: number | null;
  expectedY: number | null;
  oknPhase: number;
  oknDirection: -1 | 0 | 1;
};

const DURATION_SECONDS = [60, 60, 60, 60, 30, 30] as const;

export function getStimulusKind(testId: ClinicalTestId): StimulusKind {
  const index = FULL_BATTERY_TESTS.findIndex((test) => test.id === testId);

  switch (index) {
    case 0:
      return 'smooth-pursuit';
    case 1:
      return 'horizontal-saccades';
    case 2:
      return 'vertical-saccades';
    case 3:
      return 'anti-saccade';
    case 4:
      return 'gaze-evoked';
    case 5:
      return 'okn';
    default:
      return 'unsupported';
  }
}

export function getStimulusDurationMs(testId: ClinicalTestId) {
  const index = FULL_BATTERY_TESTS.findIndex((test) => test.id === testId);

  if (index < 0 || index >= DURATION_SECONDS.length) {
    return 45_000;
  }

  return DURATION_SECONDS[index] * 1000;
}


const SACCADE_DURATIONS_MS = [1300, 1700, 1100, 1900, 1500] as const;
const H_SACCADE_POSITIONS = [0.2, 0.8, 0.35, 0.65, 0.2, 0.65, 0.35, 0.8] as const;
const V_SACCADE_POSITIONS = [0.24, 0.76, 0.36, 0.64, 0.24, 0.64, 0.36, 0.76] as const;
const ANTI_TRIAL_DURATIONS_MS = [2700, 3100, 2900, 3300, 2800] as const;
const ANTI_CUE_MS = 700;

function repeatingSegmentIndex(elapsedMs: number, durations: readonly number[]) {
  const cycleMs = durations.reduce((sum, value) => sum + value, 0);
  let local = elapsedMs % cycleMs;
  let offset = 0;

  for (let index = 0; index < durations.length; index += 1) {
    if (local < durations[index]) {
      return { index, offsetMs: offset, elapsedInSegmentMs: local };
    }
    local -= durations[index];
    offset += durations[index];
  }

  return { index: 0, offsetMs: 0, elapsedInSegmentMs: 0 };
}

function repeatingTrialOrdinal(elapsedMs: number, durations: readonly number[]) {
  const cycleMs = durations.reduce((sum, value) => sum + value, 0);
  const cycles = Math.floor(elapsedMs / cycleMs);
  const segment = repeatingSegmentIndex(elapsedMs, durations);
  return cycles * durations.length + segment.index;
}

export function getStimulusFrame(
  kind: StimulusKind,
  elapsedMs: number,
): StimulusFrame {
  const t = Math.max(0, elapsedMs);

  switch (kind) {
    case 'smooth-pursuit': {
      // FR-24 compatible protocol: horizontal sinusoidal pursuit at 0.1 Hz.
      const periodMs = 10_000;
      const phase = (t % periodMs) / periodMs;
      const x = 0.5 - 0.34 * Math.cos(phase * Math.PI * 2);

      return {
        kind,
        stimulusX: x,
        stimulusY: 0.5,
        expectedX: x,
        expectedY: 0.5,
        oknPhase: 0,
        oknDirection: 0,
      };
    }

    case 'horizontal-saccades': {
      const ordinal = repeatingTrialOrdinal(t, SACCADE_DURATIONS_MS);
      const x = H_SACCADE_POSITIONS[ordinal % H_SACCADE_POSITIONS.length];

      return {
        kind,
        stimulusX: x,
        stimulusY: 0.5,
        expectedX: x,
        expectedY: 0.5,
        oknPhase: 0,
        oknDirection: 0,
      };
    }

    case 'vertical-saccades': {
      const ordinal = repeatingTrialOrdinal(t, SACCADE_DURATIONS_MS);
      const y = V_SACCADE_POSITIONS[ordinal % V_SACCADE_POSITIONS.length];

      return {
        kind,
        stimulusX: 0.5,
        stimulusY: y,
        expectedX: 0.5,
        expectedY: y,
        oknPhase: 0,
        oknDirection: 0,
      };
    }

    case 'anti-saccade': {
      const segment = repeatingSegmentIndex(t, ANTI_TRIAL_DURATIONS_MS);
      const ordinal = repeatingTrialOrdinal(t, ANTI_TRIAL_DURATIONS_MS);
      const trialDuration = ANTI_TRIAL_DURATIONS_MS[segment.index];
      const fixationMs = trialDuration - ANTI_CUE_MS;
      const inCue = segment.elapsedInSegmentMs >= fixationMs;
      const cueRight = ordinal % 2 === 0;
      const cueX = cueRight ? 0.8 : 0.2;
      const expectedX = cueRight ? 0.2 : 0.8;

      return {
        kind,
        stimulusX: inCue ? cueX : 0.5,
        stimulusY: 0.5,
        expectedX: inCue ? expectedX : 0.5,
        expectedY: 0.5,
        oknPhase: 0,
        oknDirection: 0,
      };
    }

    case 'gaze-evoked': {
      const sequence = [
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.5 },
        { x: 0.2, y: 0.5 },
        { x: 0.5, y: 0.24 },
        { x: 0.5, y: 0.76 },
      ];
      const point = sequence[Math.floor(t / 5000) % sequence.length];

      return {
        kind,
        stimulusX: point.x,
        stimulusY: point.y,
        expectedX: point.x,
        expectedY: point.y,
        oknPhase: 0,
        oknDirection: 0,
      };
    }

    case 'okn': {
      const directionBlockMs = 5000;
      const direction: -1 | 1 =
        Math.floor(t / directionBlockMs) % 2 === 0 ? 1 : -1;
      const rawPhase = (t % 1800) / 1800;
      const phase = direction === 1 ? rawPhase : 1 - rawPhase;

      return {
        kind,
        stimulusX: null,
        stimulusY: null,
        expectedX: null,
        expectedY: null,
        oknPhase: phase,
        oknDirection: direction,
      };
    }

    default:
      return {
        kind: 'unsupported',
        stimulusX: null,
        stimulusY: null,
        expectedX: null,
        expectedY: null,
        oknPhase: 0,
        oknDirection: 0,
      };
  }
}
