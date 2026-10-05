import type {
  SaccadeMetricDraft,
  SaccadeMetricResult,
} from '@/types/saccade-metrics';

const saccadeMetrics = new Map<string, SaccadeMetricResult>();

function makeMetricId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SAC-METRIC-${time}-${suffix}`;
}

export function saveSaccadeMetrics(draft: SaccadeMetricDraft) {
  const result: SaccadeMetricResult = {
    ...draft,
    id: makeMetricId(),
  };

  saccadeMetrics.set(result.id, result);
  return result;
}

export function getSaccadeMetrics(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return saccadeMetrics.get(id);
}

export function clearSaccadeMetrics(id: string | undefined) {
  if (id) {
    saccadeMetrics.delete(id);
  }
}
