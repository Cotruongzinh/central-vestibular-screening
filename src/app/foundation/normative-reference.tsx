import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/i18n/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppEmblem } from '@/components/ui/AppEmblem';
import { getAppCopy } from '@/i18n/app-copy';
import { useAppLanguage } from '@/hooks/use-app-language';
import { SESSION_HREF } from '@/navigation/foundation-routes';
import { getCurrentClinician } from '@/services/firebase/auth.service';
import {
  getNormativeReferenceSetting,
  setNormativeReferencePopulation,
} from '@/services/normative-reference.service';
import { styles } from '@/styles/screens/foundation/normative-reference.styles';
import {
  DEFAULT_NORMATIVE_REFERENCE_POPULATION,
  NORMATIVE_REFERENCE_OPTIONS,
  getNormativeReferenceOption,
  type NormativeReferencePopulationId,
} from '@/types/normative-reference';

export default function NormativeReferenceScreen() {
  const language = useAppLanguage();
  const copy = useMemo(() => getAppCopy(language).normativeReference, [language]);
  const [current, setCurrent] = useState<NormativeReferencePopulationId>(
    DEFAULT_NORMATIVE_REFERENCE_POPULATION,
  );
  const [selected, setSelected] = useState<NormativeReferencePopulationId>(
    DEFAULT_NORMATIVE_REFERENCE_POPULATION,
  );
  const [source, setSource] = useState<'default' | 'stored'>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const user = getCurrentClinician();
      if (!user?.emailVerified) {
        router.replace('/auth/login');
        return;
      }

      try {
        const setting = await getNormativeReferenceSetting();
        if (!active) return;
        setCurrent(setting.populationId);
        setSelected(setting.populationId);
        setSource(setting.source);
      } catch {
        if (active) setErrorMessage(copy.loadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [copy.loadError]);

  async function handleSave() {
    const user = getCurrentClinician();
    if (!user?.emailVerified) {
      router.replace('/auth/login');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      const saved = await setNormativeReferencePopulation(selected, user.uid);
      setCurrent(saved.populationId);
      setSelected(saved.populationId);
      setSource(saved.source);
      setMessage(copy.saved);
    } catch {
      setErrorMessage(copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const currentOption = getNormativeReferenceOption(current);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text style={styles.heroTitle}>{copy.title}</Text>
              <Text style={styles.heroBody}>{copy.subtitle}</Text>
            </View>
            <AppEmblem compact />
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{copy.status}</Text>
          </View>

          <Text style={styles.title}>{copy.heading}</Text>
          <Text style={styles.body}>{copy.body}</Text>

          <View style={styles.defaultCard}>
            <Text style={styles.defaultTitle}>{copy.defaultTitle}</Text>
            <Text style={styles.defaultBody}>{copy.defaultBody}</Text>
          </View>

          <Text style={styles.sectionTitle}>{copy.chooseLabel}</Text>

          <View style={styles.optionList}>
            {NORMATIVE_REFERENCE_OPTIONS.map((option) => {
              const active = selected === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => {
                    setSelected(option.id);
                    setMessage('');
                    setErrorMessage('');
                  }}
                >
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                      {option.label[language]}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description[language]}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>{copy.current}</Text>
            <Text style={styles.currentValue}>
              {loading ? '...' : currentOption.label[language]}
            </Text>
            <Text style={styles.currentMeta}>
              {source === 'default' ? copy.sourceDefault : copy.sourceStored}
            </Text>
          </View>

          <View style={styles.boundaryCard}>
            <Text style={styles.boundaryTitle}>{copy.boundaryTitle}</Text>
            <Text style={styles.boundaryBody}>{copy.boundaryBody}</Text>
          </View>

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.buttonGapLarge} />
          <AppButton
            label={saving ? copy.saving : copy.save}
            disabled={loading || saving || selected === current}
            onPress={() => void handleSave()}
          />
          <View style={styles.buttonGap} />
          <AppButton
            label={copy.back}
            variant="outline"
            onPress={() => router.replace(SESSION_HREF)}
          />

          <Text style={styles.footnote}>{copy.audit}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
