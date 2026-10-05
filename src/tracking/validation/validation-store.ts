import type { FixationValidationResult } from '@/types/fixation-validation';

type ValidationDraft = Omit<FixationValidationResult, 'id'>;

const validations = new Map<string, FixationValidationResult>();

function makeValidationId() {
  const time = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `VAL-${time}-${suffix}`;
}

export function saveFixationValidation(draft: ValidationDraft) {
  const result: FixationValidationResult = {
    ...draft,
    id: makeValidationId(),
  };

  validations.set(result.id, result);
  return result;
}

export function getFixationValidation(id: string | undefined) {
  if (!id) {
    return undefined;
  }

  return validations.get(id);
}

export function clearFixationValidation(id: string | undefined) {
  if (id) {
    validations.delete(id);
  }
}
