import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/components/i18n/AppText';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAppLanguage } from '@/hooks/use-app-language';
import { getCoreFlowCopy } from '@/i18n/core-flow-copy';
import { patientFormStyles as styles } from '@/styles/components/patient-form.styles';
import type { PatientInput, PatientSex } from '@/types/patient';

type Props = {
  initialValue?: PatientInput;
  submitLabel: string;
  busy?: boolean;
  errorMessage?: string;
  onSubmit: (value: PatientInput) => void | Promise<void>;
  onCancel: () => void;
};

const EMPTY_PATIENT: PatientInput = {
  fullName: '',
  dateOfBirth: '',
  sex: 'unspecified',
  patientId: '',
  clinicalNotes: '',
};

export function PatientForm({
  initialValue = EMPTY_PATIENT,
  submitLabel,
  busy = false,
  errorMessage = '',
  onSubmit,
  onCancel,
}: Props) {
  const language = useAppLanguage();
  const copy = useMemo(() => getCoreFlowCopy(language).patientForm, [language]);
  const sexOptions = useMemo<Array<{ value: PatientSex; label: string }>>(
    () => [
      { value: 'female', label: copy.female },
      { value: 'male', label: copy.male },
      { value: 'other', label: copy.other },
      { value: 'unspecified', label: copy.unspecified },
    ],
    [copy],
  );

  const [fullName, setFullName] = useState(initialValue.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(initialValue.dateOfBirth);
  const [sex, setSex] = useState<PatientSex>(initialValue.sex);
  const [patientId, setPatientId] = useState(initialValue.patientId);
  const [clinicalNotes, setClinicalNotes] = useState(initialValue.clinicalNotes);

  const canSubmit = fullName.trim().length > 0 && !busy;

  function handleSubmit() {
    if (!canSubmit) return;
    void onSubmit({ fullName, dateOfBirth, sex, patientId, clinicalNotes });
  }

  return (
    <>
      <AppInput
        autoCapitalize="words"
        autoCorrect={false}
        label={copy.fullName}
        placeholder={copy.fullNamePlaceholder}
        value={fullName}
        onChangeText={setFullName}
      />

      <AppInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        label={copy.birthDate}
        placeholder="YYYY-MM-DD"
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
      />
      <Text style={styles.helper}>{copy.dateFormat}</Text>

      <Text style={styles.sexLabel}>{copy.sex}</Text>
      <View style={styles.sexRow}>
        {sexOptions.map((option) => {
          const selected = option.value === sex;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => setSex(option.value)}
              style={[styles.sexChip, selected && styles.sexChipSelected]}
            >
              <Text style={[styles.sexChipText, selected && styles.sexChipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AppInput
        autoCapitalize="characters"
        autoCorrect={false}
        label={copy.patientId}
        placeholder={copy.patientIdPlaceholder}
        value={patientId}
        onChangeText={setPatientId}
      />

      <AppInput
        label={copy.notes}
        multiline
        numberOfLines={4}
        placeholder={copy.notesPlaceholder}
        style={styles.notesInput}
        value={clinicalNotes}
        onChangeText={setClinicalNotes}
      />

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <AppButton label={busy ? copy.saving : submitLabel} disabled={!canSubmit} onPress={handleSubmit} />
      <View style={styles.buttonGap} />
      <AppButton label={copy.cancel} variant="outline" disabled={busy} onPress={onCancel} />
    </>
  );
}
