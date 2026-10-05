import type { AppLanguage } from '@/types/app-language';

export type NormativeReferencePopulationId =
  | 'adult_western'
  | 'adult_east_asian'
  | 'adult_southeast_asian';

export type NormativeReferenceOption = {
  id: NormativeReferencePopulationId;
  label: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
};

export type NormativeReferenceSetting = {
  populationId: NormativeReferencePopulationId;
  source: 'default' | 'stored';
  thresholdsActive: boolean;
};

export const DEFAULT_NORMATIVE_REFERENCE_POPULATION: NormativeReferencePopulationId =
  'adult_western';

export const NORMATIVE_REFERENCE_OPTIONS: readonly NormativeReferenceOption[] = [
  {
    id: 'adult_western',
    label: {
      vi: 'Người trưởng thành · quần thể phương Tây',
      en: 'Adult Western population',
    },
    description: {
      vi: 'FR-24 dùng bảng tham chiếu người trưởng thành 18–45 tuổi cho các metric/protocol tương thích.',
      en: 'FR-24 uses an adult 18–45 reference table for compatible metrics and protocols.',
    },
  },
  {
    id: 'adult_east_asian',
    label: {
      vi: 'Người trưởng thành · Đông Á',
      en: 'Adult East Asian population',
    },
    description: {
      vi: 'Lưu như hồ sơ tham chiếu ưu tiên để tích hợp với bộ dữ liệu đã thẩm định ở giai đoạn sau.',
      en: 'Stored as the preferred reference profile for a validated dataset to be integrated in a later phase.',
    },
  },
  {
    id: 'adult_southeast_asian',
    label: {
      vi: 'Người trưởng thành · Đông Nam Á',
      en: 'Adult Southeast Asian population',
    },
    description: {
      vi: 'Lưu như hồ sơ tham chiếu ưu tiên để tích hợp với bộ dữ liệu đã thẩm định ở giai đoạn sau.',
      en: 'Stored as the preferred reference profile for a validated dataset to be integrated in a later phase.',
    },
  },
] as const;

export function isNormativeReferencePopulationId(
  value: string | null | undefined,
): value is NormativeReferencePopulationId {
  return NORMATIVE_REFERENCE_OPTIONS.some((option) => option.id === value);
}

export function getNormativeReferenceOption(
  id: NormativeReferencePopulationId,
): NormativeReferenceOption {
  return (
    NORMATIVE_REFERENCE_OPTIONS.find((option) => option.id === id) ??
    NORMATIVE_REFERENCE_OPTIONS[0]
  );
}
