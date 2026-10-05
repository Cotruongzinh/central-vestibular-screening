import type { EyeTraceResult } from '@/types/test-runtime';

type EyeTraceDraft = Omit<EyeTraceResult, 'id'>;

const eyeTraces = new Map<string, EyeTraceResult>();

function makeTraceId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `TRACE-${time}-${suffix}`;
}

export function saveEyeTrace(draft: EyeTraceDraft) {
  const trace: EyeTraceResult = {
    ...draft,
    id: makeTraceId(),
  };

  eyeTraces.set(trace.id, trace);
  return trace;
}

export function getEyeTrace(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return eyeTraces.get(id);
}

export function clearEyeTrace(id: string | undefined) {
  if (id) {
    eyeTraces.delete(id);
  }
}
