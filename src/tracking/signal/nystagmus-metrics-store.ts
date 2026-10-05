import type {
  NystagmusMetricDraft,
  NystagmusMetricResult,
} from '@/types/nystagmus-metrics';

const nystagmusMetrics = new Map<string, NystagmusMetricResult>();

function makeMetricId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NYS-METRIC-${time}-${suffix}`;
}

export function saveNystagmusMetrics(draft: NystagmusMetricDraft) {
  const result: NystagmusMetricResult = {
    ...draft,
    id: makeMetricId(),
  };

  nystagmusMetrics.set(result.id, result);
  return result;
}

export function getNystagmusMetrics(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return nystagmusMetrics.get(id);
}

export function clearNystagmusMetrics(id: string | undefined) {
  if (id) {
    nystagmusMetrics.delete(id);
  }
}
