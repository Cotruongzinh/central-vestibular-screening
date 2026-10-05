import type { GazeMappingResult } from '@/types/gaze-mapping';

const mappings = new Map<string, GazeMappingResult>();

export function saveGazeMappingResult(result: GazeMappingResult) {
  mappings.set(result.id, result);
  return result;
}

export function getGazeMappingResult(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return mappings.get(id);
}

export function clearGazeMappingResult(id: string | undefined) {
  if (id) {
    mappings.delete(id);
  }
}
