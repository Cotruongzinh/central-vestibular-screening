import type {
  SmoothPursuitMetricDraft,
  SmoothPursuitMetricResult,
} from '@/types/smooth-pursuit-metrics';

const smoothPursuitMetrics = new Map<string, SmoothPursuitMetricResult>();

function makeMetricId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `METRIC-${time}-${suffix}`;
}

export function saveSmoothPursuitMetrics(draft: SmoothPursuitMetricDraft) {
  const result: SmoothPursuitMetricResult = {
    ...draft,
    id: makeMetricId(),
  };

  smoothPursuitMetrics.set(result.id, result);
  return result;
}

export function getSmoothPursuitMetrics(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return smoothPursuitMetrics.get(id);
}

export function clearSmoothPursuitMetrics(id: string | undefined) {
  if (id) {
    smoothPursuitMetrics.delete(id);
  }
}
