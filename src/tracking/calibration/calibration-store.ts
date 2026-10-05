import type { CalibrationDataset } from '@/types/calibration';

type CalibrationDraft = Omit<CalibrationDataset, 'id'>;

const datasets = new Map<string, CalibrationDataset>();

function makeCalibrationId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CAL-${time}-${suffix}`;
}

export function saveCalibrationDataset(draft: CalibrationDraft) {
  const dataset: CalibrationDataset = {
    ...draft,
    id: makeCalibrationId(),
  };

  datasets.set(dataset.id, dataset);
  return dataset;
}

export function getCalibrationDataset(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return datasets.get(id);
}

export function clearCalibrationDataset(id: string | undefined) {
  if (id) {
    datasets.delete(id);
  }
}
