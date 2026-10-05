import type { NpcSummary, NpcTrial } from '@/types/npc';

export const NPC_REQUIRED_TRIALS = 3;

function finitePositive(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value) && value > 0);
}

export function median(values: number[]): number {
  const clean = finitePositive(values).sort((a, b) => a - b);
  if (!clean.length) return Number.NaN;
  const middle = Math.floor(clean.length / 2);
  if (clean.length % 2 === 1) return clean[middle];
  return (clean[middle - 1] + clean[middle]) / 2;
}

export function range(values: number[]): number {
  const clean = finitePositive(values);
  if (!clean.length) return Number.NaN;
  return Math.max(...clean) - Math.min(...clean);
}

export function parseNpcDistance(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) return null;
  return Math.round(numeric * 10) / 10;
}

export function buildNpcSummary(trials: NpcTrial[]): NpcSummary {
  const breakValues = trials.map((trial) => trial.breakDistanceCm);
  const recoveryValues = trials.map((trial) => trial.recoveryDistanceCm);
  return {
    trialCount: trials.length,
    medianBreakCm: median(breakValues),
    medianRecoveryCm: median(recoveryValues),
    breakRangeCm: range(breakValues),
    recoveryRangeCm: range(recoveryValues),
    trials,
    mode: 'clinician-assisted-expo-go',
  };
}
